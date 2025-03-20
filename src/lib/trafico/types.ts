/**
 * Tipos e interfaces para manejo de datos de tráfico y recomendaciones
 */

/**
 * Interfaz para los datos de tráfico por hora
 */
export interface TraficoHora {
  [hora: string]: number; // formato "HH:00" -> número de entradas
}

/**
 * Interfaz para los datos de tráfico diario
 */
export interface TraficoDia {
  fecha: string; // formato "YYYY-MM-DD"
  entradasPorHora: TraficoHora;
  metadatos: {
    totalEntradas: number;
    horaMaxima: string;
    entradasHoraMaxima: number;
    promedioEntradasPorHora: number;
    horasConTrafico: number;
    simulado: boolean;
  };
}

/**
 * Interfaz para los resultados de recomendación por hora
 */
export interface RecomendacionHora {
  hora: string; // formato "HH:00"
  entradas: number;
  recomendacionExacta: number;
  recomendacionRedondeada: number;
  detalles: {
    atencionDeseada: number;
    factorCrecimiento: number;
    formulaAplicada: string;
    calculoCompleto: string;
  };
}

/**
 * Interfaz para los resultados diarios de recomendación
 */
export interface RecomendacionDiaria {
  fecha: string; // formato "YYYY-MM-DD"
  diaSemana: string; // "Lunes", "Martes", etc.
  recomendacionesPorHora: RecomendacionHora[];
  metadatos: {
    totalPersonalRecomendado: number;
    totalPersonalRedondeado: number;
    horarioApertura: string;
    horarioCierre: string;
    diaLaboral: {
      id: string;
      nombre: string;
    };
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
 * Interfaz para la información básica de un empleado
 */
export interface EmpleadoBasico {
  id: string;
  nombre: string;
  dni?: string;
  horasContrato?: number;
}

/**
 * Interfaz para el horario asignado a un empleado en un día específico
 */
export interface HorarioEmpleado {
  hora: string;
  actividad: string;
}

/**
 * Interfaz para la actividad diaria completa de un empleado
 */
export interface EmpleadoActividad {
  empleado: EmpleadoBasico;
  horarioAsignado: HorarioEmpleado[];
  horasTotales: number;
  observaciones?: string;
}

/**
 * Interfaz para las actividades de empleados de un día específico
 */
export interface ActividadesEmpleadosDia {
  fecha: string;
  diaSemana: string;
  empleados: EmpleadoActividad[];
}

/**
 * Respuesta del endpoint de tráfico semanal
 */
export interface RespuestaTraficoSemanal {
  success: boolean;
  timestamp: string;
  tienda: {
    id: string;
    nombre: string;
    codigo: string;
    atencionDeseada: number;
    crecimiento: number;
  };
  semana: {
    id: string;
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
  };
  datos: {
    diasLaborales: {
      id: string;
      fecha: string;
      diaSemana: string;
      nombre: string;
      horarioApertura: string;
      horarioCierre: string;
      trafico: TraficoDia;
      recomendaciones: RecomendacionDiaria;
      empleados?: EmpleadoActividad[];
    }[];
    resumenSemanal: {
      totalEntradasSemana: number;
      totalPersonalRecomendado: number;
      totalPersonalRedondeado: number;
      promedioEntradasDiario: number;
      diaMayorTrafico: string;
      entradasDiaMayorTrafico: number;
    };
  };
  errores?: string[];
} 