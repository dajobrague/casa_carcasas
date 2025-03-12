import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { 
  apiKey, 
  baseId, 
  actividadDiariaTableId, 
  diasLaboralesTableId,
  semanasLaboralesTableId,
  tiendaSupervisorTableId
} from '@/lib/airtable';

// Función para verificar la conexión a Airtable
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${actividadDiariaTableId}?maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: 'Error de conexión a Airtable', details: text },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Conexión exitosa a Airtable' });
  } catch (error) {
    console.error('Error de conexión a Airtable:', error);
    return NextResponse.json(
      { error: 'Error de conexión a Airtable', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// Función para actualizar un horario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { actividadId, tiempo, valor } = body;

    // Validar parámetros
    if (!actividadId || !tiempo) {
      return NextResponse.json(
        { error: 'Parámetros incompletos' },
        { status: 400 }
      );
    }

    // Actualizar en Airtable
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${actividadDiariaTableId}/${actividadId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            [tiempo]: valor || null
          }
        })
      }
    );

    if (!response.ok) {
      const responseData = await response.text();
      return NextResponse.json(
        { error: `Error de Airtable: ${response.status}`, details: responseData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    return NextResponse.json(
      { error: 'Error al actualizar horario', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
} 