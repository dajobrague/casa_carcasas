import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import logger from '@/lib/logger';
import { addImportEvent } from '../import-status/route';
import { v4 as uuidv4 } from 'uuid';

// Marcar la ruta como dinámica para evitar caché
export const dynamic = 'force-dynamic';

// Configurar Airtable
const configureAirtable = () => {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableId = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID;

  if (!apiKey || !baseId || !tableId) {
    throw new Error('Faltan variables de entorno para Airtable');
  }

  Airtable.configure({ apiKey });
  return Airtable.base(baseId).table(tableId);
};

// Función para normalizar y validar los datos
const normalizeRecord = (record: Record<string, any>): Record<string, any> => {
  const normalized: Record<string, any> = {};
  
  // Procesar cada campo según su tipo esperado
  Object.entries(record).forEach(([key, value]) => {
    if (key === "N°") {
      // Convertir N° a número entero
      const numValue = parseInt(String(value).trim(), 10);
      if (isNaN(numValue)) {
        throw new Error(`El valor '${value}' no es un número válido para el campo N°`);
      }
      normalized[key] = numValue;
    } else if (key === "Horas Aprobadas" || key === "Atención Deseada") {
      // Convertir a número si existe
      if (value !== null && value !== undefined && value !== '') {
        const numValue = parseFloat(String(value).replace(',', '.').trim());
        normalized[key] = isNaN(numValue) ? null : numValue;
      }
    } else if (key === "Crecimiento") {
      // Convertir porcentaje a número decimal si existe
      if (value !== null && value !== undefined && value !== '') {
        // Eliminar el símbolo % si existe y convertir a número
        const strValue = String(value).replace('%', '').replace(',', '.').trim();
        const numValue = parseFloat(strValue);
        normalized[key] = isNaN(numValue) ? null : numValue;
      }
    } else {
      // Mantener el valor original para otros campos
      normalized[key] = value;
    }
  });
  
  return normalized;
};

// Función para hacer una pausa para permitir que los eventos se propaguen
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  // Generar ID de sesión para seguimiento de progreso
  const sessionId = uuidv4();
  
  try {
    // Extraer datos y mapeo del cuerpo
    const { records, mapping } = await request.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Se requiere un array de registros',
        sessionId
      }, { status: 400 });
    }

    // Inicializar estado de progreso
    addImportEvent(sessionId, {
      message: "Verificando registros existentes...",
      total: records.length
    });
    
    // Dar tiempo para que la conexión SSE se establezca
    await sleep(1000);

    // Verificar qué registros ya existen
    const numeroField = "N°";
    const tiendaNumeros = records.map(record => record[numeroField]).filter(Boolean);
    
    // Configurar Airtable
    const tiendasTable = configureAirtable();
    
    // Obtener todos los registros existentes con todos sus campos
    const existingRecordsResponse = await tiendasTable
      .select({
        filterByFormula: `OR(${tiendaNumeros.map(num => `{N°} = "${num}"`).join(',')})`,
        fields: ['N°', 'TIENDA', 'Horas Aprobadas', 'Crecimiento', 'Atención Deseada']
      })
      .all();
    
    // Mapear IDs y datos de registros existentes por número de tienda
    const existingRecordsMap = new Map();
    existingRecordsResponse.forEach(record => {
      const numero = record.get('N°');
      if (numero) {
        existingRecordsMap.set(String(numero), {
          id: record.id,
          fields: {
            "N°": record.get('N°'),
            "TIENDA": record.get('TIENDA'),
            "Horas Aprobadas": record.get('Horas Aprobadas'),
            "Crecimiento": record.get('Crecimiento'),
            "Atención Deseada": record.get('Atención Deseada')
          }
        });
      }
    });
    
    // Al inicio de la función POST, inicializar la variable de registros omitidos
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    // Actualizar progreso
    addImportEvent(sessionId, {
      message: "Normalizando registros...",
    });
    
    // Normalizar y validar todos los registros primero
    const normalizedRecords: Record<string, any>[] = [];
    for (const record of records) {
      try {
        if (!record[numeroField]) {
          errors.push(`Registro sin número de tienda: ${JSON.stringify(record)}`);
          continue;
        }
        
        normalizedRecords.push(normalizeRecord(record));
      } catch (error) {
        errors.push(`Error al normalizar registro: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Reducir el tamaño de lote para cumplir con las limitaciones de Airtable (máximo 10 por petición)
    const batchSize = 10;
    
    // Arrays para crear y actualizar
    const recordsToCreate: Partial<Record<string, any>>[] = [];
    const recordsToUpdate: { id: string; fields: Partial<Record<string, any>> }[] = [];
    
    // Actualizar progreso
    addImportEvent(sessionId, {
      message: "Clasificando registros...",
    });
    
    // Clasificar registros
    normalizedRecords.forEach(record => {
      const numero = record[numeroField];
      const existingRecord = existingRecordsMap.get(String(numero));
      
      if (existingRecord) {
        // Determinar si hay cambios reales comparando con los valores existentes
        const changedFields: Record<string, any> = {};
        let hasChanges = false;
        
        Object.entries(record).forEach(([key, value]) => {
          const existingValue = existingRecord.fields[key];
          
          // Comparamos con una tolerancia para números debido a posibles diferencias de precisión
          if (typeof value === 'number' && typeof existingValue === 'number') {
            if (Math.abs(value - existingValue) > 0.001) {
              changedFields[key] = value;
              hasChanges = true;
            }
          } else if (value !== existingValue) {
            changedFields[key] = value;
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          // Solo incluir el ID del registro en la actualización si hay cambios
          recordsToUpdate.push({
            id: existingRecord.id,
            fields: changedFields
          });
        } else {
          // No hay cambios, saltamos este registro
          skipped++;
        }
      } else {
        // Crear nuevo registro
        recordsToCreate.push({ fields: record });
      }
    });
    
    // Calcular número total de lotes para el seguimiento del progreso
    const totalCreateBatches = Math.ceil(recordsToCreate.length / batchSize);
    const totalUpdateBatches = Math.ceil(recordsToUpdate.length / batchSize);
    const totalBatches = totalCreateBatches + totalUpdateBatches;
    
    // Actualizar con información de inicio
    addImportEvent(sessionId, {
      message: `Comenzando importación. Registros a crear: ${recordsToCreate.length}, a actualizar: ${recordsToUpdate.length}, sin cambios: ${skipped}`,
      skipped,
      totalBatches,
      total: recordsToCreate.length + recordsToUpdate.length + skipped
    });
    
    // Dar tiempo para que el cliente reciba la actualización inicial
    await sleep(500);
    
    // Procesar creaciones en lotes
    for (let i = 0; i < recordsToCreate.length; i += batchSize) {
      const batch = recordsToCreate.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      
      if (batch.length > 0) {
        try {
          // Actualizar progreso antes de intentar
          addImportEvent(sessionId, {
            message: `Creando registros (lote ${currentBatch}/${totalCreateBatches})...`,
            currentBatch
          });
          
          // Pequeño retraso para asegurar que el cliente recibe la actualización
          await sleep(100);
          
          const createdRecords = await tiendasTable.create(batch);
          created += createdRecords.length;
          
          // Actualizar progreso después de crear exitosamente
          addImportEvent(sessionId, {
            created,
            message: `Creados ${createdRecords.length} registros (lote ${currentBatch}/${totalCreateBatches})`,
            currentBatch
          });
          
          logger.info(`Creados ${createdRecords.length} registros (lote ${currentBatch}/${totalCreateBatches})`);
          
          // Pequeño retraso para no saturar la API de Airtable
          await sleep(500);
        } catch (error) {
          logger.error(`Error al crear registros: ${error}`);
          const errorMsg = `Error al crear lote ${currentBatch}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          
          // Actualizar progreso con error
          addImportEvent(sessionId, {
            errors: [...errors],
            message: errorMsg,
            currentBatch
          });
          
          // Pausa más larga después de un error para no saturar la API
          await sleep(1000);
        }
      }
    }
    
    // Dar tiempo para que el cliente reciba todas las actualizaciones hasta este punto
    await sleep(500);
    
    // Procesar actualizaciones en lotes
    for (let i = 0; i < recordsToUpdate.length; i += batchSize) {
      const batch = recordsToUpdate.slice(i, i + batchSize);
      const currentBatch = totalCreateBatches + Math.floor(i / batchSize) + 1;
      
      if (batch.length > 0) {
        try {
          // Actualizar progreso antes de intentar
          addImportEvent(sessionId, {
            message: `Actualizando registros (lote ${Math.floor(i/batchSize) + 1}/${totalUpdateBatches})...`,
            currentBatch
          });
          
          // Pequeño retraso para asegurar que el cliente recibe la actualización
          await sleep(100);
          
          const updatedRecords = await tiendasTable.update(batch);
          updated += updatedRecords.length;
          
          // Actualizar progreso después de actualizar exitosamente
          addImportEvent(sessionId, {
            updated,
            message: `Actualizados ${updatedRecords.length} registros (lote ${Math.floor(i/batchSize) + 1}/${totalUpdateBatches})`,
            currentBatch
          });
          
          logger.info(`Actualizados ${updatedRecords.length} registros (lote ${Math.floor(i/batchSize) + 1}/${totalUpdateBatches})`);
          
          // Pequeño retraso para no saturar la API de Airtable
          await sleep(500);
        } catch (error) {
          logger.error(`Error al actualizar registros: ${error}`);
          const errorMsg = `Error al actualizar lote ${Math.floor(i/batchSize) + 1}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          
          // Actualizar progreso con error
          addImportEvent(sessionId, {
            errors: [...errors],
            message: errorMsg,
            currentBatch
          });
          
          // Pausa más larga después de un error para no saturar la API
          await sleep(1000);
        }
      }
    }
    
    // En el bucle donde procesamos los lotes, incrementar el contador de skipped
    if (skipped > 0) {
      console.log(`Omitiendo ${skipped} registros sin cambios`);
    }
    
    // Esperar un poco antes de marcar como completado para que el cliente tenga tiempo de recibir las actualizaciones anteriores
    await sleep(1000);
    
    // Marcar como completado
    addImportEvent(sessionId, {
      created,
      updated,
      skipped,
      errors,
      total: created + updated + skipped,
      currentBatch: totalBatches,
      totalBatches,
      message: "Importación completada",
      isCompleted: true
    });
    
    // Asegurar que el mensaje de completado tenga tiempo de propagarse
    await sleep(2000);
    
    // Retornar resultados
    return NextResponse.json({ 
      success: true, 
      created,
      updated,
      skipped,
      errors,
      total: created + updated,
      sessionId  // Incluir el sessionId para que el cliente pueda seguir el progreso
    });
  } catch (error) {
    // Marcar como completado con error
    addImportEvent(sessionId, {
      message: `Error en la importación: ${error instanceof Error ? error.message : String(error)}`,
      errors: [error instanceof Error ? error.message : String(error)],
      isCompleted: true
    });
    
    // Asegurar que el mensaje de error tenga tiempo de propagarse
    await sleep(2000);
    
    logger.error(`Error en API import-tiendas: ${error}`);
    return NextResponse.json({ 
      success: false, 
      message: 'Error al importar las tiendas', 
      error: error instanceof Error ? error.message : String(error),
      sessionId
    }, { status: 500 });
  }
} 