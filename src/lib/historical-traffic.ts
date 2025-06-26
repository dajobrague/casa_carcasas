/**
 * Funciones auxiliares para el manejo de tráfico histórico
 * Estas funciones son un addon para las tiendas históricas con semanas de referencia configuradas
 */

import { obtenerDatosTrafico } from './api';
import { DatosTraficoDia } from './utils';

/**
 * Interfaz para los datos de tráfico histórico agregados
 */
export interface TraficoHistoricoAggregado {
  horas: Record<string, { entradas: number; tickets: number; euros: number }>;
  totalMañana: { entradas: number; tickets: number; euros: number };
  totalTarde: { entradas: number; tickets: number; euros: number };
  datosPorDia: {
    [diaSemana: string]: Record<string, { entradas: number; tickets: number; euros: number }>;
  };
  fechaInicio: string;
  fechaFin: string;
  esDatoHistorico: boolean;
  semanasReferencia: string[];
  semanaObjetivo?: string;
}

/**
 * Calcula las fechas de las semanas de referencia del año anterior
 * @param semanasReferencia - Array de semanas en formato "W20 2024"
 * @returns Array de objetos con las fechas de cada semana
 */
export function calcularFechasSemanasReferencia(semanasReferencia: string[]): Array<{
  semana: string;
  fechas: string[];
}> {
  const fechasPorSemana: Array<{ semana: string; fechas: string[] }> = [];

  for (const semanaStr of semanasReferencia) {
    const [weekPart, yearStr] = semanaStr.split(' ');
    const weekNumber = parseInt(weekPart.replace('W', ''));
    const year = parseInt(yearStr);

    if (isNaN(weekNumber) || isNaN(year)) {
      console.warn(`📅 Formato de semana inválido: ${semanaStr}`);
      continue;
    }

    // Calcular fecha del lunes de la semana especificada
    const fechaLunes = obtenerLunesDeLaSemana(year, weekNumber);
    
    // Generar todas las fechas de la semana (lunes a domingo)
    const fechasSemana: string[] = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(fechaLunes);
      fecha.setDate(fecha.getDate() + i);
      fechasSemana.push(fecha.toISOString().split('T')[0]);
    }

    fechasPorSemana.push({
      semana: semanaStr,
      fechas: fechasSemana
    });
  }

  return fechasPorSemana;
}

/**
 * Obtiene la fecha del lunes de una semana específica
 * @param year - Año
 * @param weekNumber - Número de semana (1-53)
 * @returns Fecha del lunes de esa semana
 */
function obtenerLunesDeLaSemana(year: number, weekNumber: number): Date {
  // Obtener el 4 de enero del año (siempre está en la primera semana)
  const enero4 = new Date(year, 0, 4);
  
  // Encontrar el lunes de la primera semana
  const primerLunes = new Date(enero4);
  primerLunes.setDate(enero4.getDate() - enero4.getDay() + 1);
  
  // Calcular el lunes de la semana especificada
  const lunesObjetivo = new Date(primerLunes);
  lunesObjetivo.setDate(primerLunes.getDate() + (weekNumber - 1) * 7);
  
  return lunesObjetivo;
}

/**
 * Agrupa los datos de tráfico por día de la semana
 * @param datosTrafico - Array de datos de tráfico diarios
 * @returns Datos agrupados por día de la semana
 */
export function agruparDatosPorDiaSemana(datosTrafico: Array<{
  fecha: string;
  datos: DatosTraficoDia;
}>): Record<string, Array<Record<string, { entradas: number; tickets: number; euros: number }>>> {
  const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const datosPorDia: Record<string, Array<Record<string, { entradas: number; tickets: number; euros: number }>>> = {};
  
  // Inicializar estructura
  diasSemana.forEach(dia => {
    datosPorDia[dia] = [];
  });

  // Agrupar datos por día de la semana
  datosTrafico.forEach(({ fecha, datos }) => {
    const fechaObj = new Date(fecha);
    const diaSemanaIndex = fechaObj.getDay(); // 0 = domingo, 1 = lunes, etc.
    
    // Mapear índice de día a nombre
    const diasMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaSemana = diasMap[diaSemanaIndex];
    
    if (datos.horas) {
      datosPorDia[diaSemana].push(datos.horas);
    }
  });

  return datosPorDia;
}

/**
 * Calcula el promedio de tráfico por hora para cada día de la semana
 * @param datosAgrupados - Datos agrupados por día de la semana
 * @returns Promedios por día de la semana
 */
export function calcularPromediosPorDiaSemana(
  datosAgrupados: Record<string, Array<Record<string, { entradas: number; tickets: number; euros: number }>>>
): Record<string, Record<string, { entradas: number; tickets: number; euros: number }>> {
  const promedios: Record<string, Record<string, { entradas: number; tickets: number; euros: number }>> = {};

  Object.keys(datosAgrupados).forEach(diaSemana => {
    const datosDelDia = datosAgrupados[diaSemana];
    
    if (datosDelDia.length === 0) {
      promedios[diaSemana] = {};
      return;
    }

    // Obtener todas las horas únicas
    const horasUnicas = new Set<string>();
    datosDelDia.forEach(datos => {
      Object.keys(datos).forEach(hora => horasUnicas.add(hora));
    });

    // Calcular promedio para cada hora
    const promedioHoras: Record<string, { entradas: number; tickets: number; euros: number }> = {};
    horasUnicas.forEach(hora => {
      const valoresEntradas = datosDelDia
        .map(datos => datos[hora]?.entradas || 0)
        .filter(valor => valor > 0);
      
      const valoresTickets = datosDelDia
        .map(datos => datos[hora]?.tickets || 0)
        .filter(valor => valor > 0);
      
      const valoresEuros = datosDelDia
        .map(datos => datos[hora]?.euros || 0)
        .filter(valor => valor > 0);
      
      if (valoresEntradas.length > 0 || valoresTickets.length > 0 || valoresEuros.length > 0) {
        promedioHoras[hora] = {
          entradas: valoresEntradas.length > 0 ? Math.round(valoresEntradas.reduce((sum, val) => sum + val, 0) / valoresEntradas.length) : 0,
          tickets: valoresTickets.length > 0 ? Math.round(valoresTickets.reduce((sum, val) => sum + val, 0) / valoresTickets.length) : 0,
          euros: valoresEuros.length > 0 ? Math.round((valoresEuros.reduce((sum, val) => sum + val, 0) / valoresEuros.length) * 100) / 100 : 0
        };
      }
    });

    promedios[diaSemana] = promedioHoras;
  });

  return promedios;
}

/**
 * Función con timeout para evitar llamadas que cuelguen
 */
async function fetchConTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Convertir errores complejos en errores simples
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('TIMEOUT');
      } else if (error.message.includes('fetch')) {
        throw new Error('NETWORK_ERROR');
      }
      throw new Error(error.message.substring(0, 50));
    }
    
    throw new Error('UNKNOWN_ERROR');
  }
}

/**
 * Obtiene los datos de tráfico histórico para múltiples fechas
 * @param fechas - Array de fechas en formato YYYY-MM-DD
 * @param storeRecordId - ID de la tienda
 * @returns Promise con los datos de tráfico para todas las fechas
 */
export async function obtenerDatosTraficoMultiplesFechas(
  fechas: string[],
  storeRecordId: string
): Promise<Array<{ fecha: string; datos: DatosTraficoDia | null }>> {
  if (fechas.length === 0) {
    return [];
  }
  
  console.log(`🔍 Obteniendo tráfico para ${fechas.length} fechas (bulk)...`);
  
  try {
    const baseUrl = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Usar la nueva API bulk que es mucho más rápida
    const fechasParam = fechas.join(',');
    const url = `${baseUrl}/api/trafico-bulk?tiendaId=${storeRecordId}&fechas=${encodeURIComponent(fechasParam)}`;
    
    const response = await fetchConTimeout(url, 15000); // timeout más generoso para bulk
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.resultados || !Array.isArray(data.resultados)) {
      throw new Error('Formato de respuesta inválido');
    }
    
    // Convertir resultados al formato esperado
    const resultados: Array<{ fecha: string; datos: DatosTraficoDia | null }> = [];
    let exitosos = 0;
    let fallidos = 0;
    
    data.resultados.forEach((resultado: any) => {
      try {
        if (resultado.datos && resultado.datos.entradasPorHora) {
          const datosTraficoDia: DatosTraficoDia = {
            horas: resultado.datos.entradasPorHora,
            totalMañana: { entradas: 0, tickets: 0, euros: 0 },
            totalTarde: { entradas: 0, tickets: 0, euros: 0 },
            fechaInicio: resultado.fecha,
            fechaFin: resultado.fecha
          };
          
          // Calcular totales de mañana y tarde
          Object.entries(resultado.datos.entradasPorHora).forEach(([hora, datos]) => {
            const horaNum = parseInt(hora.split(':')[0]);
            
            if (!isNaN(horaNum) && datos && typeof datos === 'object') {
              const datosObj = datos as { entradas: number; tickets: number; euros: number };
              const entradasNum = datosObj.entradas || 0;
              const ticketsNum = datosObj.tickets || 0;
              const eurosNum = datosObj.euros || 0;
              
              if (horaNum < 14) {
                datosTraficoDia.totalMañana.entradas += entradasNum;
                datosTraficoDia.totalMañana.tickets += ticketsNum;
                datosTraficoDia.totalMañana.euros += eurosNum;
              } else {
                datosTraficoDia.totalTarde.entradas += entradasNum;
                datosTraficoDia.totalTarde.tickets += ticketsNum;
                datosTraficoDia.totalTarde.euros += eurosNum;
              }
            }
          });
          
          resultados.push({ fecha: resultado.fecha, datos: datosTraficoDia });
          exitosos++;
        } else {
          resultados.push({ fecha: resultado.fecha, datos: null });
          fallidos++;
        }
      } catch (parseError) {
        resultados.push({ fecha: resultado.fecha, datos: null });
        fallidos++;
      }
    });
    
    console.log(`📊 Histórico: ${exitosos}✅ ${fallidos}❌`);
    return resultados;
    
  } catch (error) {
    console.warn(`❌ Error en API bulk, fallback a método individual`);
    
    // Fallback al método original si el bulk falla
    return obtenerDatosTraficoMultiplesFechasIndividual(fechas, storeRecordId);
  }
}

/**
 * Función fallback para obtener datos individualmente si el bulk falla
 */
async function obtenerDatosTraficoMultiplesFechasIndividual(
  fechas: string[],
  storeRecordId: string
): Promise<Array<{ fecha: string; datos: DatosTraficoDia | null }>> {
  const resultados: Array<{ fecha: string; datos: DatosTraficoDia | null }> = [];
  const batchSize = 6;
  let exitosos = 0;
  let fallidos = 0;
  
  for (let i = 0; i < fechas.length; i += batchSize) {
    const batch = fechas.slice(i, i + batchSize);
    
    const promesas = batch.map(async (fecha) => {
      try {
        const baseUrl = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const url = `${baseUrl}/api/trafico?tiendaId=${storeRecordId}&fechaInicio=${fecha}&fechaFin=${fecha}`;
        
        const response = await fetchConTimeout(url, 8000);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.entradasPorHora && typeof data.entradasPorHora === 'object') {
          const datosTraficoDia: DatosTraficoDia = {
            horas: data.entradasPorHora,
            totalMañana: { entradas: 0, tickets: 0, euros: 0 },
            totalTarde: { entradas: 0, tickets: 0, euros: 0 },
            fechaInicio: fecha,
            fechaFin: fecha
          };
          
          Object.entries(data.entradasPorHora).forEach(([hora, datos]) => {
            const horaNum = parseInt(hora.split(':')[0]);
            
            if (!isNaN(horaNum) && datos && typeof datos === 'object') {
              const datosObj = datos as { entradas: number; tickets: number; euros: number };
              const entradasNum = datosObj.entradas || 0;
              const ticketsNum = datosObj.tickets || 0;
              const eurosNum = datosObj.euros || 0;
              
              if (horaNum < 14) {
                datosTraficoDia.totalMañana.entradas += entradasNum;
                datosTraficoDia.totalMañana.tickets += ticketsNum;
                datosTraficoDia.totalMañana.euros += eurosNum;
              } else {
                datosTraficoDia.totalTarde.entradas += entradasNum;
                datosTraficoDia.totalTarde.tickets += ticketsNum;
                datosTraficoDia.totalTarde.euros += eurosNum;
              }
            }
          });
          
          exitosos++;
          return { fecha, datos: datosTraficoDia };
        }
        
        fallidos++;
        return { fecha, datos: null };
        
      } catch (error) {
        fallidos++;
        return { fecha, datos: null };
      }
    });

    const resultadosBatch = await Promise.allSettled(promesas);
    resultadosBatch.forEach((resultado, index) => {
      if (resultado.status === 'fulfilled') {
        resultados.push(resultado.value);
      } else {
        resultados.push({ fecha: batch[index], datos: null });
        fallidos++;
      }
    });
  }
  
  console.log(`📊 Histórico (individual): ${exitosos}✅ ${fallidos}❌`);
  return resultados;
}

/**
 * Función principal para obtener datos de tráfico histórico
 * @param semanasReferencia - Array de semanas en formato "W20 2024"
 * @param storeRecordId - ID de la tienda
 * @param diaObjetivo - Día de la semana objetivo (lunes, martes, etc.)
 * @returns Promise con los datos de tráfico histórico procesados
 */
export async function obtenerTraficoHistorico(
  semanasReferencia: string[],
  storeRecordId: string,
  diaObjetivo: string
): Promise<TraficoHistoricoAggregado | null> {
  try {
    console.log(`📈 Calculando tráfico histórico para ${diaObjetivo} usando semanas:`, semanasReferencia.join(', '));
    
    // 1. Calcular fechas de las semanas de referencia
    const fechasPorSemana = calcularFechasSemanasReferencia(semanasReferencia);
    
    // 2. Obtener todas las fechas
    const todasLasFechas = fechasPorSemana.flatMap(semana => semana.fechas);
    
    // 3. Obtener datos de tráfico para todas las fechas
    const datosTrafico = await obtenerDatosTraficoMultiplesFechas(todasLasFechas, storeRecordId);
    
    // 4. Filtrar solo los datos válidos
    const datosValidos = datosTrafico.filter(item => item.datos !== null) as Array<{
      fecha: string;
      datos: DatosTraficoDia;
    }>;
    
    if (datosValidos.length === 0) {
      console.warn('❌ No se obtuvieron datos válidos para las fechas especificadas');
      return null;
    }
    
    // 5. Agrupar por día de la semana
    const datosAgrupados = agruparDatosPorDiaSemana(datosValidos);
    
    // 6. Calcular promedios por día de la semana
    const promedios = calcularPromediosPorDiaSemana(datosAgrupados);
    
    // 7. Obtener datos específicos del día objetivo
    const datosDelDiaObjetivo = promedios[diaObjetivo.toLowerCase()] || {};
    
    // 8. Calcular totales de mañana y tarde
    const totalMañana = Object.entries(datosDelDiaObjetivo)
      .filter(([hora]) => parseInt(hora.split(':')[0]) < 14)
      .reduce((sum, [, valor]) => ({
        entradas: sum.entradas + valor.entradas,
        tickets: sum.tickets + valor.tickets,
        euros: sum.euros + valor.euros
      }), { entradas: 0, tickets: 0, euros: 0 });
    
    const totalTarde = Object.entries(datosDelDiaObjetivo)
      .filter(([hora]) => parseInt(hora.split(':')[0]) >= 14)
      .reduce((sum, [, valor]) => ({
        entradas: sum.entradas + valor.entradas,
        tickets: sum.tickets + valor.tickets,
        euros: sum.euros + valor.euros
      }), { entradas: 0, tickets: 0, euros: 0 });
    
    // 9. Construir respuesta
    const resultado: TraficoHistoricoAggregado = {
      horas: datosDelDiaObjetivo,
      totalMañana,
      totalTarde,
      datosPorDia: promedios,
      fechaInicio: todasLasFechas[0] || '',
      fechaFin: todasLasFechas[todasLasFechas.length - 1] || '',
      esDatoHistorico: true,
      semanasReferencia
    };
    
    console.log(`✅ Tráfico histórico calculado: ${Object.keys(datosDelDiaObjetivo).length} horas, Total: ${totalMañana.entradas + totalTarde.entradas}`);
    return resultado;
    
  } catch (error) {
    console.error('❌ Error al obtener tráfico histórico:', error instanceof Error ? error.message : 'Error desconocido');
    return null;
  }
}

/**
 * Función para procesar datos de tráfico histórico para tiendas NO históricas
 * @param storeRecordId - ID de la tienda
 * @param fechaActual - Fecha actual en formato YYYY-MM-DD
 * @param diaObjetivo - Día de la semana objetivo
 * @returns Promise con los datos de tráfico de las últimas 4 semanas
 */
export async function obtenerTraficoNoHistorico(
  storeRecordId: string,
  fechaActual: string,
  diaObjetivo: string
): Promise<TraficoHistoricoAggregado | null> {
  try {
    console.log(`📊 Calculando tráfico promedio para ${diaObjetivo} (últimas 4 semanas)`);
    
    // Generar fechas de las últimas 4 semanas del mismo día
    const fechas: string[] = [];
    const fechaBase = new Date(fechaActual);
    
    for (let i = 1; i <= 4; i++) {
      const fecha = new Date(fechaBase);
      fecha.setDate(fecha.getDate() - (i * 7)); // Retroceder 1, 2, 3, 4 semanas
      fechas.push(fecha.toISOString().split('T')[0]);
    }
    
    // Obtener datos de tráfico para estas fechas
    const datosTrafico = await obtenerDatosTraficoMultiplesFechas(fechas, storeRecordId);
    
    // Filtrar datos válidos
    const datosValidos = datosTrafico.filter(item => item.datos !== null) as Array<{
      fecha: string;
      datos: DatosTraficoDia;
    }>;
    
    if (datosValidos.length === 0) {
      return null;
    }
    
    // Agrupar y calcular promedios
    const datosAgrupados = agruparDatosPorDiaSemana(datosValidos);
    const promedios = calcularPromediosPorDiaSemana(datosAgrupados);
    
    // Obtener datos del día objetivo
    const datosDelDiaObjetivo = promedios[diaObjetivo.toLowerCase()] || {};
    
    // Calcular totales
    const totalMañana = Object.entries(datosDelDiaObjetivo)
      .filter(([hora]) => parseInt(hora.split(':')[0]) < 14)
      .reduce((sum, [, valor]) => ({
        entradas: sum.entradas + valor.entradas,
        tickets: sum.tickets + valor.tickets,
        euros: sum.euros + valor.euros
      }), { entradas: 0, tickets: 0, euros: 0 });
    
    const totalTarde = Object.entries(datosDelDiaObjetivo)
      .filter(([hora]) => parseInt(hora.split(':')[0]) >= 14)
      .reduce((sum, [, valor]) => ({
        entradas: sum.entradas + valor.entradas,
        tickets: sum.tickets + valor.tickets,
        euros: sum.euros + valor.euros
      }), { entradas: 0, tickets: 0, euros: 0 });

    console.log(`✅ Tráfico promedio calculado: ${datosValidos.length} días válidos`);

    return {
      horas: datosDelDiaObjetivo,
      totalMañana,
      totalTarde,
      datosPorDia: promedios,
      fechaInicio: fechas[fechas.length - 1] || '',
      fechaFin: fechas[0] || '',
      esDatoHistorico: false,
      semanasReferencia: [],
      semanaObjetivo: diaObjetivo
    };
    
  } catch (error) {
    console.error('❌ Error al obtener tráfico no histórico:', error instanceof Error ? error.message : 'Error desconocido');
    return null;
  }
}

/**
 * Función para obtener tráfico promedio de las últimas 4 semanas 
 * para tiendas no históricas (día de la semana vs día de la semana)
 * @param storeRecordId - ID de la tienda
 * @param fechaObjetivo - Fecha objetivo de la semana a calcular
 * @returns Promise con los datos de tráfico promedio de las últimas 4 semanas
 */
export async function obtenerTraficoPromedioUltimas4Semanas(
  storeRecordId: string,
  fechaObjetivo: string
): Promise<TraficoHistoricoAggregado | null> {
  try {
    console.log(`📊 Calculando tráfico promedio últimas 4 semanas para semana de ${fechaObjetivo}`);
    
    // Obtener todas las fechas de la semana objetivo
    const fechasSemanaObjetivo = obtenerFechasSemana(fechaObjetivo);
    console.log(`📅 Fechas semana objetivo:`, fechasSemanaObjetivo);
    
    // Generar fechas para las últimas 4 semanas completas
    const todasLasFechas: string[] = [];
    const fechaBase = new Date(fechaObjetivo);
    
    // Para cada una de las últimas 4 semanas
    for (let semanaAtras = 1; semanaAtras <= 4; semanaAtras++) {
      // Calcular la fecha del mismo día de la semana, pero X semanas atrás
      const fechaReferencia = new Date(fechaBase);
      fechaReferencia.setDate(fechaBase.getDate() - (semanaAtras * 7));
      
      // Obtener todas las fechas de esa semana
      const fechasSemanaReferencia = obtenerFechasSemana(fechaReferencia.toISOString().split('T')[0]);
      todasLasFechas.push(...fechasSemanaReferencia);
    }
    
    console.log(`📊 Obteniendo datos para ${todasLasFechas.length} fechas de las últimas 4 semanas`);
    
    // Para promedio 4 semanas, usar método individual directamente (más confiable para 28 fechas)
    const datosTrafico = await obtenerDatosTraficoMultiplesFechasIndividual(todasLasFechas, storeRecordId);
    
    // Filtrar datos válidos
    const datosValidos = datosTrafico.filter(item => item.datos !== null) as Array<{
      fecha: string;
      datos: DatosTraficoDia;
    }>;
    
    console.log(`✅ Datos válidos obtenidos: ${datosValidos.length} de ${todasLasFechas.length} fechas`);
    
    // Si no hay datos en absoluto, retornar null
    if (datosValidos.length === 0) {
      console.warn(`❌ No se encontraron datos para ninguna de las últimas 4 semanas`);
      return null;
    }
    
    // Calcular promedios por día de la semana con la nueva lógica
    const promediosPorDia = calcularPromediosPorDiaConNuevaLogica(datosValidos);
    
    // Calcular horas de toda la semana combinando todos los días
    const horasSemanales: Record<string, { entradas: number; tickets: number; euros: number }> = {};
    Object.values(promediosPorDia).forEach(datosDelDia => {
      Object.entries(datosDelDia).forEach(([hora, datos]) => {
        if (!horasSemanales[hora]) {
          horasSemanales[hora] = { entradas: 0, tickets: 0, euros: 0 };
        }
        horasSemanales[hora].entradas += datos.entradas;
        horasSemanales[hora].tickets += datos.tickets;
        horasSemanales[hora].euros += datos.euros;
      });
    });
    
    // Calcular totales de mañana y tarde (promedio de las 4 semanas)
    const totalMañanaSuma = Object.entries(horasSemanales)
      .filter(([hora]) => parseInt(hora.split(':')[0]) < 14)
      .reduce((sum, [, valor]) => ({
        entradas: sum.entradas + valor.entradas,
        tickets: sum.tickets + valor.tickets,
        euros: sum.euros + valor.euros
      }), { entradas: 0, tickets: 0, euros: 0 });
    
    const totalTardeSuma = Object.entries(horasSemanales)
      .filter(([hora]) => parseInt(hora.split(':')[0]) >= 14)
      .reduce((sum, [, valor]) => ({
        entradas: sum.entradas + valor.entradas,
        tickets: sum.tickets + valor.tickets,
        euros: sum.euros + valor.euros
      }), { entradas: 0, tickets: 0, euros: 0 });

    // Dividir entre 4 para obtener el promedio real
    const totalMañana = {
      entradas: Math.round(totalMañanaSuma.entradas / 4),
      tickets: Math.round(totalMañanaSuma.tickets / 4),
      euros: Math.round((totalMañanaSuma.euros / 4) * 100) / 100
    };
    
    const totalTarde = {
      entradas: Math.round(totalTardeSuma.entradas / 4),
      tickets: Math.round(totalTardeSuma.tickets / 4),
      euros: Math.round((totalTardeSuma.euros / 4) * 100) / 100
    };

    console.log(`✅ Promedio 4 semanas calculado: ${datosValidos.length} días válidos de ${todasLasFechas.length} posibles`);

    return {
      horas: horasSemanales,
      totalMañana,
      totalTarde,
      datosPorDia: promediosPorDia,
      fechaInicio: fechasSemanaObjetivo[0],
      fechaFin: fechasSemanaObjetivo[6],
      esDatoHistorico: false,
      semanasReferencia: [`Promedio últimas 4 semanas`],
      semanaObjetivo: `Semana de ${fechaObjetivo}`
    };
    
  } catch (error) {
    console.error('❌ Error al calcular promedio últimas 4 semanas:', error instanceof Error ? error.message : 'Error desconocido');
    return null;
  }
}

/**
 * Calcula promedios por día de la semana con la nueva lógica:
 * - Si alguna semana no tiene datos, se trata como 0
 * - El promedio se divide entre las semanas que sí tenían datos
 * - Si un día no tiene datos en ninguna semana, se muestra como 0
 */
function calcularPromediosPorDiaConNuevaLogica(
  datosValidos: Array<{ fecha: string; datos: DatosTraficoDia }>
): Record<string, Record<string, { entradas: number; tickets: number; euros: number }>> {
  
  const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const promedios: Record<string, Record<string, { entradas: number; tickets: number; euros: number }>> = {};
  
  // Agrupar datos por día de la semana
  const datosAgrupados = agruparDatosPorDiaSemana(datosValidos);
  
  // Para cada día de la semana
  diasSemana.forEach(diaSemana => {
    const datosDelDia = datosAgrupados[diaSemana] || [];
    
    // Si no hay datos para este día en ninguna semana, mostrar como 0
    if (datosDelDia.length === 0) {
      promedios[diaSemana] = {};
      return;
    }
    
    // Obtener todas las horas únicas que aparecen en cualquier semana
    const horasUnicas = new Set<string>();
    datosDelDia.forEach(datos => {
      Object.keys(datos).forEach(hora => horasUnicas.add(hora));
    });
    
    // Para cada hora, calcular el promedio considerando las 4 semanas
    const promedioHoras: Record<string, { entradas: number; tickets: number; euros: number }> = {};
    
    horasUnicas.forEach(hora => {
      // Extraer valores de las semanas que tienen datos para esta hora
      let sumaEntradas = 0;
      let sumaTickets = 0;
      let sumaEuros = 0;
      let semanasConDatos = 0;
      
      // Iterar sobre los datos disponibles (puede ser menos de 4 semanas)
      datosDelDia.forEach(datos => {
        const datoHora = datos[hora];
        if (datoHora) {
          sumaEntradas += datoHora.entradas || 0;
          sumaTickets += datoHora.tickets || 0;
          sumaEuros += datoHora.euros || 0;
          semanasConDatos++;
        }
        // Si no hay datos para esta hora en esta semana, se cuenta como 0 (no se suma nada)
      });
      
      // El promedio se calcula dividiendo entre el número de semanas que SÍ tenían datos
      // Si ninguna semana tenía datos para esta hora, el resultado es 0
      if (semanasConDatos > 0) {
        promedioHoras[hora] = {
          entradas: Math.round(sumaEntradas / semanasConDatos),
          tickets: Math.round(sumaTickets / semanasConDatos),
          euros: Math.round((sumaEuros / semanasConDatos) * 100) / 100
        };
      } else {
        promedioHoras[hora] = { entradas: 0, tickets: 0, euros: 0 };
      }
    });
    
    promedios[diaSemana] = promedioHoras;
  });
  
  return promedios;
}

/**
 * Función para obtener el día de la semana en español
 * @param fecha - Fecha en formato YYYY-MM-DD
 * @returns Nombre del día en español
 */
export function obtenerDiaSemana(fecha: string): string {
  const fechaObj = new Date(fecha);
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return diasSemana[fechaObj.getDay()];
}

/**
 * Función para obtener todas las fechas de una semana basada en una fecha específica
 * @param fechaReferencia - Fecha de referencia en formato YYYY-MM-DD
 * @returns Array con las 7 fechas de la semana (lunes a domingo)
 */
export function obtenerFechasSemana(fechaReferencia: string): string[] {
  const fecha = new Date(fechaReferencia);
  
  // Encontrar el lunes de esa semana
  const diaSemana = fecha.getDay(); // 0 = domingo, 1 = lunes, etc.
  const diasHastaLunes = diaSemana === 0 ? -6 : 1 - diaSemana; // Si es domingo, retroceder 6 días
  
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + diasHastaLunes);
  
  // Generar todas las fechas de la semana (lunes a domingo)
  const fechasSemana: string[] = [];
  for (let i = 0; i < 7; i++) {
    const fechaDia = new Date(lunes);
    fechaDia.setDate(lunes.getDate() + i);
    fechasSemana.push(fechaDia.toISOString().split('T')[0]);
  }
  
  return fechasSemana;
}

/**
 * Función para obtener datos de tráfico usando mapping por día específico
 * @param mappingDias - Mapeo de fechas objetivo a fechas de referencia {"2025-06-23": "2024-06-24"}
 * @param storeRecordId - ID de la tienda
 * @param fechaObjetivo - Fecha objetivo en formato YYYY-MM-DD
 * @returns Promise con los datos de tráfico para el día específico
 */
export async function obtenerTraficoPorDia(
  mappingDias: Record<string, string>,
  storeRecordId: string,
  fechaObjetivo: string
): Promise<TraficoHistoricoAggregado | null> {
  try {
    console.log(`🎯 Calculando tráfico por día específico para ${fechaObjetivo}`);
    console.log(`📋 Mapping configurado:`, mappingDias);
    
    // Verificar que existe mapping para la fecha objetivo
    const fechaReferencia = mappingDias[fechaObjetivo];
    if (!fechaReferencia) {
      console.warn(`❌ No hay configuración de día para la fecha ${fechaObjetivo}`);
      return null;
    }
    
    console.log(`🔗 Fecha objetivo: ${fechaObjetivo} → Fecha referencia: ${fechaReferencia}`);
    
    // Obtener datos de tráfico para la fecha de referencia específica
    const datosTrafico = await obtenerDatosTraficoMultiplesFechas([fechaReferencia], storeRecordId);
    
    // Filtrar datos válidos
    const datosValidos = datosTrafico.filter(item => item.datos !== null) as Array<{
      fecha: string;
      datos: DatosTraficoDia;
    }>;
    
    if (datosValidos.length === 0) {
      console.warn(`❌ No se obtuvieron datos válidos para la fecha de referencia ${fechaReferencia}`);
      return null;
    }
    
    const datosDiaReferencia = datosValidos[0].datos;
    
    // Obtener día de la semana de la fecha objetivo
    const diaObjetivo = obtenerDiaSemana(fechaObjetivo);
    
    // Crear estructura de datos compatible con TraficoHistoricoAggregado
    // pero usando datos exactos de un día específico en lugar de promedios
    const horasDelDia = datosDiaReferencia.horas || {};
    
    // Calcular totales de mañana y tarde
    const totalMañana = Object.entries(horasDelDia)
      .filter(([hora]) => parseInt(hora.split(':')[0]) < 14)
      .reduce((sum, [, valor]) => ({
        entradas: sum.entradas + (valor.entradas || 0),
        tickets: sum.tickets + (valor.tickets || 0),
        euros: sum.euros + (valor.euros || 0)
      }), { entradas: 0, tickets: 0, euros: 0 });
    
    const totalTarde = Object.entries(horasDelDia)
      .filter(([hora]) => parseInt(hora.split(':')[0]) >= 14)
      .reduce((sum, [, valor]) => ({
        entradas: sum.entradas + (valor.entradas || 0),
        tickets: sum.tickets + (valor.tickets || 0),
        euros: sum.euros + (valor.euros || 0)
      }), { entradas: 0, tickets: 0, euros: 0 });
    
    // Crear datosPorDia con solo el día objetivo
    const datosPorDia: Record<string, Record<string, { entradas: number; tickets: number; euros: number }>> = {};
    datosPorDia[diaObjetivo.toLowerCase()] = horasDelDia;
    
    // Construir respuesta
    const resultado: TraficoHistoricoAggregado = {
      horas: horasDelDia,
      totalMañana,
      totalTarde,
      datosPorDia,
      fechaInicio: fechaReferencia,
      fechaFin: fechaReferencia,
      esDatoHistorico: true,
      semanasReferencia: [`Día exacto: ${fechaReferencia}`], // Indicar que es día específico
      semanaObjetivo: `Comparable por día: ${fechaObjetivo}`
    };
    
    console.log(`✅ Tráfico por día específico calculado: ${Object.keys(horasDelDia).length} horas, Total: ${totalMañana.entradas + totalTarde.entradas}`);
    console.log(`📊 Referencia usada: ${fechaReferencia} para objetivo: ${fechaObjetivo}`);
    
    return resultado;
    
  } catch (error) {
    console.error('❌ Error al obtener tráfico por día específico:', error instanceof Error ? error.message : 'Error desconocido');
    return null;
  }
}

/**
 * Función para obtener datos de tráfico usando configuración por día (múltiples días de una semana)
 * @param mappingDias - Mapeo de fechas objetivo a fechas de referencia
 * @param storeRecordId - ID de la tienda
 * @param fechasObjetivo - Array de fechas objetivo de la semana
 * @returns Promise con los datos de tráfico histórico usando días específicos
 */
export async function obtenerTraficoPorSemanaComparable(
  mappingDias: Record<string, string>,
  storeRecordId: string,
  fechasObjetivo: string[]
): Promise<TraficoHistoricoAggregado | null> {
  try {
    console.log(`🎯 Calculando tráfico por semana comparable`);
    console.log(`📅 Fechas objetivo:`, fechasObjetivo);
    console.log(`📋 Mapping configurado:`, mappingDias);
    
    // Obtener todas las fechas de referencia únicas
    const fechasReferencia = Array.from(new Set(
      fechasObjetivo
        .map(fecha => mappingDias[fecha])
        .filter(fecha => fecha !== undefined)
    ));
    
    if (fechasReferencia.length === 0) {
      console.warn(`❌ No hay fechas de referencia configuradas para las fechas objetivo`);
      return null;
    }
    
    console.log(`🔗 Fechas de referencia únicas:`, fechasReferencia);
    
    // Obtener datos de tráfico para todas las fechas de referencia
    const datosTrafico = await obtenerDatosTraficoMultiplesFechas(fechasReferencia, storeRecordId);
    
    // Filtrar datos válidos y crear un mapa por fecha
    const datosPorFecha = new Map<string, DatosTraficoDia>();
    datosTrafico.forEach(({ fecha, datos }) => {
      if (datos) {
        console.log(`📊 Datos encontrados para fecha ${fecha}:`, {
          tieneHoras: !!datos.horas,
          numHoras: datos.horas ? Object.keys(datos.horas).length : 0
        });
        datosPorFecha.set(fecha, datos);
      } else {
        console.warn(`❌ No hay datos para fecha ${fecha}`);
      }
    });
    
    if (datosPorFecha.size === 0) {
      console.warn(`❌ No se obtuvieron datos válidos para las fechas de referencia`);
      return null;
    }
    
    console.log(`📋 Total fechas con datos válidos: ${datosPorFecha.size}`);
    console.log(`📊 Fechas disponibles:`, Array.from(datosPorFecha.keys()));
    
    // Crear estructura de datosPorDia usando el mapping
    const datosPorDia: Record<string, Record<string, { entradas: number; tickets: number; euros: number }>> = {};
    const todasLasHoras = new Set<string>();
    
    // Procesar cada fecha objetivo
    fechasObjetivo.forEach(fechaObjetivo => {
      const fechaReferencia = mappingDias[fechaObjetivo];
      if (!fechaReferencia) {
        console.warn(`⚠️ No hay mapping para fecha objetivo ${fechaObjetivo}`);
        return;
      }
      
      const datosReferencia = datosPorFecha.get(fechaReferencia);
      if (!datosReferencia) {
        console.warn(`⚠️ No hay datos de tráfico para fecha de referencia ${fechaReferencia}`);
        return;
      }
      
      if (!datosReferencia.horas) {
        console.warn(`⚠️ No hay datos de horas para fecha de referencia ${fechaReferencia}`);
        return;
      }
      
      const diaObjetivo = obtenerDiaSemana(fechaObjetivo).toLowerCase();
      datosPorDia[diaObjetivo] = datosReferencia.horas;
      
      // Recopilar todas las horas disponibles
      Object.keys(datosReferencia.horas).forEach(hora => todasLasHoras.add(hora));
      
      console.log(`📅 ${fechaObjetivo} (${diaObjetivo}) → ${fechaReferencia} ✅ ${Object.keys(datosReferencia.horas).length} horas`);
    });
    
    // Determinar día principal (el primero de la semana objetivo)
    const fechaPrincipal = fechasObjetivo[0];
    const diaPrincipal = obtenerDiaSemana(fechaPrincipal).toLowerCase();
    const horasDelDiaPrincipal = datosPorDia[diaPrincipal] || {};
    
    // Calcular totales de mañana y tarde del día principal
    const totalMañana = Object.entries(horasDelDiaPrincipal)
      .filter(([hora]) => parseInt(hora.split(':')[0]) < 14)
      .reduce((sum, [, valor]) => ({
        entradas: sum.entradas + (valor.entradas || 0),
        tickets: sum.tickets + (valor.tickets || 0),
        euros: sum.euros + (valor.euros || 0)
      }), { entradas: 0, tickets: 0, euros: 0 });
    
    const totalTarde = Object.entries(horasDelDiaPrincipal)
      .filter(([hora]) => parseInt(hora.split(':')[0]) >= 14)
      .reduce((sum, [, valor]) => ({
        entradas: sum.entradas + (valor.entradas || 0),
        tickets: sum.tickets + (valor.tickets || 0),
        euros: sum.euros + (valor.euros || 0)
      }), { entradas: 0, tickets: 0, euros: 0 });
    
    // Construir respuesta
    const resultado: TraficoHistoricoAggregado = {
      horas: horasDelDiaPrincipal,
      totalMañana,
      totalTarde,
      datosPorDia,
      fechaInicio: fechasReferencia.sort()[0] || '',
      fechaFin: fechasReferencia.sort().reverse()[0] || '',
      esDatoHistorico: true,
      semanasReferencia: [`Días específicos: ${fechasReferencia.join(', ')}`],
      semanaObjetivo: `Semana comparable por días`
    };
    
    console.log(`✅ Tráfico por semana comparable calculado: ${Object.keys(horasDelDiaPrincipal).length} horas para día principal`);
    console.log(`📊 ${Object.keys(datosPorDia).length} días procesados:`, Object.keys(datosPorDia));
    
    return resultado;
    
  } catch (error) {
    console.error('❌ Error al obtener tráfico por semana comparable:', error instanceof Error ? error.message : 'Error desconocido');
    return null;
  }
} 