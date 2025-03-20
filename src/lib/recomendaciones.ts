/**
 * Módulo para generar recomendaciones de personal basadas en datos de tráfico
 */

/**
 * Interfaz para los datos de tráfico por hora
 */
export interface TraficoHora {
  [hora: string]: number; // formato "HH:00" -> número de entradas
}

/**
 * Interfaz para los resultados de recomendación por hora
 */
export interface RecomendacionHora {
  entradas: number;
  recomendacion: number;
  detalles: {
    formula: string;
    factor: string;
    divisor: string;
    calculoCompleto: string;
  };
}

/**
 * Opciones para el cálculo de recomendaciones
 */
export interface OpcionesRecomendacion {
  atencionDeseada: number;
  crecimiento: number;
  horarioApertura?: string; // formato "HH:MM" - opcional
  horarioCierre?: string; // formato "HH:MM" - opcional
  redondear?: boolean; // Si se debe redondear al entero más cercano
  mostrarDetalles?: boolean; // Si se deben incluir los detalles del cálculo
  minimos?: { [hora: string]: number }; // Mínimos por hora si es necesario
}

/**
 * Interfaz para los resultados de recomendaciones
 */
export interface ResultadosRecomendacion {
  recomendaciones: { [hora: string]: RecomendacionHora };
  parametros: {
    atencionDeseada: number;
    crecimiento: number;
    horaApertura?: string;
    horaCierre?: string;
  };
}

/**
 * Calcula recomendaciones de personal basadas en datos de tráfico y parámetros de la tienda
 * @param trafico - Datos de tráfico por hora (entradas)
 * @param opciones - Opciones para el cálculo
 * @returns Objeto con las recomendaciones calculadas
 */
export function calcularRecomendaciones(
  trafico: TraficoHora,
  opciones: OpcionesRecomendacion
): ResultadosRecomendacion {
  // Validar opciones y establecer valores por defecto
  const atencionDeseada = opciones.atencionDeseada || 25;
  const crecimiento = opciones.crecimiento || 0;
  const redondear = opciones.redondear !== undefined ? opciones.redondear : false;
  const mostrarDetalles = opciones.mostrarDetalles !== undefined ? opciones.mostrarDetalles : true;
  
  // Extraer horas de apertura y cierre si están disponibles
  let horaApertura: string | undefined;
  let horaCierre: string | undefined;
  
  if (opciones.horarioApertura && opciones.horarioCierre) {
    horaApertura = opciones.horarioApertura;
    horaCierre = opciones.horarioCierre;
  }
  
  // Inicializar resultados
  const recomendaciones: { [hora: string]: RecomendacionHora } = {};
  
  // Calcular para cada hora en los datos de tráfico
  for (const [hora, entradas] of Object.entries(trafico)) {
    // Validar que tenemos entradas válidas
    if (entradas === undefined || entradas === null || isNaN(entradas)) {
      continue;
    }
    
    // Aplicar fórmula: (Entradas * (1 + Crecimiento)) / (Atención Deseada / 2)
    const factor = 1 + crecimiento;
    const divisor = atencionDeseada / 2;
    let recomendacion = (entradas * factor) / divisor;
    
    // Aplicar redondeo si es necesario
    if (redondear) {
      recomendacion = Math.round(recomendacion);
    } else {
      // Redondear a 2 decimales para mayor claridad
      recomendacion = Math.round(recomendacion * 100) / 100;
    }
    
    // Aplicar mínimos por hora si están definidos
    if (opciones.minimos && opciones.minimos[hora] !== undefined) {
      const minimo = opciones.minimos[hora];
      if (recomendacion < minimo) {
        recomendacion = minimo;
      }
    }
    
    // Crear objeto de recomendación
    const recomendacionObj: RecomendacionHora = {
      entradas,
      recomendacion,
      detalles: {
        formula: `(${entradas} * (1 + ${(crecimiento * 100).toFixed(2)}%)) / (${atencionDeseada} / 2)`,
        factor: factor.toFixed(2),
        divisor: divisor.toFixed(2),
        calculoCompleto: `(${entradas} * ${factor.toFixed(2)}) / ${divisor.toFixed(2)} = ${recomendacion}`
      }
    };
    
    recomendaciones[hora] = recomendacionObj;
  }
  
  return {
    recomendaciones,
    parametros: {
      atencionDeseada,
      crecimiento,
      horaApertura,
      horaCierre
    }
  };
}

/**
 * Filtra las recomendaciones para incluir solo las horas dentro del horario de apertura
 * @param resultados - Resultados de las recomendaciones
 * @param horaApertura - Hora de apertura (formato "HH:MM")
 * @param horaCierre - Hora de cierre (formato "HH:MM")
 * @returns Resultados filtrados
 */
export function filtrarRecomendacionesPorHorario(
  resultados: ResultadosRecomendacion,
  horaApertura: string,
  horaCierre: string
): ResultadosRecomendacion {
  // Convertir horas a números para comparación
  const aperturaHora = parseInt(horaApertura.split(':')[0]);
  const cierreHora = parseInt(horaCierre.split(':')[0]);
  
  // Filtrar recomendaciones
  const recomendacionesFiltradas: { [hora: string]: RecomendacionHora } = {};
  
  for (const [hora, recomendacion] of Object.entries(resultados.recomendaciones)) {
    const horaNum = parseInt(hora.split(':')[0]);
    
    // Solo incluir horas dentro del horario de apertura
    if (horaNum >= aperturaHora && horaNum < cierreHora) {
      recomendacionesFiltradas[hora] = recomendacion;
    }
  }
  
  // Actualizar parámetros
  return {
    recomendaciones: recomendacionesFiltradas,
    parametros: {
      ...resultados.parametros,
      horaApertura,
      horaCierre
    }
  };
}

/**
 * Función para generar datos de tráfico de prueba
 * @param fechaInicio - Fecha de inicio (YYYY-MM-DD)
 * @param fechaFin - Fecha de fin (YYYY-MM-DD)
 * @returns Datos de tráfico simulados
 */
export function generarDatosTraficoSimulados(
  fechaInicio: string,
  fechaFin: string
): TraficoHora {
  // Generar datos de prueba para entradas por hora
  const entradasPorHora: TraficoHora = {};
  
  // Patrón de tráfico diario (promedio)
  const patronHorario: { [hora: number]: number } = {
    9: 15,  // 9:00 AM - 15 entradas por hora
    10: 25, // 10:00 AM - 25 entradas por hora
    11: 35, // 11:00 AM - 35 entradas por hora
    12: 45, // 12:00 PM - 45 entradas por hora
    13: 50, // 1:00 PM - 50 entradas por hora
    14: 40, // 2:00 PM - 40 entradas por hora
    15: 30, // 3:00 PM - 30 entradas por hora
    16: 35, // 4:00 PM - 35 entradas por hora
    17: 45, // 5:00 PM - 45 entradas por hora
    18: 50, // 6:00 PM - 50 entradas por hora
    19: 40, // 7:00 PM - 40 entradas por hora
    20: 25  // 8:00 PM - 25 entradas por hora
  };
  
  // Para cada hora del día, generar un valor de tráfico
  for (const hora in patronHorario) {
    const valorBase = patronHorario[parseInt(hora)];
    
    // Agregar alguna variación aleatoria (±20%)
    const variacion = (Math.random() - 0.5) * 0.4; // Entre -0.2 y 0.2
    const valorConVariacion = Math.round(valorBase * (1 + variacion));
    
    // Guardar el valor para esta hora (formato "HH:00")
    const horaFormateada = `${hora.padStart(2, '0')}:00`;
    entradasPorHora[horaFormateada] = valorConVariacion;
  }
  
  return entradasPorHora;
} 