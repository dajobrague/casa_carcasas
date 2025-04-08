import { NextResponse } from 'next/server';
import { getStores } from '@/lib/lcdc/api';
import { syncStores } from '@/lib/lcdc/airtable';

// Marcar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Obtener parámetros de la petición
    const { searchParams } = new URL(request.url);
    
    // Obtener datos siempre frescos, sin posibilidad de caché
    const data = await getStores({ 
      useCache: false, // No usar caché en ningún caso
      forceRefresh: true,
      fallbackToCache: false
    });
    
    // Determinar si los datos provienen del caché (siempre falso)
    const fromCache = false;
    const apiError = null;
    
    // Sincronizar con Airtable si se solicita
    const shouldSync = searchParams.get('sync') === 'true';
    let syncResult = null;
    
    if (shouldSync) {
      try {
        syncResult = await syncStores(data);
      } catch (syncError) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Error al sincronizar con Airtable: ${(syncError as Error).message}`,
            timestamp: new Date().toISOString(),
            data
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      syncResult,
      data 
    });
  } catch (error) {
    console.error('Error en API stores:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 