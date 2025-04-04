import { DatosTraficoDia } from './utils';
import logger from './logger';
import { memoryCache } from './cache';

/**
 * Función para obtener datos de tráfico para un día específico
 * Usa el API route seguro para realizar todas las peticiones
 */
export async function obtenerDatosTrafico(diaLaboralId: string, storeRecordId: string): Promise<DatosTraficoDia | null> {
  try {
    // Crear clave de caché combinando día e ID de tienda
    const cacheKey = `trafico_${diaLaboralId}_${storeRecordId}`;
    
    // Verificar si ya tenemos los datos en caché
    const cachedData = memoryCache.get<DatosTraficoDia>(cacheKey);
    if (cachedData) {
      logger.log('Usando datos de tráfico en caché para:', diaLaboralId);
      return cachedData;
    }
    
    logger.log('Iniciando obtención de datos de tráfico para el día:', diaLaboralId);
    
    // 1. Obtener información del día laboral
    const diaLaboral = await obtenerDiaLaboral(diaLaboralId);
    if (!diaLaboral) {
      throw new Error('No se pudo obtener información del día laboral');
    }
    
    // 2. Obtener fechas de lunes y domingo
    if (!diaLaboral.fields['Fecha Lunes Anterior'] || !diaLaboral.fields['Fecha Domingo Anterior']) {
      throw new Error('Campos de fechas no encontrados en el día laboral');
    }
    
    const fechaLunes = new Date(diaLaboral.fields['Fecha Lunes Anterior']);
    const fechaDomingo = new Date(diaLaboral.fields['Fecha Domingo Anterior']);
    
    // 3. Obtener código de tienda
    const tiendaData = await obtenerDatosTienda(storeRecordId);
    const storeCode = tiendaData["Tienda Numero"];
    
    if (!storeCode) {
      throw new Error('Código de tienda no encontrado');
    }
    
    // 4. Crear array de fechas entre lunes y domingo
    const dates = [];
    const currentDate = new Date(fechaLunes);
    while (currentDate <= fechaDomingo) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 5. Optimización: crear un mapa para seguimiento de peticiones paralelas
    // y reutilizar promesas para fechas idénticas
    const fetchPromises = new Map();
    
    // 5.1 Obtener datos para cada fecha a través de nuestro API route (con control de concurrencia)
    const allData = await Promise.all(dates.map(async (date) => {
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // Reutilizar la misma promesa si ya estamos obteniendo datos para esta fecha
      if (!fetchPromises.has(formattedDate)) {
        // Parámetros correctos según la definición de la API
        const fetchPromise = fetch(
          `/api/trafico?tiendaId=${storeCode}&fechaInicio=${formattedDate}&fechaFin=${formattedDate}`,
          {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'max-age=300' // 5 minutos de caché HTTP
            }
          }
        ).then(async response => {
          if (!response.ok) {
            throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
          }
          return response.json();
        });
        
        fetchPromises.set(formattedDate, fetchPromise);
      }
      
      // Obtener la promesa del mapa (sea nueva o reutilizada)
      const data = await fetchPromises.get(formattedDate);
      
      return {
        date: formattedDate,
        dayOfWeek: date.getDay(),
        data: data.entradasPorHora
      };
    }));
    
    // 6. Procesar los datos obtenidos
    const result = procesarDatosTrafico(allData, fechaLunes.toISOString().split('T')[0], fechaDomingo.toISOString().split('T')[0]);
    
    // 7. Guardar en caché antes de devolver (30 minutos)
    memoryCache.set(cacheKey, result, 30 * 60);
    
    return result;
    
  } catch (error) {
    logger.error('Error detallado en obtenerDatosTrafico:', error);
    return null;
  }
}

/**
 * Función para obtener información del día laboral
 */
async function obtenerDiaLaboral(diaLaboralId: string) {
  try {
    const response = await fetch(`/api/airtable?action=obtenerDiaLaboralPorId&diaId=${diaLaboralId}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener día laboral: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.error('Error al obtener día laboral:', error);
    return null;
  }
}

/**
 * Función para obtener datos de la tienda
 */
async function obtenerDatosTienda(recordId: string) {
  try {
    const response = await fetch(`/api/airtable?action=obtenerDatosTienda&storeId=${recordId}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener datos de tienda: ${response.status}`);
    }
    
    const data = await response.json();
    return data.fields || {};
  } catch (error) {
    logger.error('Error al obtener datos de tienda:', error);
    return {};
  }
}

/**
 * Función para procesar los datos de tráfico
 * Versión optimizada usando Map para mejorar rendimiento
 */
function procesarDatosTrafico(datosAPI: any[], fechaInicio: string, fechaFin: string): DatosTraficoDia {
  try {
    if (!Array.isArray(datosAPI) || datosAPI.length === 0) {
      throw new Error('Datos de API inválidos');
    }
    
    // Franjas horarias (de 10:00 a 21:00)
    const timeSlots = Array.from({ length: 12 }, (_, i) => {
      const hour = i + 10; // Empezar desde las 10:00
      return `${hour.toString().padStart(2, '0')}:00`;
    });
    
    // Inicializar estructura de datos usando Maps para mejor rendimiento
    const diaSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const datosDiasMap = new Map<string, Map<string, number>>();
    
    // Inicializar maps para cada día con horas en 0
    diaSemana.forEach(dia => {
      const horasMap = new Map<string, number>();
      timeSlots.forEach(hora => horasMap.set(hora, 0));
      datosDiasMap.set(dia, horasMap);
    });
    
    // Mapeo de índice de día a nombre
    const mapaDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    
    // Contadores para totales
    let totalMañana = 0;
    let totalTarde = 0;
    
    // Map para acumular el total por hora (para calcular promedios)
    const totalHorasMap = new Map<string, number>();
    timeSlots.forEach(hora => totalHorasMap.set(hora, 0));
    
    // Procesar datos más eficientemente
    for (const dayData of datosAPI) {
      // Obtener el nombre del día
      const nombreDia = mapaDias[dayData.dayOfWeek];
      const horasDelDia = datosDiasMap.get(nombreDia);
      
      // Verificar que tenemos el mapa del día
      if (!horasDelDia) continue;
      
      // Los datos ahora están en formato {hora: entradas}
      if (dayData.data && typeof dayData.data === 'object') {
        for (const [hora, entradas] of Object.entries(dayData.data)) {
          // Verificar que la hora está en el formato correcto y dentro de nuestro rango
          if (timeSlots.includes(hora)) {
            const entradasNum = typeof entradas === 'number' ? entradas : parseInt(String(entradas));
            
            if (!isNaN(entradasNum)) {
              // Guardar dato en el map del día
              horasDelDia.set(hora, entradasNum);
              
              // Actualizar total de esa hora para calcular promedio después
              totalHorasMap.set(hora, (totalHorasMap.get(hora) || 0) + entradasNum);
              
              // Actualizar totales según mañana/tarde
              const hourNum = parseInt(hora.split(':')[0]);
              if (hourNum < 14) {
                totalMañana += entradasNum;
              } else {
                totalTarde += entradasNum;
              }
            }
          }
        }
      }
    }
    
    // Calcular totales por día
    const totalMañanaPorDia = Math.round(totalMañana / 7);
    const totalTardePorDia = Math.round(totalTarde / 7);
    
    // Convertir Maps a objetos para la interfaz esperada
    // Definir con la estructura específica requerida por DatosTraficoDia
    const datosPorDia: {
      lunes: Record<string, number>;
      martes: Record<string, number>;
      miercoles: Record<string, number>;
      jueves: Record<string, number>;
      viernes: Record<string, number>;
      sabado: Record<string, number>;
      domingo: Record<string, number>;
    } = {
      lunes: {},
      martes: {},
      miercoles: {},
      jueves: {},
      viernes: {},
      sabado: {},
      domingo: {}
    };
    
    // Llenar el objeto con los datos de los Maps
    for (const [dia, horasMap] of datosDiasMap.entries()) {
      datosPorDia[dia as keyof typeof datosPorDia] = Object.fromEntries(horasMap);
    }
    
    // Crear estructura de horas para compatibilidad con la interfaz existente
    const horas: Record<string, number> = {};
    for (const [hora, total] of totalHorasMap.entries()) {
      horas[hora] = Math.round(total / 7); // Promedio por día
    }
    
    return {
      horas,
      totalMañana: totalMañanaPorDia,
      totalTarde: totalTardePorDia,
      datosPorDia,
      fechaInicio,
      fechaFin
    };
  } catch (error) {
    logger.error('Error procesando datos de tráfico:', error);
    return {
      horas: {},
      totalMañana: 0,
      totalTarde: 0,
      datosPorDia: {
        lunes: {},
        martes: {},
        miercoles: {},
        jueves: {},
        viernes: {},
        sabado: {},
        domingo: {}
      },
      fechaInicio,
      fechaFin
    };
  }
} 