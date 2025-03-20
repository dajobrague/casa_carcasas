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
  diaSemana: string; // "Lunes", "Martes", etc.
  nombre: string; // Pueden tener nombres personalizados
  horarioApertura: string; // formato "HH:MM"
  horarioCierre: string; // formato "HH:MM"
  semanasLaborales?: string[]; // IDs de las semanas laborales asociadas
} 