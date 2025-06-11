import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import logger from '@/lib/logger';

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

export async function POST(request: NextRequest) {
  try {
    // Extraer números de tienda del cuerpo
    const { numeros } = await request.json();

    if (!numeros || !Array.isArray(numeros) || numeros.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Se requiere un array de números de tienda' 
      }, { status: 400 });
    }

    // Si hay más de 100 números, dividir en múltiples consultas
    const batchSize = 100;
    const existingRecords: Record<string, any> = {};

    // Procesar en lotes para no exceder límites de Airtable
    for (let i = 0; i < numeros.length; i += batchSize) {
      const batch = numeros.slice(i, i + batchSize);
      
      try {
        // Configurar Airtable
        const tiendasTable = configureAirtable();
        
        // Consultar registros por número de tienda
        const records = await tiendasTable
          .select({
            filterByFormula: `OR(${batch.map(num => `{N°} = "${num}"`).join(',')})`,
            fields: ['N°', 'TIENDA', 'Horas Aprobadas', 'Crecimiento', 'Atención Deseada']
          })
          .all();
        
        // Mapear resultados por número de tienda
        records.forEach(record => {
          const numero = record.get('N°') as string;
          if (numero) {
            existingRecords[numero] = {
              id: record.id,
              "N°": numero,
              "TIENDA": record.get('TIENDA') as string,
              "Horas Aprobadas": record.get('Horas Aprobadas'),
              "Crecimiento": record.get('Crecimiento'),
              "Atención Deseada": record.get('Atención Deseada')
            };
          }
        });
      } catch (error) {
        logger.error(`Error al consultar lote de tiendas en Airtable: ${error}`);
        throw error;
      }
    }

    return NextResponse.json({ 
      success: true, 
      records: existingRecords,
      totalFound: Object.keys(existingRecords).length
    });
  } catch (error) {
    logger.error(`Error en API check-tiendas: ${error}`);
    return NextResponse.json({ 
      success: false, 
      message: 'Error al verificar las tiendas', 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 