import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// Marcar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Obtener parámetros de la petición
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('tableId');
    
    if (!tableId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el parámetro tableId' },
        { status: 400 }
      );
    }
    
    // Configurar Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID || '');
    
    const table = base(tableId);
    
    // Obtener los primeros 10 registros para analizar la estructura
    const records = await table.select({
      maxRecords: 10
    }).all();
    
    // Analizar la estructura de la tabla
    const tableInfo = {
      tableId,
      recordCount: records.length,
      fields: {} as Record<string, any>,
      sampleRecords: records.map(record => ({
        id: record.id,
        fields: record.fields
      }))
    };
    
    // Extrae información de los campos basándose en los registros
    records.forEach(record => {
      Object.entries(record.fields).forEach(([fieldName, fieldValue]) => {
        if (!tableInfo.fields[fieldName]) {
          tableInfo.fields[fieldName] = {
            name: fieldName,
            type: typeof fieldValue,
            examples: [],
            possibleValues: new Set()
          };
        }
        
        // Añadir ejemplo si no hay muchos
        if (tableInfo.fields[fieldName].examples.length < 3 && 
            !tableInfo.fields[fieldName].examples.includes(fieldValue)) {
          tableInfo.fields[fieldName].examples.push(fieldValue);
        }
        
        // Para campos que parecen enumeraciones (strings cortas), guarda los valores posibles
        if (typeof fieldValue === 'string' && fieldValue.length < 50) {
          tableInfo.fields[fieldName].possibleValues.add(fieldValue);
        }
      });
    });
    
    // Convertir Set a Array para serialización JSON
    Object.values(tableInfo.fields).forEach((field: any) => {
      if (field.possibleValues instanceof Set) {
        field.possibleValues = Array.from(field.possibleValues);
      }
    });
    
    return NextResponse.json({ success: true, tableInfo });
  } catch (error) {
    console.error('Error al obtener información de la tabla:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 