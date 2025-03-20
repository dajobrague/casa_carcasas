import { TraficoHora, RecomendacionHora, RecomendacionDiaria, OpcionesRecomendacion, TraficoDia } from './types';
import logger from '@/lib/logger';

/**
 * Calcula la recomendación de personal para una hora específica
 * @param hora Hora en formato "HH:00"
 * @param entradas Número de entradas registradas en esa hora
 * @param opciones Opciones para el cálculo
 * @returns Objeto con los detalles de la recomendación
 */
export function calcularRecomendacionParaHora(
  hora: string,
  entradas: number,
  opciones: OpcionesRecomendacion
): RecomendacionHora {
  // Validar entradas
  if (entradas === undefined || entradas === null || isNaN(entradas)) {
    logger.warn(`Entradas no válidas para hora ${hora}: ${entradas}`);
    entradas = 0;
  }
  
  // Extraer opciones con valores por defecto
  const atencionDeseada = opciones.atencionDeseada || 25;
  
  // El factor de crecimiento viene como decimal (ej: 0.15 para 15%)
  // Multiplicamos por 100 para obtener el porcentaje para los cálculos
  const factorCrecimiento = (opciones.crecimiento || 0);
  const factorCrecimientoPorcentaje = factorCrecimiento * 100;
  
  const redondear = opciones.redondear !== undefined ? opciones.redondear : true;
  
  // Aplicar fórmula: (Entradas * (1 + Crecimiento)) / (Atención Deseada / 2)
  const factorMultiplicador = 1 + factorCrecimiento;
  const divisor = atencionDeseada / 2;
  const recomendacionExacta = entradas * factorMultiplicador / divisor;
  
  // Aplicar redondeo si es necesario
  const recomendacionRedondeada = redondear 
    ? Math.round(recomendacionExacta) 
    : Math.round(recomendacionExacta * 100) / 100;
  
  // Aplicar mínimos por hora si están definidos
  let recomendacionFinal = recomendacionRedondeada;
  let aplicoMinimo = false;
  
  if (opciones.minimos && opciones.minimos[hora] !== undefined) {
    const minimo = opciones.minimos[hora];
    if (recomendacionFinal < minimo) {
      recomendacionFinal = minimo;
      aplicoMinimo = true;
    }
  }
  
  // Construir el detalle de la fórmula para transparencia
  const formulaAplicada = `(${entradas} * (1 + ${factorCrecimientoPorcentaje.toFixed(2)}%)) / (${atencionDeseada} / 2)`;
  const calculoCompleto = aplicoMinimo 
    ? `(${entradas} * ${factorMultiplicador.toFixed(2)}) / ${divisor.toFixed(2)} = ${recomendacionExacta.toFixed(2)} → ${recomendacionRedondeada} → [mínimo aplicado] ${recomendacionFinal}` 
    : `(${entradas} * ${factorMultiplicador.toFixed(2)}) / ${divisor.toFixed(2)} = ${recomendacionExacta.toFixed(2)} → ${recomendacionRedondeada}`;
  
  // Crear objeto de recomendación
  const recomendacion: RecomendacionHora = {
    hora,
    entradas,
    recomendacionExacta: recomendacionExacta,
    recomendacionRedondeada: recomendacionFinal,
    detalles: {
      atencionDeseada,
      factorCrecimiento,
      formulaAplicada,
      calculoCompleto
    }
  };
  
  return recomendacion;
}

/**
 * Calcula recomendaciones para todas las horas de tráfico en un día
 * @param traficoDia Datos de tráfico del día
 * @param opciones Opciones para el cálculo
 * @param diaLaboral Información adicional del día laboral
 * @returns Objeto con las recomendaciones diarias
 */
export function calcularRecomendacionesDelDia(
  traficoDia: TraficoDia,
  opciones: OpcionesRecomendacion,
  diaLaboral: { id: string; fecha: string; diaSemana: string; nombre: string; horarioApertura: string; horarioCierre: string }
): RecomendacionDiaria {
  // Establecer opciones con valores por defecto
  const opcionesCompletas: OpcionesRecomendacion = {
    atencionDeseada: opciones.atencionDeseada || 25,
    crecimiento: opciones.crecimiento || 0,
    horarioApertura: opciones.horarioApertura || diaLaboral.horarioApertura || '09:00',
    horarioCierre: opciones.horarioCierre || diaLaboral.horarioCierre || '21:00',
    redondear: opciones.redondear !== undefined ? opciones.redondear : true,
    mostrarDetalles: opciones.mostrarDetalles !== undefined ? opciones.mostrarDetalles : true,
    minimos: opciones.minimos || {}
  };
  
  console.log(`Procesando recomendaciones para ${diaLaboral.fecha} - Horario: ${opcionesCompletas.horarioApertura} a ${opcionesCompletas.horarioCierre}`);
  
  const recomendacionesPorHora: RecomendacionHora[] = [];
  let totalPersonalRecomendado = 0;
  let totalPersonalRedondeado = 0;
  let horasOmitidas = 0;
  
  // Filtrar horas que están dentro del horario de apertura
  const horaApertura = parseInt(opcionesCompletas.horarioApertura?.split(':')[0] || '9');
  const horaCierre = parseInt(opcionesCompletas.horarioCierre?.split(':')[0] || '21');
  
  // Calcular recomendación para cada hora con tráfico
  for (const [hora, entradas] of Object.entries(traficoDia.entradasPorHora)) {
    const horaActual = parseInt(hora.split(':')[0]);
    
    // Solo incluir horas dentro del horario de apertura
    if (horaActual >= horaApertura && horaActual < horaCierre) {
      const recomendacion = calcularRecomendacionParaHora(hora, entradas, opcionesCompletas);
      recomendacionesPorHora.push(recomendacion);
      
      totalPersonalRecomendado += recomendacion.recomendacionExacta;
      totalPersonalRedondeado += recomendacion.recomendacionRedondeada;
    } else {
      horasOmitidas++;
    }
  }
  
  // Ordenar recomendaciones por hora
  recomendacionesPorHora.sort((a, b) => a.hora.localeCompare(b.hora));
  
  console.log(`Día ${diaLaboral.fecha}: ${recomendacionesPorHora.length} horas procesadas, ${Math.round(totalPersonalRedondeado)} personal recomendado`);
  
  // Construir y devolver objeto de recomendación diaria
  const recomendacionDiaria: RecomendacionDiaria = {
    fecha: traficoDia.fecha,
    diaSemana: diaLaboral.diaSemana,
    recomendacionesPorHora,
    metadatos: {
      totalPersonalRecomendado: opcionesCompletas.redondear ? Math.round(totalPersonalRecomendado) : parseFloat(totalPersonalRecomendado.toFixed(2)),
      totalPersonalRedondeado: Math.round(totalPersonalRedondeado * 100) / 100,
      horarioApertura: opcionesCompletas.horarioApertura || '09:00',
      horarioCierre: opcionesCompletas.horarioCierre || '21:00',
      diaLaboral: {
        id: diaLaboral.id,
        nombre: diaLaboral.nombre
      }
    }
  };
  
  return recomendacionDiaria;
} 