import { TraficoHora, TraficoDia } from './types';
import logger from '@/lib/logger';
import { EmpleadoActividad, EmpleadoBasico, HorarioEmpleado } from './types';
import { ActividadDiariaRecord } from '@/lib/types';

/**
 * Obtiene la URL base para las peticiones API
 * Funciona tanto en cliente como en servidor
 */
function getBaseUrl() {
  // En el servidor, usamos la URL absoluta
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }
  // En el cliente, usamos la URL relativa
  return '';
}

/**
 * Obtiene datos de tráfico de un día específico para una tienda
 * @param tiendaNumero Número de la tienda (entero)
 * @param fecha Fecha en formato YYYY-MM-DD
 * @returns Datos de tráfico para el día, con metadatos
 */
export async function obtenerTraficoDelDia(tiendaNumero: number, fecha: string): Promise<TraficoDia> {
  try {
    console.log(`Obteniendo tráfico para tienda número ${tiendaNumero} en fecha ${fecha}`);
    
    // URL de la API interna de tráfico con URL base adaptativa
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/trafico?tiendaId=${tiendaNumero}&fechaInicio=${fecha}&fechaFin=${fecha}`;
    console.log(`Consultando API: ${url}`);
    
    // Realizar la petición
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en API de tráfico: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Verificar que tenemos datos de entradas por hora
    if (!data.entradasPorHora) {
      throw new Error('La API no devolvió datos de tráfico por hora');
    }
    
    // Ordenar las horas cronológicamente y filtrar las que no tienen entradas
    const entradasOrdenadas: TraficoHora = {};
    
    // Ordenar las horas
    Object.keys(data.entradasPorHora)
      .sort()
      .forEach(hora => {
        const entradas = data.entradasPorHora[hora];
        if (entradas > 0) {
          entradasOrdenadas[hora] = entradas;
        }
      });
    
    // Calcular metadatos
    const horasConTrafico = Object.keys(entradasOrdenadas).length;
    const totalEntradas = Object.values(entradasOrdenadas).reduce((sum: number, val: number) => sum + val, 0);
    let horaMaxima = '';
    let entradasHoraMaxima = 0;
    
    for (const [hora, entradas] of Object.entries(entradasOrdenadas)) {
      if (entradas > entradasHoraMaxima) {
        entradasHoraMaxima = entradas;
        horaMaxima = hora;
      }
    }
    
    const promedioEntradasPorHora = horasConTrafico > 0 ? totalEntradas / horasConTrafico : 0;
    
    // Construir y devolver el objeto de tráfico diario
    const traficoDia: TraficoDia = {
      fecha,
      entradasPorHora: entradasOrdenadas,
      metadatos: {
        totalEntradas,
        horaMaxima,
        entradasHoraMaxima,
        promedioEntradasPorHora,
        horasConTrafico,
        simulado: data.simulado || false
      }
    };
    
    console.log(`Datos de tráfico procesados: ${totalEntradas} entradas en ${horasConTrafico} horas`);
    
    return traficoDia;
    
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error(`Error al obtener tráfico: ${mensaje}`);
    throw new Error(`No se pudo obtener los datos de tráfico: ${mensaje}`);
  }
}

/**
 * Procesa las actividades diarias de empleados para un día específico
 * @param actividades Actividades diarias obtenidas de Airtable
 * @returns Array de empleados con sus horarios asignados
 */
export function procesarActividadesEmpleados(actividades: ActividadDiariaRecord[]): EmpleadoActividad[] {
  const empleadosMap = new Map<string, EmpleadoActividad>();
  
  // Procesar cada actividad para extraer información de empleados y horarios
  actividades.forEach(actividad => {
    const empleadoId = actividad.id;
    const nombre = actividad.fields.Nombre || actividad.fields.Name || 'Sin nombre';
    const dni = actividad.fields.DNI || undefined;
    const horasContrato = actividad.fields['Horas Contrato'] || undefined;
    const observaciones = actividad.fields.Observaciones || undefined;
    
    // Crear objeto de empleado básico
    const empleado: EmpleadoBasico = {
      id: empleadoId,
      nombre,
      dni,
      horasContrato
    };
    
    // Inicializar la entrada para este empleado si no existe
    if (!empleadosMap.has(empleadoId)) {
      empleadosMap.set(empleadoId, {
        empleado,
        horarioAsignado: [],
        horasTotales: 0,
        observaciones
      });
    }
    
    // Extraer horarios asignados (solo campos que representan horas)
    const horarios: HorarioEmpleado[] = [];
    let horasTotales = 0;
    
    // Recorrer todos los campos buscando los que representan horas
    for (const [campo, valor] of Object.entries(actividad.fields)) {
      // Verificar si el campo es una hora (patrón HH:MM)
      if (/^\d{1,2}:\d{2}$/.test(campo) && typeof valor === 'string') {
        horarios.push({
          hora: campo,
          actividad: valor
        });
        
        // Si es una actividad de trabajo, sumar media hora (30 min)
        if (valor.toUpperCase() === 'TRABAJO') {
          horasTotales += 0.5; // Media hora por cada slot de 30 minutos
        }
      }
    }
    
    // Actualizar la entrada del empleado con los horarios y horas totales
    const entradaEmpleado = empleadosMap.get(empleadoId)!;
    entradaEmpleado.horarioAsignado = [
      ...entradaEmpleado.horarioAsignado,
      ...horarios
    ].sort((a, b) => a.hora.localeCompare(b.hora));
    
    entradaEmpleado.horasTotales = 
      typeof horasTotales === 'number' ? horasTotales :
      typeof actividad.fields['Horas'] === 'number' ? actividad.fields['Horas'] :
      (parseFloat(String(actividad.fields['Horas'] || 0)) || 
      (parseFloat(String(actividad.fields['Horas +'] || 0)) + parseFloat(String(actividad.fields['Horas -'] || 0))));
  });
  
  // Convertir el mapa a un array
  return Array.from(empleadosMap.values());
} 