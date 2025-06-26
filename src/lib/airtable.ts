import logger from './logger';

// Definición de tipos
export interface TiendaSupervisorRecord {
  id: string;
  fields: {
    Name: string;
    PAIS?: string;
    Apertura?: string;
    Cierre?: string;
    'Horas Aprobadas'?: number;
    [key: string]: any;
  };
  createdTime?: string;
}

export interface ActividadDiariaRecord {
  id: string;
  fields: {
    Nombre?: string;
    Name?: string;
    Tienda?: string[];
    'Día Laboral'?: string[];
    'Horas Contrato'?: number;
    'Horas +'?: number;
    'Horas -'?: number;
    'Horas'?: number;
    DNI?: string;
    Observaciones?: string;
    'record_Id (from Tienda y Supervisor)'?: string[];
    'recordId (from Fecha)'?: string[];
    'Actividad Semanal'?: string[];
    Fecha?: Date;
    '08:00'?: string;
    '08:30'?: string;
    '09:00'?: string;
    '09:30'?: string;
    '10:00'?: string;
    '10:30'?: string;
    '11:00'?: string;
    '11:30'?: string;
    '12:00'?: string;
    '12:30'?: string;
    '13:00'?: string;
    '13:30'?: string;
    '14:00'?: string;
    '14:30'?: string;
    '15:00'?: string;
    '15:30'?: string;
    '16:00'?: string;
    '16:30'?: string;
    '17:00'?: string;
    '17:30'?: string;
    '18:00'?: string;
    '18:30'?: string;
    '19:00'?: string;
    '19:30'?: string;
    '20:00'?: string;
    '20:30'?: string;
    '21:00'?: string;
    '21:30'?: string;
    '22:00'?: string;
    '22:30'?: string;
    [key: string]: any;
  };
  createdTime?: string;
}

export interface DiaLaboralRecord {
  id: string;
  fields: {
    Name?: string;
    'Semana Laboral'?: string[];
    [key: string]: any;
  };
  createdTime?: string;
}

export interface SemanaLaboralRecord {
  id: string;
  fields: {
    Name?: string;
    'Fecha Inicio'?: string;
    'Fecha Fin'?: string;
    Year?: string;
    Mes?: string;
    'Fecha de Inicio'?: string;
    'Fecha de fin'?: string;
    'Dias Laborales'?: string[];
    [key: string]: any;
  };
  createdTime?: string;
}

// Lista de opciones para los dropdowns
export const opcionesDropdown = [
  'TRABAJO',
  'VACACIONES',
  'LIBRE',
  'BAJA MÉDICA',
  'FORMACIÓN',
  'LACTANCIA'
];

// Opciones de estado con colores
export const opcionesEstado = [
  { value: 'TRABAJO', label: 'Trabajo', color: 'green' },
  { value: 'VACACIONES', label: 'Vacaciones', color: 'blue' },
  { value: 'LIBRE', label: 'Libre', color: 'red' },
  { value: 'BAJA MÉDICA', label: 'Baja Médica', color: 'purple' },
  { value: 'FORMACIÓN', label: 'Formación', color: 'orange' },
  { value: 'LACTANCIA', label: 'Lactancia', color: 'pink' }
];

/**
 * Obtiene los datos de una tienda específica
 */
export async function obtenerDatosTienda(storeRecordId: string): Promise<TiendaSupervisorRecord> {
  logger.log('URL de petición para tienda:', `/api/airtable?action=obtenerDatosTienda&storeId=${storeRecordId}`);
  
  try {
    const response = await fetch(`/api/airtable?action=obtenerDatosTienda&storeId=${storeRecordId}`);
    
    logger.log('Estado de la respuesta de tienda:', response.status);
    
    if (!response.ok) {
      throw new Error(`Error al obtener los datos de la tienda: ${response.status}`);
    }
    
    const data = await response.json();
    logger.log('Datos de tienda recibidos:', data);
    
    return data;
  } catch (error) {
    logger.error('Error al obtener datos de tienda:', error);
    throw error;
  }
}

/**
 * Obtiene las actividades diarias para una tienda y día específicos
 */
export async function obtenerActividadesDiarias(
  storeRecordId: string,
  diaLaboralId: string
): Promise<ActividadDiariaRecord[]> {
  try {
    // Usar la URL base para que funcione tanto en cliente como en servidor
    const baseUrl = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000') : '';
    const response = await fetch(`${baseUrl}/api/airtable?action=obtenerActividadesDiarias&storeId=${storeRecordId}&diaId=${diaLaboralId}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener las actividades diarias: ${response.status}`);
    }
    
    const data = await response.json();
    return data.records || [];
  } catch (error) {
    logger.error('Error al obtener actividades diarias:', error);
    throw error;
  }
}

/**
 * Obtiene los días laborales asociados a una semana específica
 */
export async function obtenerDiasLaboralesSemana(semanaLaboralId: string): Promise<DiaLaboralRecord[]> {
  try {
    const response = await fetch(`/api/airtable?action=obtenerDiasLaboralesSemana&semanaId=${semanaLaboralId}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener los días laborales: ${response.status}`);
    }
    
    const data = await response.json();
    return data.records || [];
  } catch (error) {
    logger.error('Error al obtener días laborales:', error);
    throw error;
  }
}

/**
 * Actualiza los campos de una actividad diaria
 */
export async function actualizarActividad(actividadId: string, campos: Record<string, any>): Promise<ActividadDiariaRecord> {
  try {
    const response = await fetch('/api/airtable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'actualizarActividad',
        actividadId,
        campos
      }),
    });
    
    if (!response.ok) {
      logger.error(`Error API al actualizar actividad: ${response.status}`);
      const errorText = await response.text();
      logger.error(`Detalle del error: ${errorText}`);
      throw new Error(`Error al actualizar la actividad: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error al actualizar actividad:', error);
    throw error;
  }
}

/**
 * Actualiza un horario específico (mantenido por compatibilidad)
 */
export async function actualizarHorario(
  actividadId: string, 
  tiempo: string, 
  valor: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/airtable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'actualizarActividad',
        actividadId,
        campos: { [tiempo]: valor || null }
      }),
    });
    
    if (!response.ok) {
      logger.error(`Error API al actualizar horario: ${response.status}`);
      const errorText = await response.text();
      logger.error(`Detalle del error: ${errorText}`);
      throw new Error(`Error al actualizar el horario: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    logger.error('Error al actualizar horario:', error);
    return false;
  }
}

/**
 * Obtiene las semanas laborales para un mes y año específicos
 */
export async function obtenerSemanasLaboralesPorMes(mes: number, año: number): Promise<SemanaLaboralRecord[]> {
  try {
    // Convertir mes de número (0-11) a nombre
    const nombresMeses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                         'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const nombreMes = nombresMeses[mes];
    
    if (!nombreMes) {
      logger.error(`Error: Mes inválido (${mes})`);
      return [];
    }
    
    // Usar la función existente que ahora usa el API route
    return await obtenerSemanasLaborales(nombreMes, año.toString());
  } catch (error) {
    logger.error('Error al obtener semanas laborales por mes y año:', error);
    return [];
  }
}

/**
 * Obtiene las semanas laborales por nombre de mes y año (compatible con el código existente)
 */
export async function obtenerSemanasLaborales(mes: string, año: string): Promise<SemanaLaboralRecord[]> {
  try {
    logger.log(`Obteniendo semanas laborales para ${mes} ${año}`);
    
    // Capitalizar primera letra del mes para consistencia
    let mesCapitalizado = mes;
    if (mes !== 'all') {
      mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1).toLowerCase();
    }
    
    // Llamar al API route para obtener las semanas laborales
    const url = `/api/airtable?action=obtenerSemanasLaborales&mes=${encodeURIComponent(mes)}&año=${encodeURIComponent(año)}`;
    logger.log(`URL de consulta: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.error(`Error al obtener semanas laborales: ${response.status}`);
      throw new Error(`Error al obtener semanas laborales: ${response.status}`);
    }
    
    const data = await response.json();

    
    // Si no encontramos semanas para el mes específico, intentamos obtener todas las semanas del año
    if (!data.records || data.records.length === 0) {

      
      // Llamar al API con mes='all' para obtener todas las semanas del año
      const fallbackResponse = await fetch(`/api/airtable?action=obtenerSemanasLaborales&mes=all&año=${encodeURIComponent(año)}`);
      
      if (!fallbackResponse.ok) {
        throw new Error(`Error al obtener todas las semanas: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();

      
      // Filtrar manualmente por mes si es posible (esto es un fallback)
      if (fallbackData.records && fallbackData.records.length > 0) {
        const mesLowerCase = mes.toLowerCase();
        const semanasFiltradas = fallbackData.records.filter((record: SemanaLaboralRecord) => {
          // Intentar hacer un filtrado básico por el campo Mes (si existe) o por el nombre
          if (record.fields.Mes && record.fields.Mes.toLowerCase().includes(mesLowerCase)) {
            return true;
          }
          
          // Si tiene fechas, verificar si alguna fecha está en el mes solicitado
          if (record.fields['Fecha de Inicio'] && record.fields['Fecha de fin']) {
            const nombresMeses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
            const mesIndex = nombresMeses.findIndex(m => m === mesLowerCase);
            
            if (mesIndex !== -1) {
              const fechaInicio = new Date(record.fields['Fecha de Inicio']);
              const fechaFin = new Date(record.fields['Fecha de fin']);
              
              const mesInicio = fechaInicio.getMonth();
              const mesFin = fechaFin.getMonth();
              
              // Verificar si el mes solicitado está dentro del rango de fechas
              return (mesIndex >= mesInicio && mesIndex <= mesFin) || 
                     mesInicio === mesIndex || 
                     mesFin === mesIndex;
            }
          }
          
          return false;
        });
        
        logger.log(`Semanas filtradas manualmente por mes ${mesCapitalizado}: ${semanasFiltradas.length}`);
        
        if (semanasFiltradas.length > 0) {
          return semanasFiltradas;
        }
      }
      
      // Si no pudimos filtrar o no hay resultados, devolver todas las semanas del año
      return fallbackData.records || [];
    }
    
    return data.records || [];
  } catch (error) {
    logger.error('Error al obtener semanas laborales:', error);
    return [];
  }
}

/**
 * Obtiene una semana laboral específica por su ID
 */
export async function obtenerSemanaPorId(semanaId: string): Promise<SemanaLaboralRecord | null> {
  if (!semanaId) {
    logger.error('Error: No se proporcionó un ID de semana laboral');
    return null;
  }
  
  try {
    logger.log(`Obteniendo semana con ID: ${semanaId}`);
    
    // Llamar al API route para obtener la semana
    const response = await fetch(`/api/airtable?action=obtenerSemanaPorId&semanaId=${encodeURIComponent(semanaId)}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener semana: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error al obtener semana laboral por ID:', error);
    return null;
  }
}

/**
 * Funciones auxiliares
 */

// Función auxiliar para obtener el número de mes (0-11)
export function obtenerNumeroMes(nombreMes: string): number {
  const meses: Record<string, number> = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };
  return meses[nombreMes.split(' ')[0]] || 0;
}

export function capitalizarPrimeraLetra(texto: string): string {
  if (!texto) return '';
  const palabras = texto.split(' ');
  const primeraPalabra = palabras[0];
  const año = palabras[1];
  return primeraPalabra.charAt(0).toUpperCase() + primeraPalabra.slice(1).toLowerCase() + ' ' + año;
}

export function formatearFecha(fecha: string | Date | undefined): string {
  if (!fecha) return '';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace('.', '').replace(/^(\d{1,2}) /, '$1 de ');
}

// Función para normalizar fechas (asegurarse de que estén en UTC)
export function normalizarFecha(fecha: Date | string): Date {
  const date = new Date(fecha);
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));
}

/**
 * Verifica la conexión a Airtable
 * Esta función es utilizada para comprobar si las credenciales son válidas
 */
export async function verificarConexionAirtable(): Promise<boolean> {
  try {
    logger.log('Verificando conexión a Airtable...');
    
    // Usar la URL base para que funcione tanto en cliente como en servidor
    const baseUrl = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000') : '';
    const url = `${baseUrl}/api/airtable?action=verificarConexion`;
    
    logger.log('URL de verificación:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos de timeout

    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    logger.log('Estado de la respuesta:', response.status);
    
    if (!response.ok) {
      logger.error(`Error en la respuesta: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const result = await response.json();
    logger.log('Resultado de verificación:', result);
    
    if (!result.connected) {
      logger.error('Error de conexión:', result.error);
      if (result.details) {
        logger.error('Detalles del error:', result.details);
      }
      return false;
    }
    
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        logger.error('La verificación de conexión excedió el tiempo de espera');
      } else {
        logger.error('Error al verificar conexión con Airtable:', error.message);
        if (error.stack) {
          logger.error('Stack trace:', error.stack);
        }
      }
    }
    return false;
  }
}

/**
 * Obtiene todas las semanas laborales
 * Utilizada para poblar el selector de años y datos generales
 */
export async function obtenerDatosSemanasLaborales(): Promise<SemanaLaboralRecord[]> {
  try {
    logger.log('Obteniendo datos de todas las semanas laborales...');
    
    // Inicialmente intentamos obtener todas las semanas laborales sin filtrar por año ni mes
    const response = await fetch(`/api/airtable?action=obtenerSemanasLaborales&mes=all&año=all`);
    
    if (!response.ok) {
      // Si falla, buscamos específicamente para el año actual
      const currentYear = new Date().getFullYear().toString();
      logger.log(`Intentando obtener semanas laborales para el año actual: ${currentYear}`);
      
      const fallbackResponse = await fetch(`/api/airtable?action=obtenerSemanasLaborales&mes=all&año=${currentYear}`);
      
      if (!fallbackResponse.ok) {
        throw new Error(`Error al obtener datos de semanas laborales: ${fallbackResponse.status}`);
      }
      
      const data = await fallbackResponse.json();
      
      
      return data.records || [];
    }
    
    const data = await response.json();
    
    
    return data.records || [];
  } catch (error) {
    logger.error('Error al obtener datos de semanas laborales:', error);
    return [];
  }
}

/**
 * Obtiene los nombres de los meses disponibles para editar
 */
export async function obtenerMesesEditor(): Promise<string[]> {
  try {
    const response = await fetch(`/api/airtable?action=obtenerMesesEditor`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener meses para editor: ${response.status}`);
    }
    
    const data = await response.json();

    
    return data.meses || [];
  } catch (error) {
    logger.error('Error al obtener meses para editor:', error);
    return [];
  }
}

/**
 * Función auxiliar para obtener las semanas históricas configuradas de una tienda
 * Ahora maneja formato JSON: {"W26 2025": ["W26 2024", "W25 2024", "W27 2024"]}
 * @param storeRecordId - ID del registro de la tienda
 * @returns Promise que resuelve con el objeto JSON de semanas históricas o null
 */
export async function obtenerSemanasHistoricas(storeRecordId: string): Promise<Record<string, string[]> | null> {
  try {
    if (!storeRecordId) {
      return null;
    }

    const tiendaData = await obtenerDatosTienda(storeRecordId);
    if (!tiendaData) {
      return null;
    }

    const semanasHistoricasStr = tiendaData.fields['Semanas Históricas'];
    if (!semanasHistoricasStr) {
      return null;
    }

    const semanasStr = String(semanasHistoricasStr).trim();
    
    // Si está vacío, retornar null
    if (!semanasStr) {
      return null;
    }

    // Intentar parsear como JSON primero
    try {
      const semanasJSON = JSON.parse(semanasStr);
      
      // Validar que es un objeto y tiene la estructura correcta
      if (typeof semanasJSON === 'object' && semanasJSON !== null && !Array.isArray(semanasJSON)) {
        // Validar que todas las claves y valores tienen el formato correcto
        const isValid = Object.entries(semanasJSON).every(([key, value]) => {
          return typeof key === 'string' && 
                 key.match(/^W\d{1,2} \d{4}$/) && 
                 Array.isArray(value) && 
                 value.every(semana => typeof semana === 'string' && semana.match(/^W\d{1,2} \d{4}$/));
        });
        
        if (isValid) {
          console.log(`✅ JSON válido encontrado para tienda ${storeRecordId}:`, semanasJSON);
          return semanasJSON;
        }
      }
    } catch (jsonError) {
      // Si no es JSON válido, podría ser formato legacy
      console.log(`📋 Intentando migrar formato legacy para tienda ${storeRecordId}`);
    }

    // Formato legacy: "W26 2024,W25 2024,W27 2024"
    // Lo convertimos a JSON automáticamente
    if (semanasStr.includes(',') && semanasStr.includes('W')) {
      const semanasArray = semanasStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      // Validar formato de semanas
      const semanasValidas = semanasArray.filter(semana => semana.match(/^W\d{1,2} \d{4}$/));
      
      if (semanasValidas.length > 0) {
        console.log(`🔄 Formato legacy detectado, convirtiendo automáticamente:`, semanasValidas);
        
        // Por ahora, retornamos null para que use lógica estándar
        // El administrador deberá configurar explícitamente el JSON
        console.warn(`⚠️ Tienda ${storeRecordId} tiene formato legacy. Se requiere configuración manual.`);
        return null;
      }
    }

    console.warn(`⚠️ Formato de semanas históricas no válido para tienda ${storeRecordId}: ${semanasStr.substring(0, 50)}`);
    return null;
    
  } catch (error) {
    console.error('Error al obtener semanas históricas:', error);
    return null;
  }
}

/**
 * Función para obtener las semanas históricas de referencia para una semana específica
 * @param storeRecordId - ID del registro de la tienda
 * @param semanaObjetivo - Semana objetivo en formato "W26 2025"
 * @returns Promise que resuelve con array de semanas de referencia o null
 */
export async function obtenerSemanasHistoricasPorSemana(
  storeRecordId: string, 
  semanaObjetivo: string
): Promise<string[] | null> {
  try {
    console.log(`🔍 obtenerSemanasHistoricasPorSemana - Tienda: ${storeRecordId}, Semana objetivo: ${semanaObjetivo}`);
    const semanasHistoricas = await obtenerSemanasHistoricas(storeRecordId);
    
    if (!semanasHistoricas) {
      console.log(`❌ No se encontró configuración JSON para tienda ${storeRecordId}`);
      return null;
    }

    console.log(`✅ Configuración JSON encontrada:`, semanasHistoricas);

    // Buscar la semana objetivo en las configuraciones
    const semanasReferencia = semanasHistoricas[semanaObjetivo];
    
    if (!semanasReferencia || !Array.isArray(semanasReferencia) || semanasReferencia.length === 0) {
      console.log(`📅 No hay configuración histórica para semana ${semanaObjetivo} en tienda ${storeRecordId}`);
      console.log(`📋 Semanas disponibles en configuración:`, Object.keys(semanasHistoricas));
      return null;
    }

    console.log(`📋 Semanas de referencia para ${semanaObjetivo}:`, semanasReferencia);
    return semanasReferencia;
    
  } catch (error) {
    console.error('Error al obtener semanas históricas por semana:', error);
    return null;
  }
}

/**
 * Función para actualizar/guardar semanas históricas en formato JSON
 * @param storeRecordId - ID del registro de la tienda
 * @param semanaObjetivo - Semana objetivo en formato "W26 2025"
 * @param semanasReferencia - Array de semanas de referencia en formato ["W26 2024", "W25 2024"]
 * @returns Promise que resuelve con true si se guardó correctamente
 */
export async function guardarSemanasHistoricas(
  storeRecordId: string,
  semanaObjetivo: string,
  semanasReferencia: string[]
): Promise<boolean> {
  try {
    // Obtener configuración actual
    const configuracionActual = await obtenerSemanasHistoricas(storeRecordId) || {};
    
    // Agregar/actualizar la nueva configuración
    configuracionActual[semanaObjetivo] = semanasReferencia;
    
    // Convertir a JSON string
    const jsonString = JSON.stringify(configuracionActual, null, 2);
    
    // Actualizar en Airtable (esto requeriría implementar la función de actualización)
    console.log(`💾 Guardando configuración para tienda ${storeRecordId}:`, jsonString);
    
    // TODO: Implementar actualización en Airtable
    // await actualizarCampoTienda(storeRecordId, 'Semanas Históricas', jsonString);
    
    return true;
    
  } catch (error) {
    console.error('Error al guardar semanas históricas:', error);
    return false;
  }
}

/**
 * Función helper para obtener la semana actual en formato "W26 2025"
 * Utiliza el estándar ISO 8601 para cálculo de semanas
 * @param fecha - Fecha opcional, usa fecha actual si no se proporciona
 * @returns String con formato de semana
 */
export function obtenerFormatoSemana(fecha?: Date): string {
  const fechaObj = new Date(fecha || new Date());
  
  // Implementación simplificada y correcta del ISO 8601
  const año = fechaObj.getFullYear();
  const mes = fechaObj.getMonth(); // 0-11
  const dia = fechaObj.getDate();
  
  // Crear fecha objetivo
  const fechaObjetivo = new Date(año, mes, dia);
  
  // Encontrar el lunes de la semana de la fecha objetivo
  const diaSemana = fechaObjetivo.getDay(); // 0 = domingo, 1 = lunes, etc.
  const diasAlLunes = (diaSemana === 0 ? -6 : 1 - diaSemana); // Ajustar domingo como día 7
  const lunesDeEstaSemana = new Date(fechaObjetivo);
  lunesDeEstaSemana.setDate(fechaObjetivo.getDate() + diasAlLunes);
  
  // Determinar a qué año pertenece esta semana ISO
  // Una semana pertenece al año que contiene más días (al menos 4 días)
  const juevesDeLaSemana = new Date(lunesDeEstaSemana);
  juevesDeLaSemana.setDate(lunesDeEstaSemana.getDate() + 3);
  const añoISO = juevesDeLaSemana.getFullYear();
  
  // Encontrar el primer lunes del año ISO
  const primerEneroDeLAño = new Date(añoISO, 0, 1);
  const diaDeLaSemanaDelPrimerEnero = primerEneroDeLAño.getDay();
  
  // Encontrar el lunes de la primera semana ISO del año
  let primerLunesIso = new Date(añoISO, 0, 1);
  if (diaDeLaSemanaDelPrimerEnero <= 4) {
    // Si el 1 de enero es lunes a jueves, está en la primera semana
    primerLunesIso.setDate(1 - (diaDeLaSemanaDelPrimerEnero === 0 ? 6 : diaDeLaSemanaDelPrimerEnero - 1));
  } else {
    // Si el 1 de enero es viernes a domingo, la primera semana empieza el siguiente lunes
    primerLunesIso.setDate(1 + (8 - diaDeLaSemanaDelPrimerEnero));
  }
  
  // Calcular número de semana
  const diferenciaMs = lunesDeEstaSemana.getTime() - primerLunesIso.getTime();
  const diasDeDiferencia = Math.floor(diferenciaMs / (24 * 60 * 60 * 1000));
  const numeroSemana = Math.floor(diasDeDiferencia / 7) + 1;
  
  return `W${numeroSemana.toString().padStart(2, '0')} ${añoISO}`;
} 