// Funciones auxiliares para manejo de fechas y horas

/**
 * Formatea una fecha en formato legible
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  // Comprobar si la fecha está en formato YYYY-MM-DD
  const esFormatoFechaValido = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  if (esFormatoFechaValido) {
    // Crear fecha con UTC al mediodía para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-').map(Number);
    const fecha = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    
    // Formatear la fecha usando toLocaleDateString
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC' // Importante: usar UTC para evitar desplazamientos de día
    });
  } else {
    // Si no es formato YYYY-MM-DD, usar el constructor normal como fallback
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}

/**
 * Devuelve el nombre del día en español
 */
export function getDayName(dayName: string): string {
  // Si ya está en español, devolverlo directamente
  const spanishDays = [
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  ];
  
  if (spanishDays.includes(dayName)) {
    return dayName;
  }
  
  // Si está en inglés, traducirlo
  const translations: Record<string, string> = {
    'Monday': 'Lunes',
    'Tuesday': 'Martes',
    'Wednesday': 'Miércoles',
    'Thursday': 'Jueves',
    'Friday': 'Viernes',
    'Saturday': 'Sábado',
    'Sunday': 'Domingo'
  };
  
  return translations[dayName] || dayName;
}

/**
 * Genera un array con las horas enteras entre la hora de inicio y fin
 */
export function getHoursRange(startHour: string, endHour: string): string[] {
  const hours: string[] = [];
  
  // Convertir a números para facilitar comparación
  const start = parseInt(startHour.split(':')[0]);
  const end = parseInt(endHour.split(':')[0]);
  
  for (let hour = start; hour <= end; hour++) {
    hours.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  
  return hours;
}

/**
 * Obtiene el día de la semana desde una fecha
 */
export function getDayOfWeek(dateString: string): string {
  // Usar el mismo enfoque UTC para evitar problemas de zona horaria
  if (!dateString) return '';
  
  // Comprobar que la fecha está en formato YYYY-MM-DD
  const esFormatoFechaValido = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  if (!esFormatoFechaValido) {
    console.warn(`getDayOfWeek: Formato de fecha no válido: ${dateString}`);
    // Intentar usar el constructor de Date normal como fallback
    const date = new Date(dateString);
    const days = [
      'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
    ];
    return days[date.getDay()];
  }
  
  // Crear fecha con UTC al mediodía para evitar problemas de zona horaria
  const [year, month, day] = dateString.split('-').map(Number);
  const fecha = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  
  console.log(`getDayOfWeek: Fecha original: ${dateString}, Fecha UTC: ${fecha.toISOString()}, Día JS: ${fecha.getUTCDay()}`);
  
  // Usar getUTCDay para obtener el día de la semana correcto
  const days = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
  ];
  return days[fecha.getUTCDay()];
}

/**
 * Compara dos fechas para ordenar (para arrays)
 */
export function compareDates(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

/**
 * Genera un array de horas en intervalos de media hora
 * @param horaInicio Hora de inicio (formato "HH:MM" o nuevo formato "HH:MM-HH:MM,HH:MM-HH:MM")
 * @param horaFin Hora de fin (formato "HH:MM")
 * @param esFrancia Opcional: indica si la tienda está en Francia para usar intervalos de 15 min
 * @returns Array con todas las horas entre inicio y fin en intervalos apropiados, excluyendo la hora de cierre
 */
export function getHalfHourRange(horaInicio: string, horaFin: string, esFrancia?: boolean): string[] {
  console.log(`getHalfHourRange llamada con: horaInicio=${horaInicio}, horaFin=${horaFin}, esFrancia=${esFrancia}`);
  console.log(`Tipo de horaInicio: ${typeof horaInicio}`);
  
  // Si horaInicio no es string, loguear y usar un valor por defecto
  if (typeof horaInicio !== 'string') {
    console.error(`Error: horaInicio no es un string, es: ${typeof horaInicio}, valor: ${JSON.stringify(horaInicio)}`);
    horaInicio = '09:00';
  }
  
  // Comprobar si estamos usando el nuevo formato con múltiples intervalos
  if (horaInicio && horaInicio.includes('-')) {
    console.log(`Detectado formato de múltiples intervalos: ${horaInicio}`);
    const result: string[] = [];
    const intervalos = horaInicio.split(',');
    
    console.log(`Intervalos encontrados: ${intervalos.length}`);
    
    // Procesar cada intervalo
    intervalos.forEach((intervalo, index) => {
      const [inicio, fin] = intervalo.split('-');
      if (!inicio || !fin) {
        console.log(`Intervalo ${index} inválido: ${intervalo}`);
        return;
      }
      
      console.log(`Procesando intervalo ${index}: ${inicio} a ${fin}`);
      
      // Añadir cada intervalo a los resultados
      const horasIntervalo = getHorasParaIntervalo(inicio, fin, esFrancia);
      console.log(`Generadas ${horasIntervalo.length} horas para el intervalo ${index}: ${horasIntervalo.join(', ')}`);
      result.push(...horasIntervalo);
    });
    
    console.log(`Total de horas generadas: ${result.length}`);
    return result;
  }
  
  // Formato antiguo: un solo intervalo
  console.log(`Usando formato simple (un solo intervalo): ${horaInicio} a ${horaFin}`);
  const result = getHorasParaIntervalo(horaInicio, horaFin, esFrancia);
  console.log(`Total de horas generadas: ${result.length}`);
  return result;
}

/**
 * Función auxiliar para generar horas dentro de un intervalo único
 */
function getHorasParaIntervalo(horaInicio: string, horaFin: string, esFrancia?: boolean): string[] {
  console.log(`getHorasParaIntervalo: generando horas de ${horaInicio} a ${horaFin}`);
  const result: string[] = [];
  
  // Convertir a objetos Date para facilitar la manipulación
  const today = new Date();
  const fechaBase = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  
  let currentTime = new Date(`${fechaBase}T${horaInicio}`);
  const endTime = new Date(`${fechaBase}T${horaFin}`);
  
  // Para depuración
  console.log(`Horario: inicio=${currentTime.toTimeString()}, fin=${endTime.toTimeString()}`);
  
  // Ajustar el tiempo final para no incluir la hora de cierre exacta
  // Para Francia, mostramos hasta 15 minutos antes del cierre (XX:45)
  // Para otros países, mostramos hasta 30 minutos antes del cierre (XX:30)
  const adjustedEndTime = new Date(endTime);
  if (esFrancia) {
    // Para Francia: 15 minutos antes del cierre
    adjustedEndTime.setMinutes(adjustedEndTime.getMinutes() - 15);
  } else {
    // Para otros países: 30 minutos antes del cierre
    adjustedEndTime.setMinutes(adjustedEndTime.getMinutes() - 30);
  }
  
  console.log(`Fin ajustado: ${adjustedEndTime.toTimeString()}`);
  
  // Añadir cada media hora al array
  while (currentTime <= adjustedEndTime) {
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    result.push(timeStr);
    
    // Avanzar según el país
    if (esFrancia) {
      // Para Francia: intervalos de 15 minutos
      currentTime.setMinutes(currentTime.getMinutes() + 15);
    } else {
      // Para otros países: intervalos de 30 minutos
      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }
  }
  
  console.log(`Horas generadas (${result.length}): ${result.join(', ')}`);
  return result;
} 