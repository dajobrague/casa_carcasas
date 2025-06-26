import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurar Airtable
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY!,
});

const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
const tiendaSupervisorTable = base(process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID!);

interface ConfiguracionPorDia {
  type: 'comparable_por_dia';
  mapping: Record<string, string>; // fecha objetivo -> fecha referencia
}

type ConfiguracionHistoricaItem = string[] | ConfiguracionPorDia;

interface BulkConfigRequest {
  tiendas: string[];
  semanaObjetivo: string;
  semanasReferencia?: string[];
  tipoConfiguracion: 'por_semanas' | 'por_dia';
  mappingPorDia?: Record<string, string>;
}

interface ConfiguracionHistorica {
  [semanaObjetivo: string]: ConfiguracionHistoricaItem;
}

// Parsear configuración histórica desde JSON
const parsearConfiguracion = (jsonString: string): ConfiguracionHistorica => {
  if (!jsonString || jsonString.trim() === '') {
    return {};
  }
  try {
    const config = JSON.parse(jsonString);
    return typeof config === 'object' && config !== null && !Array.isArray(config) ? config : {};
  } catch {
    return {};
  }
};

// Convertir configuración a JSON string
const configuracionAJSON = (config: ConfiguracionHistorica): string => {
  return JSON.stringify(config, null, 2);
};

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

export async function POST(request: NextRequest) {
  try {
    // Validar sesión de administrador
    if (!validateAdminSession(request)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body: BulkConfigRequest = await request.json();
    const { tiendas, semanaObjetivo, semanasReferencia, tipoConfiguracion, mappingPorDia } = body;

    // Validar entrada
    if (!tiendas || !Array.isArray(tiendas) || tiendas.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere una lista de tiendas válida' },
        { status: 400 }
      );
    }

    if (!semanaObjetivo || !semanaObjetivo.trim()) {
      return NextResponse.json(
        { error: 'Se requiere una semana objetivo válida' },
        { status: 400 }
      );
    }

    if (!tipoConfiguracion || !['por_semanas', 'por_dia'].includes(tipoConfiguracion)) {
      return NextResponse.json(
        { error: 'Se requiere un tipo de configuración válido' },
        { status: 400 }
      );
    }

    if (tipoConfiguracion === 'por_semanas') {
      if (!semanasReferencia || !Array.isArray(semanasReferencia) || semanasReferencia.length === 0) {
        return NextResponse.json(
          { error: 'Se requiere al menos una semana de referencia para configuración por semanas' },
          { status: 400 }
        );
      }
    }

    if (tipoConfiguracion === 'por_dia') {
      if (!mappingPorDia || typeof mappingPorDia !== 'object' || Object.keys(mappingPorDia).length === 0) {
        return NextResponse.json(
          { error: 'Se requiere mapping de días válido para configuración por día' },
          { status: 400 }
        );
      }
    }

    console.log(`🚀 Iniciando procesamiento masivo de ${tiendas.length} tiendas...`);
    const startTime = Date.now();

    // Función para procesar una tienda individual
    const procesarTienda = async (tiendaId: string) => {
      const tiendaStartTime = Date.now();
      try {
        // Obtener la tienda actual
        const tiendaRecord = await tiendaSupervisorTable.find(tiendaId);
        const findTime = Date.now() - tiendaStartTime;
        
        if (!tiendaRecord) {
          return { success: false, error: `Tienda ${tiendaId} no encontrada` };
        }

        // Obtener configuración actual
        const configActual = parsearConfiguracion(
          tiendaRecord.fields['Semanas Históricas'] as string || ''
        );

        // Crear nueva configuración (merge)
        let nuevaConfigItem: ConfiguracionHistoricaItem;
        
        if (tipoConfiguracion === 'por_semanas') {
          nuevaConfigItem = semanasReferencia!;
        } else {
          nuevaConfigItem = {
            type: 'comparable_por_dia',
            mapping: mappingPorDia!
          };
        }
        
        const configNueva: ConfiguracionHistorica = {
          ...configActual,
          [semanaObjetivo]: nuevaConfigItem
        };

        // Actualizar en Airtable
        const updateStartTime = Date.now();
        await tiendaSupervisorTable.update(tiendaId, {
          'Semanas Históricas': configuracionAJSON(configNueva)
        });
        const updateTime = Date.now() - updateStartTime;
        const totalTime = Date.now() - tiendaStartTime;

        if (totalTime > 2000) { // Log si toma más de 2 segundos
          console.log(`⚠️ Tienda ${tiendaId} tomó ${totalTime}ms (find: ${findTime}ms, update: ${updateTime}ms)`);
        }

        return { success: true, tiendaId, timing: { find: findTime, update: updateTime, total: totalTime } };

      } catch (error) {
        console.error(`Error procesando tienda ${tiendaId}:`, error);
        return { 
          success: false, 
          error: `Error en tienda ${tiendaId}: ${error instanceof Error ? error.message : 'Error desconocido'}` 
        };
      }
    };

    // Procesar todas las tiendas en paralelo con límite de concurrencia
    const BATCH_SIZE = 15; // Procesar máximo 15 tiendas simultáneamente (optimizado)
    const results = [];
    
    for (let i = 0; i < tiendas.length; i += BATCH_SIZE) {
      const batch = tiendas.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i/BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(tiendas.length/BATCH_SIZE);
      
      console.log(`📦 Procesando lote ${batchNumber}/${totalBatches} (${batch.length} tiendas) - ${((batchNumber/totalBatches)*100).toFixed(0)}%`);
      
      const batchStartTime = Date.now();
      const batchPromises = batch.map(procesarTienda);
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`✓ Lote ${batchNumber} completado en ${batchTime}ms`);
      
      // Pequeña pausa entre lotes para no sobrecargar Airtable (reducida)
      if (i + BATCH_SIZE < tiendas.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Contabilizar resultados
    const successCount = results.filter(r => r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error!);
    
    // Calcular estadísticas de timing
    const successResults = results.filter(r => r.success && r.timing);
    const avgFindTime = successResults.length > 0 ? 
      successResults.reduce((sum, r) => sum + (r.timing?.find || 0), 0) / successResults.length : 0;
    const avgUpdateTime = successResults.length > 0 ? 
      successResults.reduce((sum, r) => sum + (r.timing?.update || 0), 0) / successResults.length : 0;
    const maxTotalTime = successResults.length > 0 ? 
      Math.max(...successResults.map(r => r.timing?.total || 0)) : 0;
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`⏱️ Procesamiento completado en ${duration}ms (${(duration/1000).toFixed(2)}s)`);
    console.log(`✅ Éxitos: ${successCount}, ❌ Errores: ${errors.length}`);
    console.log(`📊 Timing promedio - Find: ${avgFindTime.toFixed(0)}ms, Update: ${avgUpdateTime.toFixed(0)}ms, Máximo total: ${maxTotalTime.toFixed(0)}ms`);

    // Preparar respuesta
    const response = {
      success: successCount,
      errors: errors,
      total: tiendas.length
    };

    console.log('✅ Configuración masiva aplicada:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en bulk-historical-config:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 