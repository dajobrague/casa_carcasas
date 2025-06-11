import { NextResponse } from 'next/server';
import Airtable from 'airtable';
import { cookies } from 'next/headers';

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

export async function POST(request: Request) {
  try {
    // Verificar autenticación de administrador usando cookies
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

    // Obtener datos de la solicitud
    const { semanaId, tiendaNumeros } = await request.json();
    
    if (!semanaId || !tiendaNumeros || !Array.isArray(tiendaNumeros) || tiendaNumeros.length === 0) {
      return NextResponse.json(
        { error: 'Datos de solicitud inválidos' },
        { status: 400 }
      );
    }

    // Limitar la cantidad de números de tienda por solicitud (Airtable tiene límites)
    const maxTiendas = 100;
    const tiendaNumerosLimited = tiendaNumeros.slice(0, maxTiendas);
    
    // Configurar Airtable
    const datosSemanalesTable = configureAirtable();
    
    // Primero obtener referencias a las tiendas (mapeo de números a IDs)
    const tiendaBaseId = process.env.AIRTABLE_BASE_ID as string;
    const tiendaTableId = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID as string;
    const tiendaTable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(tiendaBaseId).table(tiendaTableId);
    
    // Buscar tiendas existentes
    const tiendasQuery = await tiendaTable
      .select({
        filterByFormula: `OR(${tiendaNumerosLimited.map(num => `{N°} = "${num}"`).join(',')})`,
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
    
    // Construir la fórmula para obtener registros existentes
    const tiendaFilter = tiendaNumerosLimited.map(num => {
      const tiendaId = tiendaIdMap.get(String(num));
      if (tiendaId) {
        return `FIND("${tiendaId}", {Tienda y Supervisor}) > 0`;
      }
      return null;
    }).filter(Boolean).join(', ');
    
    // Consultar registros existentes
    const existingRecords: Record<string, any> = {};
    
    if (tiendaFilter) {
      const formula = `AND(FIND("${semanaId}", {Semanas Laborales}), OR(${tiendaFilter}))`;
      
      const records = await datosSemanalesTable
        .select({
          filterByFormula: formula,
          fields: ['Tienda y Supervisor', 'Semanas Laborales', 'Horas Aprobadas', 'Atencion Deseada', 'Crecimiento']
        })
        .all();
      
      // Procesar los registros encontrados
      for (const record of records) {
        const tiendaIdValue = record.get('Tienda y Supervisor');
        
        if (Array.isArray(tiendaIdValue) && tiendaIdValue.length > 0) {
          // Buscar el número de tienda correspondiente a este ID
          for (const [numero, id] of tiendaIdMap.entries()) {
            if (tiendaIdValue.includes(id)) {
              // Guardar los datos del registro existente
              existingRecords[numero] = {
                id: record.id,
                "N°": numero,
                "TIENDA": `Tienda ${numero}`, // Nombre genérico basado en número
                "Horas Aprobadas": record.get('Horas Aprobadas'),
                "Atencion Deseada": record.get('Atencion Deseada'),
                "Crecimiento": record.get('Crecimiento'),
                "Semanas Laborales": record.get('Semanas Laborales'),
              };
              break;
            }
          }
        }
      }
    }
    
    // Devolver los registros encontrados
    return NextResponse.json({
      success: true,
      existingRecords,
      checkedCount: tiendaNumerosLimited.length,
      foundCount: Object.keys(existingRecords).length
    });
    
  } catch (error: any) {
    console.error('Error al verificar registros:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 