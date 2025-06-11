import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurar Airtable
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY!,
});

const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
const tiendaSupervisorTable = base(process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID!);

// Función para validar sesión de administrador
function validateAdminSession(request: NextRequest): boolean {
  try {
    const adminAuth = request.cookies.get('adminAuth')?.value;
    if (!adminAuth) return false;
    
    const authData = JSON.parse(adminAuth);
    return authData.isLoggedIn === true;
  } catch {
    return false;
  }
}

// GET - Obtener todas las tiendas
export async function GET(request: NextRequest) {
  try {
    // Validar sesión de administrador
    if (!validateAdminSession(request)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('Debug - Historial Tiendas: Obteniendo todas las tiendas...');

    const tiendas: any[] = [];
    
    // Obtener todos los registros de la tabla
    await tiendaSupervisorTable
      .select({
        fields: ['N°', 'TIENDA', 'PAIS', 'Tienda Histórica?'],
        sort: [{ field: 'N°', direction: 'asc' }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          tiendas.push({
            id: record.id,
            numero: record.get('N°') || '',
            nombre: record.get('TIENDA') || '',
            pais: record.get('PAIS') || '',
            esHistorica: Boolean(record.get('Tienda Histórica?'))
          });
        });
        fetchNextPage();
      });

    console.log(`Debug - Historial Tiendas: Encontradas ${tiendas.length} tiendas`);

    return NextResponse.json({
      tiendas,
      total: tiendas.length
    });

  } catch (error) {
    console.error('Error obteniendo tiendas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener las tiendas' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar estado histórico de una tienda
export async function PUT(request: NextRequest) {
  try {
    // Validar sesión de administrador
    if (!validateAdminSession(request)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { tiendaId, esHistorica } = await request.json();

    if (!tiendaId) {
      return NextResponse.json(
        { error: 'ID de tienda es requerido' },
        { status: 400 }
      );
    }

    if (typeof esHistorica !== 'boolean') {
      return NextResponse.json(
        { error: 'El valor esHistorica debe ser un booleano' },
        { status: 400 }
      );
    }

    console.log(`Debug - Historial Tiendas: Actualizando tienda ${tiendaId} a esHistorica: ${esHistorica}`);

    // Actualizar el registro en Airtable
    const updatedRecord = await tiendaSupervisorTable.update(tiendaId, {
      'Tienda Histórica?': esHistorica
    });

    console.log(`Debug - Historial Tiendas: Tienda ${tiendaId} actualizada exitosamente`);

    return NextResponse.json({
      success: true,
      tienda: {
        id: updatedRecord.id,
        numero: updatedRecord.get('N°') || '',
        nombre: updatedRecord.get('TIENDA') || '',
        pais: updatedRecord.get('PAIS') || '',
        esHistorica: Boolean(updatedRecord.get('Tienda Histórica?'))
      }
    });

  } catch (error) {
    console.error('Error actualizando tienda:', error);
    
    // Manejo específico de errores de Airtable
    if (error instanceof Error) {
      if (error.message.includes('Record not found')) {
        return NextResponse.json(
          { error: 'Tienda no encontrada' },
          { status: 404 }
        );
      }
      if (error.message.includes('Invalid permissions')) {
        return NextResponse.json(
          { error: 'Permisos insuficientes para actualizar la tienda' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Error interno del servidor al actualizar la tienda' },
      { status: 500 }
    );
  }
} 