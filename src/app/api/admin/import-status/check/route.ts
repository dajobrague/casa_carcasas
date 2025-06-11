import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getImportStatus } from '../route';
import { cookies } from 'next/headers';

// Endpoint simple para verificar el estado de una importación
export async function GET(request: NextRequest) {
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
    
    // Obtener el ID de sesión de los parámetros de consulta
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Se requiere sessionId' },
        { status: 400 }
      );
    }
    
    // Obtener el estado actual
    const status = getImportStatus(sessionId);
    
    if (!status) {
      logger.warn(`No se encontró estado para la sesión: ${sessionId}`);
      
      // Devolver un objeto vacío pero válido si no existe la sesión
      return NextResponse.json({
        created: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        errors: [],
        message: "Esperando datos de importación...",
        isCompleted: false
      });
    }
    
    // Registrar la consulta
    logger.info(`Consulta de estado para sesión ${sessionId}: ${status.isCompleted ? 'completada' : 'en progreso'}`);
    
    // Devolver el estado actual
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error al verificar estado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 