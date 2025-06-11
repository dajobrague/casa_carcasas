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

// GET - Obtener todas las tiendas con sus semanas históricas
export async function GET(request: NextRequest) {
  try {
    // Validar sesión de administrador
    if (!validateAdminSession(request)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('Debug - Semanas Históricas: Obteniendo todas las tiendas...');

    const tiendas: any[] = [];
    
    // Obtener todos los registros de la tabla
    await tiendaSupervisorTable
      .select({
        fields: ['N°', 'TIENDA', 'PAIS', 'Semanas Históricas'],
        sort: [{ field: 'N°', direction: 'asc' }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          const numero = record.get('N°');
          const nombre = record.get('TIENDA');
          
          // Solo incluir tiendas que tengan número y nombre válidos
          if (numero && nombre) {
            tiendas.push({
              id: record.id,
              numero: Number(numero),
              nombre: String(nombre),
              pais: String(record.get('PAIS') || ''),
              semanasHistoricas: String(record.get('Semanas Históricas') || '')
            });
          }
        });
        fetchNextPage();
      });

    console.log(`Debug - Semanas Históricas: Encontradas ${tiendas.length} tiendas válidas`);

    return NextResponse.json({
      tiendas,
      total: tiendas.length
    });

  } catch (error) {
    console.error('Error obteniendo tiendas para semanas históricas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener las tiendas' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar semanas históricas de una tienda
export async function PUT(request: NextRequest) {
  try {
    // Validar sesión de administrador
    if (!validateAdminSession(request)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { tiendaId, semanasHistoricas } = await request.json();

    if (!tiendaId) {
      return NextResponse.json(
        { error: 'ID de tienda es requerido' },
        { status: 400 }
      );
    }

    if (typeof semanasHistoricas !== 'string') {
      return NextResponse.json(
        { error: 'Las semanas históricas deben ser un string' },
        { status: 400 }
      );
    }

    console.log(`Debug - Semanas Históricas: Actualizando tienda ${tiendaId} con semanas: ${semanasHistoricas}`);

    // Actualizar el registro en Airtable
    const updatedRecord = await tiendaSupervisorTable.update(tiendaId, {
      'Semanas Históricas': semanasHistoricas
    });

    console.log(`Debug - Semanas Históricas: Tienda ${tiendaId} actualizada exitosamente`);

    return NextResponse.json({
      success: true,
      tienda: {
        id: updatedRecord.id,
        numero: Number(updatedRecord.get('N°') || 0),
        nombre: String(updatedRecord.get('TIENDA') || ''),
        semanasHistoricas: String(updatedRecord.get('Semanas Históricas') || '')
      }
    });

  } catch (error) {
    console.error('Error actualizando semanas históricas:', error);
    
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
      { error: 'Error interno del servidor al actualizar las semanas históricas' },
      { status: 500 }
    );
  }
} 