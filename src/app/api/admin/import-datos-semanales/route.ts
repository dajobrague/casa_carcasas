import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

// Marcar como dinámica explícitamente
export const dynamic = 'force-dynamic';

// Constantes para la configuración de Airtable
const ACTIVIDAD_SEMANAL_TABLE_ID = process.env.AIRTABLE_DATOS_SEMANALES_TABLE_ID || 'tblYNlCMYPXDMlPZk';

// Configurar Airtable
const configureAirtable = () => {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error('Faltan variables de entorno para Airtable');
  }

  Airtable.configure({ apiKey });
  return Airtable.base(baseId).table(ACTIVIDAD_SEMANAL_TABLE_ID);
};

// Función de utilidad para dormir (útil para streaming de eventos)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Sistema de eventos para streaming (Similar al del importador existente)
type ImportEvent = {
  message: string;
  progress?: number;
  total?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
  completed?: boolean;
};

const importEvents = new Map<string, ImportEvent[]>();
const importEventListeners = new Map<string, ((event: ImportEvent) => void)[]>();

const addImportEvent = (sessionId: string, event: ImportEvent) => {
  if (!importEvents.has(sessionId)) {
    importEvents.set(sessionId, []);
  }
  
  importEvents.get(sessionId)?.push(event);
  
  // Notificar a los listeners
  const listeners = importEventListeners.get(sessionId) || [];
  listeners.forEach(listener => listener(event));
};

export async function POST(request: Request) {
  try {
    // Verificar autenticación de administrador
    const cookieStore = cookies();
    const adminAuthCookie = cookieStore.get('adminAuth');
    
    if (!adminAuthCookie?.value) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    try {
      const adminAuthData = JSON.parse(adminAuthCookie.value);
      if (!adminAuthData || !adminAuthData.isLoggedIn) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'Sesión inválida' },
        { status: 401 }
      );
    }
    
    // Obtener datos del body
    const { semanaId, data, mapping } = await request.json();
    
    if (!semanaId || !data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Datos incompletos o inválidos' },
        { status: 400 }
      );
    }
    
    // Estadísticas para el seguimiento
    const stats = {
      total: data.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Obtener el campo que mapea a "N°" para identificar tiendas
    const numTiendaField = Object.keys(mapping).find(key => mapping[key] === "N°");
    
    if (!numTiendaField) {
      return NextResponse.json(
        { error: 'No se encontró el mapeo para el campo Número de Tienda' },
        { status: 400 }
      );
    }

    // Configurar Airtable
    const datosSemanalesTable = configureAirtable();
    
    // Primero obtener referencias a las tiendas (mapeo de números a IDs)
    const tiendaBaseId = process.env.AIRTABLE_BASE_ID as string;
    const tiendaTableId = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID as string;
    const tiendaTable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(tiendaBaseId).table(tiendaTableId);
    
    // Obtener números de tienda del CSV
    const tiendaNumeros = data.map(row => String(row[numTiendaField]).trim()).filter(Boolean);
    
    // Buscar tiendas existentes
    const tiendasQuery = await tiendaTable
      .select({
        filterByFormula: `OR(${tiendaNumeros.map(num => `{N°} = "${num}"`).join(',')})`,
        fields: ['N°']
      })
      .all();
    
    // Mapear números de tienda a sus IDs de registro
    const tiendaIdMap = new Map<string, string>();
    tiendasQuery.forEach(record => {
      const numero = record.get('N°');
      if (numero) {
        tiendaIdMap.set(String(numero), record.id);
      }
    });
    
    // Buscar registros existentes para esta combinación tienda-semana
    const existingRecordsMap = new Map<string, string>(); // numero tienda -> record id
    
    // Construir la fórmula para obtener registros existentes
    const tiendaFilter = tiendaNumeros.map(num => {
      const tiendaId = tiendaIdMap.get(num);
      if (tiendaId) {
        return `FIND("${tiendaId}", {Tienda y Supervisor}) > 0`;
      }
      return null;
    }).filter(Boolean).join(', ');
    
    if (tiendaFilter) {
      const formula = `AND(FIND("${semanaId}", {Semanas Laborales}), OR(${tiendaFilter}))`;
      
      try {
        const existingRecords = await datosSemanalesTable
          .select({
            filterByFormula: formula,
            fields: ['Tienda y Supervisor', 'Semanas Laborales'] // Solo necesitamos estos campos para identificar
          })
          .all();
        
        for (const record of existingRecords) {
          const tiendaIdValue = record.get('Tienda y Supervisor');
          if (Array.isArray(tiendaIdValue) && tiendaIdValue.length > 0) {
            // Buscar el número de tienda correspondiente a este ID
            for (const [numero, id] of tiendaIdMap.entries()) {
              if (tiendaIdValue.includes(id)) {
                existingRecordsMap.set(numero, record.id);
                break;
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Error al verificar registros existentes:', error);
        stats.errors.push(`Error al verificar registros existentes: ${error.message || 'Error desconocido'}`);
      }
    }
    
    // Procesar registros
    const recordsToCreate: Record<string, any>[] = [];
    const recordsToUpdate: Array<{ id: string, fields: Record<string, any> }> = [];
    
    // Preparar los datos para crear/actualizar (normalizar)
    for (const row of data) {
      try {
        const tiendaNum = String(row[numTiendaField]).trim();
        
        // Si no hay número de tienda, saltar
        if (!tiendaNum) {
          stats.skipped++;
          continue;
        }
        
        // Si no encontramos la tienda en Airtable, saltar
        const tiendaId = tiendaIdMap.get(tiendaNum);
        if (!tiendaId) {
          stats.errors.push(`No se encontró la tienda con número ${tiendaNum}`);
          stats.skipped++;
          continue;
        }
        
        // Preparar los campos para Airtable
        const horasField = Object.keys(mapping).find(key => mapping[key] === "Horas Aprobadas");
        const atencionField = Object.keys(mapping).find(key => mapping[key] === "Atencion Deseada");
        const crecimientoField = Object.keys(mapping).find(key => mapping[key] === "Crecimiento");
        
        // Preparar valores numéricos
        const horasValue = horasField && row[horasField] !== '' 
          ? parseFloat(String(row[horasField]).replace(',', '.')) 
          : undefined;
            
        const atencionValue = atencionField && row[atencionField] !== '' 
          ? parseFloat(String(row[atencionField]).replace(',', '.')) 
          : undefined;
        
        // Para el porcentaje, convertimos a decimal quitando el % si existe
        const crecimientoValue = crecimientoField && row[crecimientoField] !== '' 
          ? parseFloat(String(row[crecimientoField]).replace('%', '').replace(',', '.')) / 100
          : undefined;
        
        // Construir el objeto de campos
        const fields: Record<string, any> = {
          "Tienda y Supervisor": [tiendaId],
          "Semanas Laborales": [semanaId]
        };
        
        // Añadir solo los campos con valores definidos
        if (horasValue !== undefined) {
          fields["Horas Aprobadas"] = horasValue;
        }
        
        if (atencionValue !== undefined) {
          fields["Atencion Deseada"] = atencionValue;
        }
        
        if (crecimientoValue !== undefined) {
          fields["Crecimiento"] = crecimientoValue;
        }
        
        // Verificar si ya existe un registro para esta combinación tienda-semana
        const existingRecordId = existingRecordsMap.get(tiendaNum);
        
        if (existingRecordId) {
          // Actualizar el registro existente
          recordsToUpdate.push({
            id: existingRecordId,
            fields
          });
        } else {
          // Crear un nuevo registro
          recordsToCreate.push({ fields });
        }
      } catch (error: any) {
        console.error('Error al procesar registro:', error);
        const tiendaNum = row[numTiendaField] ? String(row[numTiendaField]) : 'desconocido';
        stats.errors.push(`Error al procesar tienda ${tiendaNum}: ${error.message || 'Error desconocido'}`);
        stats.skipped++;
      }
    }
    
    // Procesar en lotes (máximo 10 por petición para Airtable)
    const batchSize = 10;
    
    // Crear registros en lotes
    for (let i = 0; i < recordsToCreate.length; i += batchSize) {
      const batch = recordsToCreate.slice(i, i + batchSize);
      if (batch.length > 0) {
        try {
          const createdRecords = await datosSemanalesTable.create(batch);
          stats.created += createdRecords.length;
        } catch (error: any) {
          console.error('Error al crear registros:', error);
          stats.errors.push(`Error al crear lote de registros: ${error.message || 'Error desconocido'}`);
        }
      }
    }
    
    // Actualizar registros en lotes
    for (let i = 0; i < recordsToUpdate.length; i += batchSize) {
      const batch = recordsToUpdate.slice(i, i + batchSize);
      if (batch.length > 0) {
        try {
          const updatedRecords = await Promise.all(
            batch.map(record => datosSemanalesTable.update(record.id, record.fields))
          );
          stats.updated += updatedRecords.length;
        } catch (error: any) {
          console.error('Error al actualizar registros:', error);
          stats.errors.push(`Error al actualizar lote de registros: ${error.message || 'Error desconocido'}`);
        }
      }
    }
    
    // Devolver los resultados finales
    return NextResponse.json({
      success: true,
      message: 'Importación completada',
      results: {
        ...stats,
        isCompleted: true
      }
    });
    
  } catch (error: any) {
    console.error('Error al importar datos:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error interno del servidor',
        results: {
          total: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: [error.message || 'Error interno del servidor'],
          isCompleted: true
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint GET para consultar el progreso de la importación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Se requiere el ID de sesión' 
      }, { status: 400 });
    }
    
    // Verificar si esta solicitud es para SSE
    const sse = searchParams.get('sse') === 'true';
    
    if (sse) {
      // Server-Sent Events - Similar al importador existente
      const responseStream = new TransformStream();
      const writer = responseStream.writable.getWriter();
      
      // Función para enviar eventos al cliente
      const sendEvent = async (event: ImportEvent) => {
        await writer.write(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      
      // Registrar el listener para esta sesión
      if (!importEventListeners.has(sessionId)) {
        importEventListeners.set(sessionId, []);
      }
      
      importEventListeners.get(sessionId)?.push(sendEvent);
      
      // Enviar eventos existentes
      const events = importEvents.get(sessionId) || [];
      for (const event of events) {
        await sendEvent(event);
      }
      
      // Limpiar cuando se cierre la conexión
      request.signal.addEventListener('abort', () => {
        const listeners = importEventListeners.get(sessionId) || [];
        const index = listeners.indexOf(sendEvent);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      });
      
      return new Response(responseStream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      // Respuesta normal - devolver todos los eventos para esta sesión
      const events = importEvents.get(sessionId) || [];
      return NextResponse.json({ success: true, events });
    }
  } catch (error) {
    console.error('Error al consultar progreso:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error al consultar progreso', 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
} 