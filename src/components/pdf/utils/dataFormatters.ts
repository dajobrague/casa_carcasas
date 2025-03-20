import { DiaLaboral, EmpleadoActividad, RecomendacionHora } from './types';

/**
 * Obtiene el número de empleados trabajando en una hora específica
 */
export function getEmployeesWorkingAtHour(empleados: EmpleadoActividad[], hora: string): number {
  return empleados.filter(empleado => 
    empleado.horarioAsignado.some(h => h.hora === hora && h.actividad === 'TRABAJO')
  ).length;
}

/**
 * Calcula la diferencia entre el personal recomendado y el efectivo por hora
 */
export function calculateHourlyDifference(
  recomendaciones: RecomendacionHora[], 
  empleados: EmpleadoActividad[]
): { hora: string; recomendados: number; actuales: number; diferencia: number }[] {
  return recomendaciones.map(recomendacion => {
    const empleadosTrabajando = getEmployeesWorkingAtHour(empleados, recomendacion.hora);
    
    return {
      hora: recomendacion.hora,
      recomendados: recomendacion.recomendacionRedondeada,
      actuales: empleadosTrabajando,
      diferencia: empleadosTrabajando - recomendacion.recomendacionRedondeada
    };
  });
}

/**
 * Calcula el total de horas trabajadas para todos los empleados en un día
 */
export function calculateTotalHoursWorked(empleados: EmpleadoActividad[]): number {
  return empleados.reduce((total, empleado) => total + empleado.horasTotales, 0);
}

/**
 * Agrupa las actividades de los empleados por hora
 */
export function groupActivitiesByHour(diasLaborales: DiaLaboral[]): Record<string, { 
  total: number; 
  actividades: Record<string, number> 
}> {
  const actividadesPorHora: Record<string, { 
    total: number; 
    actividades: Record<string, number> 
  }> = {};

  // Inicializar estructura
  const horasPosibles = new Set<string>();
  diasLaborales.forEach(dia => {
    dia.empleados.forEach(empleado => {
      empleado.horarioAsignado.forEach(horario => {
        horasPosibles.add(horario.hora);
      });
    });
  });

  // Crear objeto de horas
  horasPosibles.forEach(hora => {
    actividadesPorHora[hora] = {
      total: 0,
      actividades: {}
    };
  });

  // Llenar con datos
  diasLaborales.forEach(dia => {
    dia.empleados.forEach(empleado => {
      empleado.horarioAsignado.forEach(horario => {
        if (!actividadesPorHora[horario.hora].actividades[horario.actividad]) {
          actividadesPorHora[horario.hora].actividades[horario.actividad] = 0;
        }
        actividadesPorHora[horario.hora].actividades[horario.actividad]++;
        actividadesPorHora[horario.hora].total++;
      });
    });
  });

  return actividadesPorHora;
} 