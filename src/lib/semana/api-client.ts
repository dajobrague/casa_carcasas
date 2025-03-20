import { SemanaLaboral, DiaLaboral } from './types';
import logger from '@/lib/logger';
import { format, parseISO, parse } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Obtiene la URL base para las peticiones API
 * Funciona tanto en cliente como en servidor
 */
function getBaseUrl() {
  // En el servidor, usamos la URL absoluta
  if (typeof window === 'undefined') {
    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
  }
  // En el cliente, usamos la URL relativa
  return '';
}

/**
 * Obtiene los datos de una semana laboral desde Airtable
 * @param semanaId ID de la semana en Airtable
 * @returns Datos de la semana
 * @throws Error si no se puede obtener la semana
 */
export async function obtenerDatosSemana(semanaId: string): Promise<SemanaLaboral> {
  try {
    console.log(`Obteniendo datos de semana con ID: ${semanaId}`);
    
    // Realizar petición al endpoint de Airtable con URL base adaptativa
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/airtable?action=obtenerSemanaPorId&semanaId=${semanaId}`;
    console.log(`Consultando API: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al obtener datos de semana: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.fields) {
      throw new Error('Datos de semana no válidos o vacíos');
    }
    
    console.log(`Datos de semana obtenidos con éxito: ${data.fields.Name || 'Sin nombre'}`);
    
    // Mapear respuesta de Airtable a nuestro modelo de datos
    const semana: SemanaLaboral = {
      id: data.id,
      nombre: data.fields.Name || 'Sin nombre',
      fechaInicio: data.fields['Fecha de Inicio'] || '',
      fechaFin: data.fields['Fecha de fin'] || '',
      año: data.fields['Year'] || '',
      mes: data.fields['Mes'] || '',
      diasLaborales: data.fields['Dias Laborales'] || []
    };
    
    return semana;
    
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error(`Error al obtener datos de semana: ${mensaje}`);
    throw new Error(`No se pudo obtener la información de la semana: ${mensaje}`);
  }
}

/**
 * Obtiene un día laboral específico desde Airtable
 * @param diaId ID del día laboral en Airtable
 * @returns Datos del día laboral
 * @throws Error si no se puede obtener el día laboral
 */
export async function obtenerDiaLaboral(diaId: string): Promise<DiaLaboral> {
  try {
    console.log(`Obteniendo día laboral con ID: ${diaId}`);
    
    // Realizar petición al endpoint de Airtable con URL base adaptativa
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/airtable?action=obtenerDiaLaboralPorId&diaId=${diaId}`;
    console.log(`Consultando API: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al obtener día laboral: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.fields) {
      throw new Error('Datos de día laboral no válidos o vacíos');
    }
    
    // IMPORTANTE: En esta tabla, la fecha está en el campo 'Name' en formato YYYY-MM-DD
    // Si existe 'Fecha', usamos ese campo, sino usamos 'Name'
    const fecha = data.fields['Fecha'] || data.fields['Name'] || '';
    let diaSemana = data.fields['Dia de la semana'] || '';
    
    // Validar formato de fecha
    const esFormatoFechaValido = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
    if (!esFormatoFechaValido) {
      console.warn(`El día laboral ${diaId} no tiene una fecha válida: ${fecha}`);
    }
    
    // Si no viene el día de la semana, intentar calcularlo desde la fecha
    if (!diaSemana && fecha && esFormatoFechaValido) {
      try {
        // FIX: El problema parece ser que parseISO está interpretando la fecha en la zona horaria local
        // lo que puede causar desplazamientos de día. Vamos a asegurarnos de que la fecha se interprete correctamente.
        
        // Vamos a crear una fecha usando directamente el constructor de Date con los componentes de la fecha
        const [year, month, day] = fecha.split('-').map(Number);
        // Crear la fecha usando UTC para evitar problemas de zona horaria
        const fechaObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        
        console.log(`Fecha original: ${fecha}, Fecha parseada: ${fechaObj.toISOString()}, Día de la semana (JS): ${fechaObj.getUTCDay()}`);
        
        // Usar el formato con locale español para obtener el nombre del día
        diaSemana = format(fechaObj, 'EEEE', { locale: es });
        // Capitalizar primera letra
        diaSemana = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
        
        console.log(`Día de la semana calculado para ${fecha}: ${diaSemana}`);
      } catch (e) {
        console.error(`Error al parsear fecha para día: ${fecha}`, e);
      }
    }
    
    // Para horarios, es posible que estén en otros campos como "Apertura" y "Cierre"
    const horarioApertura = data.fields['Horario Apertura'] || data.fields['Apertura'] || '09:00';
    const horarioCierre = data.fields['Horario Cierre'] || data.fields['Cierre'] || '21:00';
    
    console.log(`Día laboral obtenido: ${fecha} (${diaSemana}), horario: ${horarioApertura}-${horarioCierre}`);
    
    return {
      id: data.id,
      fecha: fecha,
      diaSemana: diaSemana,
      nombre: data.fields['Name'] || '',
      horarioApertura: horarioApertura,
      horarioCierre: horarioCierre,
      semanasLaborales: data.fields['Semanas Laborales'] || []
    };
    
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error(`Error al obtener día laboral: ${mensaje}`);
    throw new Error(`No se pudo obtener el día laboral: ${mensaje}`);
  }
}

/**
 * Obtiene los días laborales de una semana desde Airtable
 * @param semanaId ID de la semana en Airtable
 * @returns Array de días laborales asociados a la semana
 * @throws Error si no se pueden obtener los días laborales
 */
export async function obtenerDiasLaborales(semanaId: string): Promise<DiaLaboral[]> {
  try {
    console.log(`Obteniendo días laborales para semana con ID: ${semanaId}`);
    
    // Primero obtenemos la semana para ver sus días laborales vinculados
    const semana = await obtenerDatosSemana(semanaId);
    console.log(`Semana obtenida: ${semana.nombre}, verificando días laborales vinculados`);
    
    // Si no hay días laborales vinculados, devolver array vacío
    if (!semana.diasLaborales || !Array.isArray(semana.diasLaborales) || semana.diasLaborales.length === 0) {
      console.log('No se encontraron días laborales vinculados a esta semana');
      return [];
    }
    
    console.log(`Se encontraron ${semana.diasLaborales.length} días laborales vinculados`);
    
    // Obtenemos cada día laboral individualmente por su ID
    const diasLaboralesPromises = semana.diasLaborales.map(diaId => obtenerDiaLaboral(diaId));
    const diasLaborales = await Promise.all(diasLaboralesPromises);
    
    console.log(`Días laborales obtenidos: ${diasLaborales.length}`);
    
    // Ordenar días laborales por fecha
    diasLaborales.sort((a, b) => {
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      return a.fecha.localeCompare(b.fecha);
    });
    
    return diasLaborales;
    
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error(`Error al obtener días laborales: ${mensaje}`);
    throw new Error(`No se pudo obtener los días laborales: ${mensaje}`);
  }
} 