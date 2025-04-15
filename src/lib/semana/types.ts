/**
 * Tipos e interfaces para manejo de datos de semanas y días laborales
 */

/**
 * Interfaz para los datos básicos de una semana laboral
 */
export interface SemanaLaboral {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  año: string;
  mes: string;
  diasLaborales?: string[]; // IDs de los días laborales asociados
}

/**
 * Interfaz para los datos de un día laboral
 */
export interface DiaLaboral {
  id: string;
  fecha: string; // formato "YYYY-MM-DD"
  fechaTrafico?: string; // Fecha a usar para consultar datos de tráfico (puede ser de un año anterior)
  diaSemana: string; // "Lunes", "Martes", etc.
  nombre: string; // Pueden tener nombres personalizados
  horarioApertura?: string;  // Ahora opcional
  horarioCierre?: string;    // Ahora opcional
  semanasLaborales: string[]; // IDs de las semanas laborales asociadas
} 