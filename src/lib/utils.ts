import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Función para mezclar clases CSS con tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extrae un valor numérico de un campo de Airtable que puede ser número o array
 */
export function extraerValorNumerico(campo: any): number {
  if (Array.isArray(campo) && campo.length > 0) {
    return typeof campo[0] === 'number' ? campo[0] : 0;
  }
  if (typeof campo === 'number') {
    return campo;
  }
  if (typeof campo === 'string') {
    const parsed = parseFloat(campo);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Función para generar columnas de tiempo basadas en el país, hora de apertura y cierre
export function generarColumnasTiempo(
  pais: string | undefined,
  horaApertura: string | undefined,
  horaCierre: string | undefined
): string[] {
  try {
    const esFrancia = pais?.toUpperCase() === 'FRANCIA';
    const incremento = esFrancia ? 15 : 30; // 15 o 30 minutos
    
    // Comprobar si estamos usando el nuevo formato con múltiples intervalos
    if (horaApertura && horaApertura.includes('-')) {
      const columnas: string[] = [];
      
      // Dividir los intervalos (formato: "09:00-14:00,16:00-21:30")
      const intervalos = horaApertura.split(',');
      
      // Procesar cada intervalo
      intervalos.forEach(intervalo => {
        const [inicio, fin] = intervalo.split('-');
        if (!inicio || !fin) return;
        
        // Convertir horas de inicio y fin a minutos
        const [horaInicio, minInicio] = inicio.split(':').map(Number);
        const [horaFin, minFin] = fin.split(':').map(Number);
        
        if (isNaN(horaInicio) || isNaN(minInicio) || isNaN(horaFin) || isNaN(minFin)) return;
        
        const inicioEnMinutos = horaInicio * 60 + minInicio;
        const finEnMinutos = horaFin * 60 + minFin;
        
        // El fin real es -incremento porque el último incremento será cierre-incremento
        const finRealEnMinutos = finEnMinutos - incremento;
        
        // Generar columnas solo para este intervalo
        for (let minutoActual = inicioEnMinutos; minutoActual <= finRealEnMinutos; minutoActual += incremento) {
          const hora = Math.floor(minutoActual / 60);
          const minuto = minutoActual % 60;
          
          const horaStr = hora.toString().padStart(2, '0');
          const minutoStr = minuto.toString().padStart(2, '0');
          columnas.push(`${horaStr}:${minutoStr}`);
        }
      });
      
      return columnas;
    }
    
    // Código existente para el formato antiguo (compatibilidad)
    // Valores por defecto
    let apertura = 9; // Valor por defecto: 9:00
    let aperturaMinutos = 0;
    let cierre = 21;  // Valor por defecto: 21:00
    let cierreMinutos = 0;
    
    // Intentar parsear hora de apertura
    if (horaApertura && typeof horaApertura === 'string') {
      const partes = horaApertura.split(':');
      if (partes.length > 0) {
        const horaParseada = parseInt(partes[0], 10);
        if (!isNaN(horaParseada) && horaParseada >= 0 && horaParseada <= 23) {
          apertura = horaParseada;
        }
        
        // Parseamos también los minutos si están disponibles
        if (partes.length > 1) {
          const minutosParseados = parseInt(partes[1], 10);
          if (!isNaN(minutosParseados) && minutosParseados >= 0 && minutosParseados < 60) {
            aperturaMinutos = minutosParseados;
          }
        }
      }
    }
    
    // Intentar parsear hora de cierre
    if (horaCierre && typeof horaCierre === 'string') {
      const partes = horaCierre.split(':');
      if (partes.length > 0) {
        const horaParseada = parseInt(partes[0], 10);
        if (!isNaN(horaParseada) && horaParseada >= 0 && horaParseada <= 23) {
          cierre = horaParseada;
        }
        
        // Parseamos también los minutos si están disponibles
        if (partes.length > 1) {
          const minutosParseados = parseInt(partes[1], 10);
          if (!isNaN(minutosParseados) && minutosParseados >= 0 && minutosParseados < 60) {
            cierreMinutos = minutosParseados;
          }
        }
      }
    }
    
    // Asegurarse de que apertura sea menor que cierre
    if (apertura > cierre || (apertura === cierre && aperturaMinutos >= cierreMinutos)) {
      apertura = 9;
      aperturaMinutos = 0;
      cierre = 21;
      cierreMinutos = 0;
    }
    
    const columnas: string[] = [];
    
    // Convertir todo a minutos para facilitar el cálculo
    const aperturaEnMinutos = apertura * 60 + aperturaMinutos;
    const cierreEnMinutos = cierre * 60 + cierreMinutos;
    
    // Encontrar el último incremento completo antes del cierre
    const ultimoIncrementoEnMinutos = Math.floor((cierreEnMinutos - incremento) / incremento) * incremento;
    
    // Generar todas las columnas de tiempo desde la apertura hasta el último incremento completo
    for (let minutoActual = aperturaEnMinutos; minutoActual <= ultimoIncrementoEnMinutos; minutoActual += incremento) {
      // Redondear al incremento más cercano para asegurar valores consistentes
      const minutoRedondeado = Math.floor(minutoActual / incremento) * incremento;
      
      // Calcular hora y minutos
      const hora = Math.floor(minutoRedondeado / 60);
      const minuto = minutoRedondeado % 60;
      
      // Formatear y agregar a las columnas
      const horaStr = hora.toString().padStart(2, '0');
      const minutoStr = minuto.toString().padStart(2, '0');
      columnas.push(`${horaStr}:${minutoStr}`);
    }
    
    return columnas;
  } catch (error) {
    console.error('Error al generar columnas de tiempo:', error);
    // Devolver un conjunto básico de horas en caso de error
    return ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
            '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', 
            '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
  }
}

/**
 * Calcula las horas efectivas diarias basadas en las actividades registradas.
 * 
 * La lógica de cálculo es la siguiente:
 * - Actividades que SUMAN horas efectivas: TRABAJO, FORMACIÓN
 * - Actividades que RESTAN horas efectivas: BAJA MÉDICA
 * - Actividades NEUTRAS (no afectan): VACACIONES, LIBRE, LACTANCIA
 * 
 * El cálculo se ajusta según el país de la tienda:
 * - Francia: incrementos de 15 minutos (0.25 horas)
 * - Otros países: incrementos de 30 minutos (0.5 horas)
 * 
 * @param actividades - Array de actividades diarias con sus estados por cada intervalo horario
 * @param tiendaData - Datos de la tienda con país y horarios de apertura/cierre
 * @returns Número total de horas efectivas (nunca negativo)
 */
export function calcularHorasEfectivasDiarias(
  actividades: any[],
  tiendaData: { PAIS?: string; Apertura?: string; Cierre?: string }
): number {
  try {
    // Verificar que actividades sea un array válido
    if (!actividades || !Array.isArray(actividades) || actividades.length === 0) {
      return 0;
    }
    
    const esFrancia = tiendaData.PAIS?.toUpperCase() === 'FRANCIA';
    const incrementoPorHora = esFrancia ? 0.25 : 0.5; // 15 o 30 minutos
    
    // Obtener todas las horas disponibles
    const horasDisponibles = generarColumnasTiempo(
      tiendaData.PAIS,
      tiendaData.Apertura,
      tiendaData.Cierre
    );
    
    let horasTotales = 0;
    
    // Para cada actividad (empleado)
    actividades.forEach(actividad => {
      // Verificar que la actividad tenga campos
      if (!actividad || !actividad.fields) return;
      
      // Para cada hora disponible
      horasDisponibles.forEach(hora => {
        // Tipos de actividades que cuentan como horas efectivas:
        // - TRABAJO: suma horas
        // - FORMACIÓN: suma horas
        // - BAJA MÉDICA: resta horas
        if (actividad.fields[hora] === 'TRABAJO' || actividad.fields[hora] === 'FORMACIÓN') {
          horasTotales += incrementoPorHora;
        } else if (actividad.fields[hora] === 'BAJA MÉDICA') {
          horasTotales -= incrementoPorHora;
        }
        // El resto de actividades (VACACIONES, LIBRE, LACTANCIA) no afectan al cálculo
      });
    });
    
    // Asegurarnos de que el valor no sea negativo
    return Math.max(0, horasTotales);
  } catch (error) {
    console.error('Error al calcular horas efectivas diarias:', error);
    return 0;
  }
}

/**
 * Calcula las horas extra (Horas +) y horas menos (Horas -) para un empleado específico
 * basándose en sus horarios asignados en tiempo real.
 * 
 * @param actividad - Actividad/empleado individual
 * @param horasContrato - Horas de contrato del empleado
 * @param tiendaData - Datos de la tienda con país y horarios
 * @returns Objeto con horasPlus y horasMinus calculadas
 */
export function calcularHorasPlusEmpleado(
  actividad: any,
  horasContrato: number,
  tiendaData: { PAIS?: string; Apertura?: string; Cierre?: string }
): { horasPlus: number } {
  try {
    // Verificar datos válidos
    if (!actividad || !actividad.fields || typeof horasContrato !== 'number') {
      return { horasPlus: 0 };
    }
    
    const esFrancia = tiendaData.PAIS?.toUpperCase() === 'FRANCIA';
    const incrementoPorHora = esFrancia ? 0.25 : 0.5; // 15 o 30 minutos
    
    // Obtener todas las horas disponibles
    const horasDisponibles = generarColumnasTiempo(
      tiendaData.PAIS,
      tiendaData.Apertura,
      tiendaData.Cierre
    );
    
    let horasTrabajadas = 0;
    let horasFormacion = 0;
    let horasBajaMedica = 0;
    
    // Contar horas por tipo de actividad
    horasDisponibles.forEach(hora => {
      const tipoActividad = actividad.fields[hora];
      
      if (tipoActividad === 'TRABAJO') {
        horasTrabajadas += incrementoPorHora;
      } else if (tipoActividad === 'FORMACIÓN') {
        horasFormacion += incrementoPorHora;
      } else if (tipoActividad === 'BAJA MÉDICA') {
        horasBajaMedica += incrementoPorHora;
      }
    });
    
    // Calcular total de horas productivas (trabajo + formación)
    const horasProductivas = horasTrabajadas + horasFormacion;
    
    // Calcular diferencia respecto al contrato para Horas +
    const diferencia = horasProductivas - horasContrato;
    
    // Calcular Horas + (solo si hay horas extra)
    const horasPlus = Math.max(0, diferencia) + horasBajaMedica;
    

    
    return {
      horasPlus: Math.max(0, horasPlus)
    };
    
  } catch (error) {
    console.error('Error al calcular horas plus:', error);
    return { horasPlus: 0 };
  }
}

// Función para obtener clases CSS según el estado
export function getOptionClasses(estado: string | undefined): string {
  const baseClasses = 'w-full h-8 rounded transition-colors duration-300';
  switch (estado?.toUpperCase()) {
    case 'TRABAJO': return `${baseClasses} bg-green-100 text-green-800`;
    case 'VACACIONES': return `${baseClasses} bg-blue-100 text-blue-800`;
    case 'LIBRE': return `${baseClasses} bg-red-100 text-red-800`;
    case 'BAJA MÉDICA': return `${baseClasses} bg-purple-100 text-purple-800`;
    case 'FORMACIÓN': return `${baseClasses} bg-orange-100 text-orange-800`;
    case 'LACTANCIA': return `${baseClasses} bg-pink-100 text-pink-800`;
    default: return `${baseClasses} bg-gray-50 text-gray-800`;
  }
}

// Función para obtener el color de fondo según el estado
export function getBackgroundColor(estado: string | undefined): string {
  switch (estado?.toUpperCase()) {
    case 'TRABAJO': return 'bg-green-100';
    case 'VACACIONES': return 'bg-blue-100';
    case 'LIBRE': return 'bg-red-100';
    case 'BAJA MÉDICA': return 'bg-purple-100';
    case 'FORMACIÓN': return 'bg-orange-100';
    case 'LACTANCIA': return 'bg-pink-100';
    default: return 'bg-gray-50';
  }
}

// Función para obtener el color de texto según el estado
export function getTextColor(estado: string | undefined): string {
  switch (estado?.toUpperCase()) {
    case 'TRABAJO': return 'text-green-800';
    case 'VACACIONES': return 'text-blue-800';
    case 'LIBRE': return 'text-red-800';
    case 'BAJA MÉDICA': return 'text-purple-800';
    case 'FORMACIÓN': return 'text-orange-800';
    case 'LACTANCIA': return 'text-pink-800';
    default: return 'text-gray-800';
  }
}

// Función para mostrar notificaciones
export function mostrarNotificacion(
  mensaje: string, 
  tipo: 'success' | 'error',
  duracion: number = 3000
): void {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `
    fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 
    ${tipo === 'success' ? 'bg-green-100 border-l-4 border-green-500 text-green-700' : 
                          'bg-red-100 border-l-4 border-red-500 text-red-700'}
  `;
  
  notification.innerHTML = `
    <div class="flex items-center">
      <div class="flex-shrink-0">
        ${tipo === 'success' ? 
          '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' :
          '<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'
        }
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium">${mensaje}</p>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Eliminar después de la duración especificada
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, duracion);
}

// Funciones para el cálculo y visualización de datos de tráfico por hora

// Interfaz para datos de tráfico
export interface DatosTraficoDia {
  horas: Record<string, number>;
  totalMañana: number;
  totalTarde: number;
  datosPorDia?: {
    lunes: Record<string, number>;
    martes: Record<string, number>;
    miercoles: Record<string, number>;
    jueves: Record<string, number>;
    viernes: Record<string, number>;
    sabado: Record<string, number>;
    domingo: Record<string, number>;
  };
  fechaInicio?: string;
  fechaFin?: string;
}

// Función para obtener color según intensidad de tráfico
export function obtenerColorIntensidadTrafico(porcentaje: number): string {
  // Asegurarse de que el porcentaje sea un número válido
  if (typeof porcentaje !== 'number' || isNaN(porcentaje)) {
    return '#bfdbfe'; // Valor por defecto (azul claro)
  }
  
  // Limitar el porcentaje entre 0 y 100
  const porcentajeSeguro = Math.max(0, Math.min(100, porcentaje));
  
  if (porcentajeSeguro < 30) return '#bfdbfe'; // Azul claro
  if (porcentajeSeguro < 60) return '#93c5fd'; // Azul medio
  if (porcentajeSeguro < 80) return '#60a5fa'; // Azul
  return '#3b82f6'; // Azul intenso
}

// Función para calcular personal estimado por hora
export function calcularPersonalEstimado(
  datosTraficoDia: DatosTraficoDia | null,
  horarios: string[],
  atencionDeseada: number = 10, // Clientes por empleado por hora
  crecimiento: number = 0.05 // 5% de crecimiento por defecto
): { estimado: number[] } {
  const estimado: number[] = [];
  
  // Si no hay datos de tráfico, devolver valores por defecto
  if (!datosTraficoDia || !datosTraficoDia.horas) {
    horarios.forEach(() => estimado.push(1));
    return { estimado };
  }
  
  // Calcular atención media (personas atendidas por empleado por hora)
  const atencionMedia = atencionDeseada / 2;
  
  horarios.forEach((hora) => {
    // Obtener entradas para esta hora y asegurarse de que sea un número
    const entradasHora = typeof datosTraficoDia.horas[hora] === 'number' 
      ? datosTraficoDia.horas[hora] 
      : 0;
    
    // Aplicar fórmula: (Entradas * (1 + Crecimiento))/(Atención Deseada/2)
    const resultadoFormula = (entradasHora * (1 + crecimiento)) / atencionMedia;
    const resultado = Math.max(Math.round(resultadoFormula), 1); // Mínimo 1
    
    estimado.push(resultado);
  });
  
  return { estimado };
}

// Función para generar datos de tráfico de ejemplo (para demostración)
export function generarDatosTraficoEjemplo(horarios: string[]): DatosTraficoDia {
  const horas: Record<string, number> = {};
  let totalMañana = 0;
  let totalTarde = 0;
  
  if (!horarios || !Array.isArray(horarios) || horarios.length === 0) {
    return {
      horas: {},
      totalMañana: 0,
      totalTarde: 0
    };
  }
  
  // Crear estructura para datos por día
  const datosPorDia = {
    lunes: {} as Record<string, number>,
    martes: {} as Record<string, number>,
    miercoles: {} as Record<string, number>,
    jueves: {} as Record<string, number>,
    viernes: {} as Record<string, number>,
    sabado: {} as Record<string, number>,
    domingo: {} as Record<string, number>
  };
  
  // Datos de ejemplo basados en la imagen
  const datosEjemplo: Record<string, Record<string, number>> = {
    "10:00": { lunes: 8, martes: 4, miercoles: 11, jueves: 4, viernes: 16, sabado: 19, domingo: 6 },
    "11:00": { lunes: 12, martes: 34, miercoles: 11, jueves: 5, viernes: 28, sabado: 26, domingo: 15 },
    "12:00": { lunes: 26, martes: 13, miercoles: 16, jueves: 16, viernes: 15, sabado: 45, domingo: 14 },
    "13:00": { lunes: 32, martes: 15, miercoles: 15, jueves: 16, viernes: 16, sabado: 29, domingo: 21 },
    "14:00": { lunes: 22, martes: 7, miercoles: 7, jueves: 11, viernes: 15, sabado: 25, domingo: 31 },
    "15:00": { lunes: 12, martes: 24, miercoles: 8, jueves: 19, viernes: 37, sabado: 42, domingo: 25 },
    "16:00": { lunes: 12, martes: 23, miercoles: 9, jueves: 28, viernes: 24, sabado: 47, domingo: 48 },
    "17:00": { lunes: 33, martes: 12, miercoles: 24, jueves: 13, viernes: 37, sabado: 29, domingo: 21 },
    "18:00": { lunes: 17, martes: 27, miercoles: 15, jueves: 21, viernes: 29, sabado: 50, domingo: 45 },
    "19:00": { lunes: 11, martes: 18, miercoles: 11, jueves: 24, viernes: 18, sabado: 61, domingo: 34 },
    "20:00": { lunes: 10, martes: 13, miercoles: 16, jueves: 24, viernes: 18, sabado: 35, domingo: 21 },
    "21:00": { lunes: 9, martes: 2, miercoles: 9, jueves: 6, viernes: 27, sabado: 20, domingo: 23 }
  };
  
  // Filtrar solo las horas que están en nuestros horarios
  const horasSimplificadas = horarios.map(h => h.substring(0, 5)).filter((h, i, arr) => {
    // Solo mantener horas completas (00 minutos)
    return h.endsWith(':00') && arr.indexOf(h) === i;
  });
  
  // Llenar los datos por día y calcular totales
  horasSimplificadas.forEach(hora => {
    if (datosEjemplo[hora]) {
      Object.entries(datosEjemplo[hora]).forEach(([dia, valor]) => {
        // Asegurarse de que dia es una clave válida
        if (dia in datosPorDia) {
          datosPorDia[dia as keyof typeof datosPorDia][hora] = valor;
          
          // Acumular en horas (promedio de todos los días)
          horas[hora] = horas[hora] || 0;
          horas[hora] += valor;
          
          // Acumular totales
          const horaNum = parseInt(hora.split(':')[0], 10);
          if (horaNum < 14) {
            totalMañana += valor;
          } else {
            totalTarde += valor;
          }
        }
      });
      
      // Calcular promedio para las horas
      horas[hora] = Math.round(horas[hora] / 7);
    }
  });
  
  // Calcular totales reales
  totalMañana = Math.round(totalMañana / 7);
  totalTarde = Math.round(totalTarde / 7);
  
  return {
    horas,
    totalMañana,
    totalTarde,
    datosPorDia,
    fechaInicio: "27/01/2024",
    fechaFin: "02/02/2024"
  };
}

/**
 * Calcula las horas efectivas semanales para una semana específica
 * 
 * @param diasIds - Array de IDs de días laborales de la semana
 * @param storeRecordId - ID de la tienda para obtener datos
 * @returns Promesa que resuelve con las horas efectivas totales de la semana
 */
export async function calcularHorasEfectivasSemanales(
  diasIds: string[],
  storeRecordId: string
): Promise<number> {
  try {
    if (!diasIds || diasIds.length === 0 || !storeRecordId) {
      return 0;
    }

    // Importar funciones de Airtable dinámicamente para evitar problemas de importación circular
    const { obtenerDatosTienda, obtenerActividadesDiarias } = await import('@/lib/airtable');

    // Obtener datos de la tienda para los parámetros de cálculo
    const tiendaData = await obtenerDatosTienda(storeRecordId);
    if (!tiendaData) {
      console.error('No se pudieron obtener datos de la tienda');
      return 0;
    }

    let horasEfectivasTotal = 0;

    // Para cada día, obtener sus actividades y calcular horas efectivas
    for (const diaId of diasIds) {
      try {
        const actividades = await obtenerActividadesDiarias(storeRecordId, diaId);
        
        // Calcular horas efectivas para este día
        const horasEfectivasDia = calcularHorasEfectivasDiarias(
          actividades,
          {
            PAIS: tiendaData.fields.PAIS,
            Apertura: tiendaData.fields.Apertura,
            Cierre: tiendaData.fields.Cierre
          }
        );

        horasEfectivasTotal += horasEfectivasDia;
        

      } catch (error) {
        console.error(`Error al procesar día ${diaId}:`, error);
        // Continuar con el siguiente día en caso de error
      }
    }


    return horasEfectivasTotal;
    
  } catch (error) {
    console.error('Error al calcular horas efectivas semanales:', error);
    return 0;
  }
}

/**
 * Obtiene las horas efectivas semanales de una semana específica mediante su ID
 * 
 * @param semanaId - ID de la semana en Airtable
 * @param storeRecordId - ID de la tienda
 * @returns Promesa que resuelve con las horas efectivas totales de la semana
 */
export async function obtenerHorasEfectivasSemanaPorId(
  semanaId: string,
  storeRecordId: string
): Promise<number> {
  try {
    if (!semanaId || !storeRecordId) {
      return 0;
    }

    // Importar función dinámicamente
    const { obtenerSemanaPorId } = await import('@/lib/airtable');
    
    const semanaData = await obtenerSemanaPorId(semanaId);
    if (!semanaData || !semanaData.fields['Dias Laborales']) {
      console.error('No se encontraron días laborales para la semana:', semanaId);
      return 0;
    }

    const diasIds = semanaData.fields['Dias Laborales'];
    return await calcularHorasEfectivasSemanales(diasIds, storeRecordId);
    
  } catch (error) {
    console.error('Error al obtener horas efectivas de la semana:', error);
    return 0;
  }
} 