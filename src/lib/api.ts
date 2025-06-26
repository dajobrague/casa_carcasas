import { DatosTraficoDia } from './utils';
import logger from './logger';
import { obtenerSemanasHistoricas } from './airtable';
import { 
  obtenerTraficoHistorico, 
  obtenerTraficoNoHistorico,
  obtenerDiaSemana,
  TraficoHistoricoAggregado
} from './historical-traffic';

/**
 * Función para obtener datos de tráfico para un día específico
 * Usa el API route seguro para realizar todas las peticiones
 */
export async function obtenerDatosTrafico(diaLaboralId: string, storeRecordId: string): Promise<DatosTraficoDia | null> {
  try {
    // 1. Obtener información del día laboral
    const diaLaboral = await obtenerDiaLaboral(diaLaboralId);
    if (!diaLaboral) {
      throw new Error('No se pudo obtener información del día laboral');
    }
    
    // 2. Obtener fechas de lunes y domingo
    if (!diaLaboral.fields['Fecha Lunes Anterior'] || !diaLaboral.fields['Fecha Domingo Anterior']) {
      throw new Error('Campos de fechas no encontrados en el día laboral');
    }
    
    const fechaLunes = new Date(diaLaboral.fields['Fecha Lunes Anterior']);
    const fechaDomingo = new Date(diaLaboral.fields['Fecha Domingo Anterior']);
    
    // 3. Obtener código de tienda
    const tiendaData = await obtenerDatosTienda(storeRecordId);
    const storeCode = tiendaData["Tienda Numero"];
    
    // Debug solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('🏪 Tienda:', { storeRecordId, storeCode });
    }
    
    if (!storeCode) {
      throw new Error('Código de tienda no encontrado');
    }
    
    // 4. Crear array de fechas entre lunes y domingo
    const dates = [];
    const currentDate = new Date(fechaLunes);
    while (currentDate <= fechaDomingo) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 5. Optimización: crear un mapa para seguimiento de peticiones paralelas
    // y reutilizar promesas para fechas idénticas
    const fetchPromises = new Map();
    
    // 5.1 Obtener datos para cada fecha a través de nuestro API route (con control de concurrencia)
    const allData = await Promise.all(dates.map(async (date) => {
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // Reutilizar la misma promesa si ya estamos obteniendo datos para esta fecha
      if (!fetchPromises.has(formattedDate)) {
        // Parámetros correctos según la definición de la API
        const apiUrl = `/api/trafico?tiendaId=${storeCode}&fechaInicio=${formattedDate}&fechaFin=${formattedDate}`;
        
        const fetchPromise = fetch(apiUrl, {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'max-age=300' // 5 minutos de caché HTTP
            }
          }
        ).then(async response => {
          if (!response.ok) {
            throw new Error(`API_ERROR_${response.status}`);
          }
          const data = await response.json();
          return data;
        }).catch(error => {
          // Simplificar errores de fetch
          if (error instanceof Error) {
            throw new Error(error.message.substring(0, 30));
          }
          throw new Error('FETCH_ERROR');
        });
        
        fetchPromises.set(formattedDate, fetchPromise);
      }
      
      // Obtener la promesa del mapa (sea nueva o reutilizada)
      const data = await fetchPromises.get(formattedDate);
      
      return {
        date: formattedDate,
        dayOfWeek: date.getDay(),
        data: data.entradasPorHora
      };
    }));
    
    // 6. Procesar los datos obtenidos
    
    const result = procesarDatosTrafico(allData, fechaLunes.toISOString().split('T')[0], fechaDomingo.toISOString().split('T')[0]);
    
    return result;
    
      } catch (error) {
      // Log simplificado sin detalles largos
      console.warn('⚠️ Error obteniendo tráfico:', error instanceof Error ? error.message.substring(0, 50) : 'Error desconocido');
      return null;
    }
}

/**
 * Función para obtener información del día laboral
 */
async function obtenerDiaLaboral(diaLaboralId: string) {
  try {
    const response = await fetch(`/api/airtable?action=obtenerDiaLaboralPorId&diaId=${diaLaboralId}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener día laboral: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn('⚠️ Error día laboral:', error instanceof Error ? error.message.substring(0, 30) : 'Error');
    return null;
  }
}

/**
 * Función para obtener datos de la tienda
 */
async function obtenerDatosTienda(recordId: string) {
  try {
    const response = await fetch(`/api/airtable?action=obtenerDatosTienda&storeId=${recordId}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener datos de tienda: ${response.status}`);
    }
    
    const data = await response.json();
    return data.fields || {};
  } catch (error) {
    console.warn('⚠️ Error datos tienda:', error instanceof Error ? error.message.substring(0, 30) : 'Error');
    return {};
  }
}

/**
 * Función para procesar los datos de tráfico
 * Versión optimizada usando Map para mejorar rendimiento
 * Ahora soporta entradas, tickets y euros
 */
function procesarDatosTrafico(datosAPI: any[], fechaInicio: string, fechaFin: string): DatosTraficoDia {
  try {
    if (!Array.isArray(datosAPI) || datosAPI.length === 0) {
      throw new Error('Datos de API inválidos');
    }
    
    // Franjas horarias (de 10:00 a 21:00)
    const timeSlots = Array.from({ length: 12 }, (_, i) => {
      const hour = i + 10; // Empezar desde las 10:00
      return `${hour.toString().padStart(2, '0')}:00`;
    });
    
    // Inicializar estructura de datos usando Maps para mejor rendimiento
    const diaSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const datosDiasMap = new Map<string, Map<string, { entradas: number; tickets: number; euros: number }>>();
    
    // Inicializar maps para cada día con horas en 0
    diaSemana.forEach(dia => {
      const horasMap = new Map<string, { entradas: number; tickets: number; euros: number }>();
      timeSlots.forEach(hora => horasMap.set(hora, { entradas: 0, tickets: 0, euros: 0 }));
      datosDiasMap.set(dia, horasMap);
    });
    
    // Mapeo de índice de día a nombre
    const mapaDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    
    // Contadores para totales
    let totalMañana = { entradas: 0, tickets: 0, euros: 0 };
    let totalTarde = { entradas: 0, tickets: 0, euros: 0 };
    
    // Map para acumular el total por hora (para calcular promedios)
    const totalHorasMap = new Map<string, { entradas: number; tickets: number; euros: number }>();
    timeSlots.forEach(hora => totalHorasMap.set(hora, { entradas: 0, tickets: 0, euros: 0 }));
    
    // Procesar datos más eficientemente
    for (const dayData of datosAPI) {
      // Obtener el nombre del día
      const nombreDia = mapaDias[dayData.dayOfWeek];
      const horasDelDia = datosDiasMap.get(nombreDia);
      
      // Verificar que tenemos el mapa del día
      if (!horasDelDia) continue;
      
      // Los datos ahora están en formato {hora: {entradas, tickets, euros}}
      if (dayData.data && typeof dayData.data === 'object') {
        for (const [hora, datos] of Object.entries(dayData.data)) {
          // Verificar que la hora está en el formato correcto y dentro de nuestro rango
          if (timeSlots.includes(hora)) {
            // Manejar tanto el formato nuevo como el formato legacy
            let datosFormateados: { entradas: number; tickets: number; euros: number };
            
            if (typeof datos === 'number') {
              // Formato legacy: solo entradas
              datosFormateados = { entradas: datos, tickets: 0, euros: 0 };
                         } else if (typeof datos === 'object' && datos !== null) {
               // Formato nuevo: objeto con entradas, tickets, euros
               const datosObj = datos as any;
               datosFormateados = {
                 entradas: Number(datosObj.entradas || 0),
                 tickets: Number(datosObj.tickets || 0),
                 euros: Number(datosObj.euros || 0)
               };
            } else {
              continue;
            }
            
            // Guardar dato en el map del día
            horasDelDia.set(hora, datosFormateados);
            
            // Actualizar total de esa hora para calcular promedio después
            const totalActual = totalHorasMap.get(hora) || { entradas: 0, tickets: 0, euros: 0 };
            totalHorasMap.set(hora, {
              entradas: totalActual.entradas + datosFormateados.entradas,
              tickets: totalActual.tickets + datosFormateados.tickets,
              euros: totalActual.euros + datosFormateados.euros
            });
            
            // Actualizar totales según mañana/tarde
            const hourNum = parseInt(hora.split(':')[0]);
            if (hourNum < 14) {
              totalMañana.entradas += datosFormateados.entradas;
              totalMañana.tickets += datosFormateados.tickets;
              totalMañana.euros += datosFormateados.euros;
            } else {
              totalTarde.entradas += datosFormateados.entradas;
              totalTarde.tickets += datosFormateados.tickets;
              totalTarde.euros += datosFormateados.euros;
            }
          }
        }
      }
    }
    
    // Calcular totales por día
    const totalMañanaPorDia = {
      entradas: Math.round(totalMañana.entradas / 7),
      tickets: Math.round(totalMañana.tickets / 7),
      euros: Math.round(totalMañana.euros / 7)
    };
    const totalTardePorDia = {
      entradas: Math.round(totalTarde.entradas / 7),
      tickets: Math.round(totalTarde.tickets / 7),
      euros: Math.round(totalTarde.euros / 7)
    };
    
    // Convertir Maps a objetos para la interfaz esperada
    // Definir con la estructura específica requerida por DatosTraficoDia
    const datosPorDia: {
      lunes: Record<string, { entradas: number; tickets: number; euros: number }>;
      martes: Record<string, { entradas: number; tickets: number; euros: number }>;
      miercoles: Record<string, { entradas: number; tickets: number; euros: number }>;
      jueves: Record<string, { entradas: number; tickets: number; euros: number }>;
      viernes: Record<string, { entradas: number; tickets: number; euros: number }>;
      sabado: Record<string, { entradas: number; tickets: number; euros: number }>;
      domingo: Record<string, { entradas: number; tickets: number; euros: number }>;
    } = {
      lunes: {},
      martes: {},
      miercoles: {},
      jueves: {},
      viernes: {},
      sabado: {},
      domingo: {}
    };
    
    // Llenar el objeto con los datos de los Maps
    for (const [dia, horasMap] of datosDiasMap.entries()) {
      datosPorDia[dia as keyof typeof datosPorDia] = Object.fromEntries(horasMap);
    }
    
    // Crear estructura de horas para compatibilidad con la interfaz existente
    const horas: Record<string, { entradas: number; tickets: number; euros: number }> = {};
    for (const [hora, total] of totalHorasMap.entries()) {
      horas[hora] = {
        entradas: Math.round(total.entradas / 7),
        tickets: Math.round(total.tickets / 7),
        euros: Math.round(total.euros / 7)
      };
    }
    
    const resultado = {
      horas,
      totalMañana: totalMañanaPorDia,
      totalTarde: totalTardePorDia,
      datosPorDia,
      fechaInicio,
      fechaFin
    };
    
    // Debug solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Tráfico procesado:', {
        horas: Object.keys(horas).length,
        totalMañana: totalMañana.entradas,
        totalTarde: totalTarde.entradas
      });
    }
    
    return resultado;
  } catch (error) {
    logger.error('Error procesando datos de tráfico:', error);
    return {
      horas: {},
      totalMañana: { entradas: 0, tickets: 0, euros: 0 },
      totalTarde: { entradas: 0, tickets: 0, euros: 0 },
      datosPorDia: {
        lunes: {},
        martes: {},
        miercoles: {},
        jueves: {},
        viernes: {},
        sabado: {},
        domingo: {}
      },
      fechaInicio,
      fechaFin
    };
  }
}

/**
 * Función addon para obtener datos de tráfico con lógica histórica
 * @param diaLaboralId - ID del día laboral
 * @param storeRecordId - ID de la tienda
 * @param esHistorica - Boolean que indica si la tienda es histórica
 * @param fecha - Fecha del día en formato YYYY-MM-DD (opcional)
 * @param semanaObjetivo - Semana objetivo en formato "W26 2025" (opcional, se calcula automáticamente si no se proporciona)
 * @returns Promise que resuelve con datos de tráfico (histórico o estándar)
 */
export async function obtenerDatosTraficoConLogicaHistorica(
  diaLaboralId: string,
  storeRecordId: string,
  esHistorica: boolean,
  fecha?: string,
  semanaObjetivo?: string
): Promise<DatosTraficoDia | TraficoHistoricoAggregado | null> {
  try {
    // Si no es histórica, usar lógica estándar existente
    if (!esHistorica) {
      return await obtenerDatosTrafico(diaLaboralId, storeRecordId);
    }

    // Determinar la fecha y día de la semana
    let fechaObjetivo = fecha;
    if (!fechaObjetivo) {
      // Si no se proporciona fecha, usar la fecha actual
      fechaObjetivo = new Date().toISOString().split('T')[0];
    }

    // Determinar la semana objetivo
    let semanaObjetivoFinal = semanaObjetivo;
    if (!semanaObjetivoFinal) {
      // Calcular automáticamente la semana objetivo basado en la fecha
      const { obtenerFormatoSemana } = await import('@/lib/airtable');
      const fechaObj = new Date(fechaObjetivo);
      semanaObjetivoFinal = obtenerFormatoSemana(fechaObj);
    }

    console.log(`🎯 Procesando tráfico histórico para fecha: ${fechaObjetivo}, semana objetivo: ${semanaObjetivoFinal}`);

    // Para tiendas históricas, verificar si tienen semanas configuradas para esta semana específica
    const { obtenerSemanasHistoricasPorSemana } = await import('@/lib/airtable');
    console.log(`🔍 Buscando configuración histórica para tienda ${storeRecordId}, semana: ${semanaObjetivoFinal}`);
    const semanasReferencia = await obtenerSemanasHistoricasPorSemana(storeRecordId, semanaObjetivoFinal);
    console.log(`📋 Resultado de búsqueda:`, semanasReferencia);
    
    // Si no tiene semanas configuradas para esta semana específica, usar lógica estándar
    if (!semanasReferencia || semanasReferencia.length === 0) {
      console.log(`📊 No hay configuración histórica para semana ${semanaObjetivoFinal}, usando lógica estándar`);
      return await obtenerDatosTrafico(diaLaboralId, storeRecordId);
    }

    console.log(`📋 Semanas de referencia encontradas para ${semanaObjetivoFinal}:`, semanasReferencia);

    const diaObjetivo = obtenerDiaSemana(fechaObjetivo);
    
    console.log(`📈 Obteniendo tráfico histórico para: ${fechaObjetivo} (${diaObjetivo}), semanas: ${semanasReferencia.join(', ')}`);

    // Obtener datos históricos
    const datosHistoricos = await obtenerTraficoHistorico(
      semanasReferencia,
      storeRecordId,
      diaObjetivo
    );

    if (datosHistoricos) {
      // Agregar metadata sobre la configuración usada
      datosHistoricos.semanaObjetivo = semanaObjetivoFinal;
      datosHistoricos.semanasReferencia = semanasReferencia;
      
      console.log(`✅ Datos históricos obtenidos exitosamente para semana ${semanaObjetivoFinal}`);
      return datosHistoricos;
    } else {
      // Si falla la obtención histórica, usar lógica estándar como fallback
      console.warn(`⚠️ Falló la obtención de datos históricos para semana ${semanaObjetivoFinal}, usando lógica estándar como fallback`);
      return await obtenerDatosTrafico(diaLaboralId, storeRecordId);
    }

  } catch (error) {
    console.error('Error en obtenerDatosTraficoConLogicaHistorica:', error);
    // En caso de error, usar lógica estándar como fallback
    return await obtenerDatosTrafico(diaLaboralId, storeRecordId);
  }
}

/**
 * Función addon para tiendas NO históricas que usa promedios de 4 semanas
 * @param diaLaboralId - ID del día laboral
 * @param storeRecordId - ID de la tienda
 * @param fecha - Fecha del día en formato YYYY-MM-DD
 * @returns Promise que resuelve con datos de tráfico promediados
 */
export async function obtenerDatosTraficoPromedio4Semanas(
  diaLaboralId: string,
  storeRecordId: string,
  fecha: string
): Promise<DatosTraficoDia | TraficoHistoricoAggregado | null> {
  try {
    const diaObjetivo = obtenerDiaSemana(fecha);
    
    console.log(`Obteniendo tráfico promedio 4 semanas para: ${fecha} (${diaObjetivo})`);

    const datosPromedio = await obtenerTraficoNoHistorico(
      storeRecordId,
      fecha,
      diaObjetivo
    );

    if (datosPromedio) {
      return datosPromedio;
    } else {
      // Si falla, usar lógica estándar como fallback
      console.warn('Falló la obtención de promedio 4 semanas, usando lógica estándar como fallback');
      return await obtenerDatosTrafico(diaLaboralId, storeRecordId);
    }

  } catch (error) {
    console.error('Error en obtenerDatosTraficoPromedio4Semanas:', error);
    return await obtenerDatosTrafico(diaLaboralId, storeRecordId);
  }
} 