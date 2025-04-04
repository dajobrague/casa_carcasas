import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Marcar como dinámica explícitamente
export const dynamic = 'force-dynamic';

// Configurar Airtable
const BASE_ID = process.env.AIRTABLE_BASE_ID as string;
const API_KEY = process.env.AIRTABLE_API_KEY as string;
const TIENDA_TABLE_ID = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID as string;

// Inicializar Airtable
const airtable = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

/**
 * Lista de campos que son de tipo "single select" en Airtable
 * Estos campos deben ser tratados como un string directo al actualizar
 */
const SINGLE_SELECT_FIELDS = ['PAIS'];

/**
 * Endpoint para obtener datos de la tienda por su ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const recordId = params.recordId;
  console.log(`API - GET /api/tienda/${recordId} - Obteniendo datos de tienda`);
  
  if (!recordId) {
    return NextResponse.json(
      { error: 'Se requiere el ID de la tienda' },
      { status: 400 }
    );
  }
  
  try {
    // Verificar conexión con Airtable
    if (!BASE_ID || !API_KEY || !TIENDA_TABLE_ID) {
      console.error('Error de configuración: Faltan variables de entorno de Airtable');
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }
    
    // Obtener registro de Airtable
    const record = await airtable(TIENDA_TABLE_ID).find(recordId);
    
    console.log(`API - Datos de tienda obtenidos para ${recordId}`);
    
    return NextResponse.json({
      id: record.id,
      fields: record.fields
    });
  } catch (error) {
    console.error('Error al obtener datos de tienda:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json(
      { error: `Error al obtener datos de tienda: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * Endpoint para actualizar datos de la tienda por su ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const recordId = params.recordId;
  console.log(`API - PATCH /api/tienda/${recordId} - Actualizando datos de tienda`);
  
  if (!recordId) {
    return NextResponse.json(
      { error: 'Se requiere el ID de la tienda' },
      { status: 400 }
    );
  }
  
  try {
    // Verificar conexión con Airtable
    if (!BASE_ID || !API_KEY || !TIENDA_TABLE_ID) {
      console.error('Error de configuración: Faltan variables de entorno de Airtable');
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }
    
    // Obtener datos del cuerpo de la solicitud
    const data = await request.json();
    
    // Validar que el cuerpo tiene la estructura correcta
    if (!data || !data.fields) {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe contener el objeto fields' },
        { status: 400 }
      );
    }
    
    // Verificar y normalizar campos de tipo single select
    // Airtable espera un valor directo para estos campos, no un objeto
    for (const field of SINGLE_SELECT_FIELDS) {
      if (data.fields[field] !== undefined) {
        // Si se envía como un objeto con "name", extraer solo el valor
        if (typeof data.fields[field] === 'object' && data.fields[field]?.name) {
          data.fields[field] = data.fields[field].name;
        }
        
        // Validar que ahora es un string
        if (typeof data.fields[field] !== 'string') {
          return NextResponse.json(
            { 
              error: `El campo ${field} debe ser un string válido para el campo single select` 
            },
            { status: 400 }
          );
        }
      }
    }
    
    console.log('API - Actualizando tienda con datos:', data.fields);
    
    // Actualizar registro en Airtable
    const updatedRecord = await airtable(TIENDA_TABLE_ID).update(recordId, data.fields);
    
    console.log(`API - Tienda actualizada: ${recordId}`);
    
    return NextResponse.json({
      id: updatedRecord.id,
      fields: updatedRecord.fields
    });
  } catch (error) {
    console.error('Error al actualizar tienda:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json(
      { error: `Error al actualizar datos de tienda: ${errorMessage}` },
      { status: 500 }
    );
  }
} 