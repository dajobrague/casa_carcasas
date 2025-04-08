import { NextRequest, NextResponse } from 'next/server';
import { syncUserBatch, syncStoreBatch } from '@/lib/lcdc/airtable';

// Marcar como dinámica explícitamente
export const dynamic = 'force-dynamic';

// Tiempo de espera mayor para esta ruta específica
export const maxDuration = 300; // 5 minutos si lo soporta la plataforma

export async function POST(request: NextRequest) {
  try {
    // Extraer parámetros de la petición
    const { type, batchData } = await request.json();
    
    if (!type || (type !== 'users' && type !== 'stores')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tipo de sincronización inválido. Debe ser "users" o "stores"' 
      }, { status: 400 });
    }
    
    if (!batchData || !Array.isArray(batchData) || batchData.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se proporcionaron datos para sincronizar' 
      }, { status: 400 });
    }
    
    // Procesar el lote según el tipo
    let result;
    if (type === 'users') {
      result = await syncUserBatch(batchData);
    } else {
      result = await syncStoreBatch(batchData);
    }
    
    return NextResponse.json({
      success: true,
      type,
      updates: result.updates,
      creates: result.creates,
      errors: result.errors
    });
    
  } catch (error) {
    console.error('Error en sincronización por lotes:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 