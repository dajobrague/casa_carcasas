import { NextResponse } from 'next/server';
import { getStores } from '@/lib/lcdc/api';
import { syncStores } from '@/lib/lcdc/airtable';

// Marcar como dinámica explícitamente
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Obtener parámetros de la petición
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    // Obtener datos (con o sin caché)
    const data = await getStores({ 
      useCache: true, 
      forceRefresh 
    });
    
    // Determinar si los datos provienen del caché debido a un error
    const fromCache = data.fromCache || !forceRefresh;
    const apiError = data.apiError || null;
    
    // Sincronizar con Airtable si se solicita y no hay error de API
    const shouldSync = searchParams.get('sync') === 'true';
    let syncResult = null;
    
    if (shouldSync && !apiError) {
      try {
        syncResult = await syncStores(data);
      } catch (syncError) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Error al sincronizar con Airtable: ${(syncError as Error).message}`,
            fromCache,
            apiError,
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
      fromCache,
      apiError,
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