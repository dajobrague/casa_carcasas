import { DatosTraficoDia } from './utils';
import logger from './logger';

/**
 * Función para obtener datos de tráfico para un día específico
 * Usa el API route seguro para realizar todas las peticiones
 */
export async function obtenerDatosTrafico(diaLaboralId: string, storeRecordId: string): Promise<DatosTraficoDia | null> {
  try {
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
    
    // 5. Obtener datos para cada fecha a través de nuestro API route
    const allData = await Promise.all(dates.map(async (date) => {
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const response = await fetch(
        `/api/trafico?storeCode=${storeCode}&date=${formattedDate}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        date: formattedDate,
        dayOfWeek: date.getDay(),
        data: data.data
      };
    }));
    
    // 6. Procesar los datos obtenidos
    return procesarDatosTrafico(allData, fechaLunes.toISOString().split('T')[0], fechaDomingo.toISOString().split('T')[0]);
    
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
    
    // Inicializar estructura de datos
    const datosPorDia = {
      lunes: {} as Record<string, number>,
      martes: {} as Record<string, number>,
      miercoles: {} as Record<string, number>,
      jueves: {} as Record<string, number>,
      viernes: {} as Record<string, number>,
      sabado: {} as Record<string, number>,
      domingo: {} as Record<string, number>
    };
    
    // Mapeo de índice de día a nombre
    const mapaDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    
    // Inicializar horas en cada día
    Object.keys(datosPorDia).forEach(dia => {
      timeSlots.forEach(hora => {
        datosPorDia[dia as keyof typeof datosPorDia][hora] = 0;
      });
    });
    
    // Llenar datos
    let totalMañana = 0;
    let totalTarde = 0;
    
    datosAPI.forEach(dayData => {
      // Obtener el nombre del día
      const nombreDia = mapaDias[dayData.dayOfWeek];
      
      // Procesar entradas
      if (Array.isArray(dayData.data)) {
        dayData.data.forEach((entry: any) => {
          // Convertir la hora al formato requerido
          const hora = `${entry.hora.padStart(2, '0')}:00`;
          const entradas = parseInt(entry.entradas);
          
          if (!isNaN(entradas) && timeSlots.includes(hora) && nombreDia in datosPorDia) {
            datosPorDia[nombreDia as keyof typeof datosPorDia][hora] = entradas;
            
            // Actualizar totales según mañana/tarde
            const hourNum = parseInt(hora.split(':')[0]);
            if (hourNum < 14) {
              totalMañana += entradas;
            } else {
              totalTarde += entradas;
            }
          }
        });
      }
    });
    
    // Calcular totales por día
    const totalMañanaPorDia = Math.round(totalMañana / 7);
    const totalTardePorDia = Math.round(totalTarde / 7);
    
    // Crear estructura de horas para compatibilidad con la interfaz existente
    const horas: Record<string, number> = {};
    timeSlots.forEach(hora => {
      let total = 0;
      Object.keys(datosPorDia).forEach(dia => {
        total += datosPorDia[dia as keyof typeof datosPorDia][hora] || 0;
      });
      horas[hora] = Math.round(total / 7); // Promedio por día
    });
    
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