/**
 * Módulo para procesar datos de tráfico para el PDF
 */
import { calcularRecomendaciones, generarDatosTraficoSimulados, OpcionesRecomendacion } from './recomendaciones';
import { format } from 'date-fns';
import logger from './logger';
import { es } from 'date-fns/locale';

/**
 * Procesa los datos de tráfico para un día específico
 * @param diaOFecha Objeto con datos del día laboral o una fecha
 * @param tiendaId ID o código de la tienda
 * @param tiendaData Datos de la tienda (opcional)
 * @returns Objeto con datos de tráfico y recomendaciones
 */
export async function procesarTraficoParaDia(
  diaOFecha: Date | any,
  tiendaId: string | number,
  tiendaData?: any
): Promise<{
  trafico: Record<string, number>;
  recomendaciones: any;
  fechaConsulta: string;
  simulado: boolean;
  error?: string;
}> {
  try {
    // Determinar si estamos trabajando con un objeto Date o un objeto día
    const esObjetoDate = diaOFecha instanceof Date;
    
    let fechaConsulta = '';
    let diaId = '';
    let nombreDia = '';
    
    if (esObjetoDate) {
      // Si es un objeto Date, formatear la fecha como yyyy-MM-dd
      fechaConsulta = format(diaOFecha, 'yyyy-MM-dd');
      diaId = fechaConsulta;
      nombreDia = format(diaOFecha, 'EEEE, dd MMMM yyyy', { locale: es });
      console.log(`[PDF-TRAFFIC] Procesando fecha: ${nombreDia} (${fechaConsulta})`);
    } else {
      // Si es un objeto día, intentar obtener la fecha específica
      const dia = diaOFecha;
      fechaConsulta = dia.fields?.['fecha entradas'] || 
                      dia.fields?.['Fecha Entradas'];
      
      if (!fechaConsulta) {
        console.warn(`⚠️ [PDF-TRAFFIC] Día sin fecha de entradas definida: ${dia.fields?.Name}, usando fecha del día`);
        fechaConsulta = dia.fields?.Name;
      }
      
      diaId = dia.id || fechaConsulta;
      nombreDia = dia.fields?.Name || fechaConsulta;
      
      console.log(`[PDF-TRAFFIC] Usando fecha entradas ${fechaConsulta} para el día ${nombreDia}`);
    }
    
    if (!fechaConsulta) {
      throw new Error('No se pudo determinar la fecha para este día');
    }
    
    console.log(`[PDF-TRAFFIC] Fecha de consulta: ${fechaConsulta}`);
    
    // Crear opciones básicas para el cálculo de recomendaciones
    const opcionesBase: OpcionesRecomendacion = {
      atencionDeseada: 10, // valor por defecto
      crecimiento: 0, // sin crecimiento por defecto
      minimos: {} // mínimos por hora, vacío por defecto
    };
    
    // Si tenemos datos de la tienda, intentar obtener la atención deseada
    if (tiendaData && tiendaData.fields) {
      if (tiendaData.fields["Atención Deseada"]) {
        opcionesBase.atencionDeseada = parseFloat(tiendaData.fields["Atención Deseada"]);
      }
      
      if (tiendaData.fields["Crecimiento"]) {
        // Convertir de porcentaje a decimal
        opcionesBase.crecimiento = parseFloat(tiendaData.fields["Crecimiento"]) / 100;
      }
      
      // Si hay mínimos configurados, intentar obtenerlos
      if (tiendaData.fields["Mínimos por Hora"]) {
        try {
          opcionesBase.minimos = JSON.parse(tiendaData.fields["Mínimos por Hora"]);
        } catch (e) {
          console.warn('[PDF-TRAFFIC] Error al parsear mínimos por hora:', e);
        }
      }
    }
    
    // Construir URL para la API de tráfico
    const traficoUrl = `/api/trafico?tiendaId=${tiendaId}&fechaInicio=${fechaConsulta}&fechaFin=${fechaConsulta}`;
    console.log(`[PDF-TRAFFIC] 🔍 URL de consulta: ${traficoUrl}`);
    
    console.log(`[PDF-TRAFFIC] 📊 Consultando tráfico para el día ${fechaConsulta}...`);
    const traficoResponse = await fetch(traficoUrl);
    
    if (!traficoResponse.ok) {
      throw new Error(`Error al obtener datos de tráfico: ${traficoResponse.status} ${traficoResponse.statusText}`);
    }
    
    const traficoData = await traficoResponse.json();
    console.log(`[PDF-TRAFFIC] ✅ Datos de tráfico recibidos para ${fechaConsulta}:`, traficoData);
    
    // Verificar que haya datos de entradas por hora
    if (!traficoData.entradasPorHora || Object.keys(traficoData.entradasPorHora).length === 0) {
      console.warn(`[PDF-TRAFFIC] ⚠️ No hay datos de entradas para ${fechaConsulta}, generando simulados`);
      const traficoSimulado = await generarDatosTraficoSimulados(fechaConsulta, fechaConsulta);
      const recomendacionesSimuladas = calcularRecomendaciones(traficoSimulado, opcionesBase);
      
      console.log(`[PDF-TRAFFIC] 📊 Datos de tráfico SIMULADOS generados para ${fechaConsulta}`);
      imprimirEstadisticasTrafico(traficoSimulado, fechaConsulta, true);
      imprimirRecomendaciones(recomendacionesSimuladas, fechaConsulta, diaId);
      
      return {
        trafico: traficoSimulado,
        recomendaciones: recomendacionesSimuladas,
        fechaConsulta,
        simulado: true
      };
    }
    
    // Procesar datos reales de tráfico
    console.log(`[PDF-TRAFFIC] 📈 Datos de tráfico REALES para ${fechaConsulta}:`, traficoData.entradasPorHora);
    imprimirEstadisticasTrafico(traficoData.entradasPorHora, fechaConsulta, false);
    
    // Calcular recomendaciones para este día
    console.log(`[PDF-TRAFFIC] 🧮 Calculando recomendaciones para ${fechaConsulta}...`);
    const recomendacionesDia = calcularRecomendaciones(
      traficoData.entradasPorHora,
      opcionesBase
    );
    
    // Imprimir resultados de las recomendaciones
    imprimirRecomendaciones(recomendacionesDia, fechaConsulta, diaId);
    
    return {
      trafico: traficoData.entradasPorHora,
      recomendaciones: recomendacionesDia,
      fechaConsulta,
      simulado: false
    };
    
  } catch (error) {
    console.error(`[PDF-TRAFFIC] ❌ Error al procesar el día:`, error);
    console.log(`[PDF-TRAFFIC] Usando datos simulados como fallback`);
    
    // Determinar la fecha de consulta como fallback
    let fechaConsulta = '';
    let diaId = '';
    
    if (diaOFecha instanceof Date) {
      fechaConsulta = format(diaOFecha, 'yyyy-MM-dd');
      diaId = fechaConsulta;
    } else {
      // CAMBIO: Priorizar el campo 'fecha entradas' también en el manejo de errores
      fechaConsulta = diaOFecha.fields?.['fecha entradas'] || 
                    diaOFecha.fields?.['Fecha Entradas'];
      
      if (!fechaConsulta) {
        console.warn(`⚠️ [PDF-TRAFFIC] Día sin fecha de entradas definida en error handler: ${diaOFecha.fields?.Name}, usando fecha del día`);
        fechaConsulta = diaOFecha.fields?.Name || 'fecha-desconocida';
      }
      
      diaId = diaOFecha.id || fechaConsulta;
      console.log(`[PDF-TRAFFIC] En error handler - Usando fecha entradas ${fechaConsulta} para el día ${diaOFecha.fields?.Name}`);
    }
    
    // Crear opciones básicas para el cálculo
    const opcionesBase: OpcionesRecomendacion = {
      atencionDeseada: 10,
      crecimiento: 0,
      minimos: {}
    };
    
    // Generar datos simulados como fallback
    const traficoSimulado = await generarDatosTraficoSimulados(fechaConsulta, fechaConsulta);
    const recomendacionesSimuladas = calcularRecomendaciones(traficoSimulado, opcionesBase);
    
    // Imprimir estadísticas con datos simulados
    imprimirEstadisticasTrafico(traficoSimulado, fechaConsulta, true);
    imprimirRecomendaciones(recomendacionesSimuladas, fechaConsulta, diaId);
    
    return {
      trafico: traficoSimulado,
      recomendaciones: recomendacionesSimuladas,
      fechaConsulta,
      simulado: true,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Imprime estadísticas del tráfico para un día específico
 */
function imprimirEstadisticasTrafico(
  entradasPorHora: Record<string, number>,
  fechaConsulta: string,
  esDatoSimulado: boolean
): void {
  // Calcular estadísticas para este día
  const horasConEntradas = Object.entries(entradasPorHora).filter(([_, entradas]) => Number(entradas) > 0);
  const totalEntradas = horasConEntradas.reduce((sum, [_, entradas]) => sum + Number(entradas), 0);
  const promedioEntradasPorHora = horasConEntradas.length > 0 
    ? totalEntradas / horasConEntradas.length 
    : 0;
  const horaMaxEntradas = horasConEntradas.reduce(
    (max, [hora, entradas]) => Number(entradas) > Number(max[1]) ? [hora, entradas] : max, 
    ['00:00', 0]
  );
  
  // Imprimir estadísticas
  console.log('%c📊 ESTADÍSTICAS DE TRÁFICO PARA ' + fechaConsulta, 'background: #f39c12; color: white; font-size: 12px; padding: 4px;');
  console.log(`   📌 Total de entradas: ${totalEntradas}`);
  console.log(`   📌 Promedio por hora (horas con tráfico): ${promedioEntradasPorHora.toFixed(2)}`);
  console.log(`   📌 Hora pico: ${horaMaxEntradas[0]} con ${horaMaxEntradas[1]} entradas`);
  console.log(`   📌 ORIGEN DE DATOS: ${esDatoSimulado ? '⚠️ SIMULADOS' : '✅ REALES'}`);
  
  // Crear y mostrar gráfico ASCII simple de las entradas
  console.log('%c📊 GRÁFICO DE TRÁFICO', 'background: #2980b9; color: white; font-size: 12px; padding: 4px;');
  const maxBarLength = 40; // Longitud máxima de la barra
  const maxEntradas = Math.max(...Object.values(entradasPorHora).map(Number));
  
  if (maxEntradas > 0) {
    Object.entries(entradasPorHora)
      .sort(([horaA], [horaB]) => horaA.localeCompare(horaB))
      .forEach(([hora, entradas]) => {
        const numEntradas = Number(entradas);
        if (numEntradas === 0) return; // No mostrar horas sin entradas
        
        const barLength = Math.round((numEntradas / maxEntradas) * maxBarLength);
        const bar = '█'.repeat(barLength);
        console.log(`   ${hora} | ${bar} ${numEntradas}`);
      });
  } else {
    console.log('   ⚠️ No hay entradas registradas para este día');
  }
}

/**
 * Imprime los resultados de las recomendaciones calculadas
 */
function imprimirRecomendaciones(
  recomendacionesDia: any,
  fechaConsulta: string,
  diaId: string
): void {
  // Imprimir resultado de recomendaciones
  console.log(`[PDF-TRAFFIC] ✅ Recomendaciones calculadas para ${fechaConsulta}:`);
  console.log('   Parámetros utilizados:');
  console.log(`   - Atención Deseada: ${recomendacionesDia.parametros.atencionDeseada}`);
  console.log(`   - Crecimiento: ${(recomendacionesDia.parametros.crecimiento * 100).toFixed(2)}%`);
  
  // Mostrar tabla con recomendaciones por hora
  console.log('   📊 Recomendaciones por hora:');
  console.table(
    Object.entries(recomendacionesDia.recomendaciones).map(([hora, rec]: [string, any]) => ({
      Hora: hora,
      Entradas: rec.entradas,
      Recomendación: rec.recomendacion.toFixed(2),
      RedondeadoArriba: Math.ceil(rec.recomendacion)
    }))
  );
  
  // Calcular totales para las recomendaciones
  const totalRecomendaciones = Object.values(recomendacionesDia.recomendaciones)
    .reduce((sum: number, rec: any) => sum + rec.recomendacion, 0);
  const totalRedondeado = Object.values(recomendacionesDia.recomendaciones)
    .reduce((sum: number, rec: any) => sum + Math.ceil(rec.recomendacion), 0);
    
  console.log('%c📊 RESUMEN DE RECOMENDACIONES', 'background: #16a085; color: white; font-size: 12px; padding: 4px;');
  console.log(`   📌 Total personal recomendado (exacto): ${totalRecomendaciones.toFixed(2)}`);
  console.log(`   📌 Total personal recomendado (redondeado): ${totalRedondeado}`);
  console.log(`   📌 Día: ${fechaConsulta}`);
  console.log(`   📌 ID del día: ${diaId}`);
  
  console.log(`⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯`);
}

/**
 * Procesa los datos de tráfico para todos los días laborales
 */
export async function procesarTraficoParaTodosLosDias(
  diasLaborales: any[],
  tiendaId: string | number,
  opcionesBase: OpcionesRecomendacion
): Promise<{
  traficoPorDia: Record<string, Record<string, number>>;
  recomendacionesPorDia: Record<string, any>;
}> {
  console.log('%c📅 INICIANDO PROCESAMIENTO DE DÍAS LABORALES', 'background: #9b59b6; color: white; font-size: 14px; padding: 5px;');
  console.log(`[PDF-TRAFFIC] Procesando tráfico para ${diasLaborales.length} días`);
  
  // Inicializar almacenamiento para datos de tráfico por día
  const traficoPorDia: Record<string, Record<string, any>> = {};
  const recomendacionesPorDia: Record<string, any> = {};
  
  // Almacenar resultados de procesamiento de cada día
  const resultadosProcesamiento = [];
  
  // Procesar cada día laboral para obtener su fecha específica
  for (const dia of diasLaborales) {
    try {
      // Obtener y mostrar la fecha de entradas si existe
      const fechaEntradas = dia.fields?.['fecha entradas'] || dia.fields?.['Fecha Entradas'];
      const fechaOriginal = dia.fields?.Name;
      
      console.log(`[PDF-TRAFFIC] 🗓️ Procesando día: ${fechaOriginal} (ID: ${dia.id})`);
      if (fechaEntradas) {
        console.log(`[PDF-TRAFFIC] 📅 Usando fecha de entradas: ${fechaEntradas} para el día ${fechaOriginal}`);
      }
      
      const resultado = await procesarTraficoParaDia(dia, tiendaId);
      
      // Guardar los resultados indexados por ID del día y por fecha
      traficoPorDia[dia.id] = resultado.trafico;
      traficoPorDia[resultado.fechaConsulta] = resultado.trafico;
      
      recomendacionesPorDia[dia.id] = resultado.recomendaciones;
      recomendacionesPorDia[resultado.fechaConsulta] = resultado.recomendaciones;
      
      // Guardar resultados para el informe final
      resultadosProcesamiento.push({
        diaId: dia.id,
        nombre: dia.fields?.Name,
        fechaOriginal: dia.fields?.Name,
        fechaConsulta: resultado.fechaConsulta,
        simulado: resultado.simulado,
        error: resultado.error
      });
      
    } catch (error) {
      console.error(`[PDF-TRAFFIC] ❌ Error crítico al procesar el día ${dia.fields?.Name}:`, error);
      console.error('Continuando con el siguiente día...');
    }
  }
  
  // Mostrar resumen del procesamiento
  console.log('%c📊 RESUMEN DEL PROCESAMIENTO DE TRÁFICO', 'background: #2ecc71; color: white; font-size: 14px; padding: 5px;');
  console.log(`Total de días procesados: ${resultadosProcesamiento.length} de ${diasLaborales.length}`);
  
  // Mostrar tabla con resultados
  console.table(resultadosProcesamiento.map(r => ({
    'Día': r.nombre,
    'Fecha Documento': r.fechaOriginal,
    'Fecha Consultada': r.fechaConsulta,
    'Datos': r.simulado ? 'SIMULADOS' : 'REALES',
    'Estado': r.error ? '❌ ERROR' : '✅ OK'
  })));
  
  console.log('=================================================================');
  
  return { traficoPorDia, recomendacionesPorDia };
} 