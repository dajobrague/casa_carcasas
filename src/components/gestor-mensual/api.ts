'use client';

import { TiendaData, EmpleadoRecord, VacanteRecord, SemanaLaboralRecord, ActividadSemanalRecord, STATUS_EMPLEADO } from './types';
import { ESTADO_EMPLEADO } from '@/lib/constants';
import { ApiResponse } from '@/lib/types';
import { EmpleadoAnclaje, EmpleadoCompleto, EmpleadoPendiente } from './types';

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

// Función para obtener datos de la tienda
export async function obtenerDatosTienda(storeId: string): Promise<TiendaData> {
  console.log('Obteniendo datos de tienda:', storeId);
  
  try {
    const response = await fetch(`/api/airtable?action=obtenerDatosTienda&storeId=${storeId}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener los datos de la tienda: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Log detallado de la respuesta completa
    console.log('DATOS COMPLETOS DE LA TIENDA:', JSON.stringify(data, null, 2));
    console.log('Campos disponibles en la tienda:', data.fields ? Object.keys(data.fields) : 'No fields available');
    
    return data;
  } catch (error) {
    console.error('Error al obtener datos de tienda:', error);
    throw error;
  }
}

/**
 * Obtiene todos los empleados activos de una tienda o de todas las tiendas
 * @param storeId ID de la tienda o "todas" para obtener de todas las tiendas
 * @returns Lista de empleados
 */
export async function obtenerEmpleados(
  storeId: string = 'todas',
  status: string = STATUS_EMPLEADO.ACTIVO,
  from: string = ''
): Promise<EmpleadoCompleto[]> {
  try {
    console.log(`API Cliente: Obteniendo empleados para tienda [${storeId}], status: ${status}`);
    
    // Construir URL dependiendo de los parámetros
    const baseUrl = getBaseUrl();
    let url = `${baseUrl}/api/airtable?action=obtenerEmpleadosTienda`;
    
    // Agregar parámetros opcionales
    if (storeId !== 'todas') {
      url += `&storeId=${encodeURIComponent(storeId)}`;
    }
    
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }
    
    console.log(`API Cliente: URL de consulta: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error al obtener empleados: ${response.status}`);
    }
    
    const data: ApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error desconocido al obtener empleados');
    }
    
    console.log(`API Cliente: Empleados obtenidos: ${data.data?.length || 0}`);
    
    return data.data as EmpleadoCompleto[];
  } catch (error) {
    console.log(`API Cliente: Error en obtenerEmpleados: ${error}`);
    return [];
  }
}

// Función para obtener vacantes de una tienda
export async function obtenerVacantes(storeId: string): Promise<VacanteRecord[]> {
  try {
    console.log('API Cliente: Obteniendo vacantes para tienda:', storeId);
    
    // Construir los parámetros de la URL
    const url = `/api/airtable?action=obtenerEmpleadosTienda&storeId=${encodeURIComponent(storeId)}&status=${encodeURIComponent(STATUS_EMPLEADO.PENDIENTE)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error al obtener vacantes: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API Cliente: Vacantes recibidas:', data.records?.length);
    return data.records || [];
  } catch (error) {
    console.error('API Cliente: Error en obtenerVacantes:', error);
    throw error;
  }
}

// Función para obtener meses disponibles
export async function obtenerMesesDisponibles(): Promise<string[]> {
  try {
    const response = await fetch(`/api/airtable?action=obtenerMesesDisponibles`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener meses disponibles: ${response.status}`);
    }
    
    const data = await response.json();
    return data.meses || [];
  } catch (error) {
    console.error('Error al obtener meses disponibles:', error);
    throw error;
  }
}

// Caché para almacenar semanas laborales por mes
const cacheSemanas: {[key: string]: {timestamp: number, data: SemanaLaboralRecord[]}} = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

// Función para obtener semanas laborales de un mes
export async function obtenerSemanasLaborales(mes: string, empleadoId?: string): Promise<SemanaLaboralRecord[]> {
  try {
    console.log('API Cliente: Obteniendo semanas laborales para mes:', mes);
    
    // Verificar que mes sea un string válido
    if (!mes || typeof mes !== 'string') {
      console.error('API Cliente: Error - mes no válido:', mes);
      return [];
    }
    
    // Quitar espacios extra y convertir a minúsculas
    const mesLimpio = mes.trim().toLowerCase();
    console.log('API Cliente: Mes formateado para búsqueda:', mesLimpio);
    
    // Construir clave de caché que incluye el ID del empleado si está disponible
    const cacheKey = empleadoId ? `${mesLimpio}_${empleadoId}` : mesLimpio;
    
    // Verificar si tenemos datos en caché
    const ahora = Date.now();
    if (cacheSemanas[cacheKey] && (ahora - cacheSemanas[cacheKey].timestamp) < CACHE_DURATION) {
      console.log('API Cliente: Utilizando datos en caché para mes:', mesLimpio, empleadoId ? `y empleado: ${empleadoId}` : '');
      return cacheSemanas[cacheKey].data;
    }
    
    // Probar directamente con una búsqueda optimizada
    const formula = encodeURIComponent(`OR(LOWER({Mes})="${mesLimpio}", FIND("${mesLimpio}", LOWER({Mes})), FIND("${mesLimpio}", LOWER({Name})))`);
    console.log('API Cliente: Fórmula para búsqueda optimizada:', formula);
    
    const url = `/api/airtable?action=obtenerSemanasLaborales&formula=${formula}`;
    console.log('API Cliente: URL de consulta:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Cliente: Error en la respuesta (${response.status}):`, errorText);
      throw new Error(`Error al obtener semanas laborales: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API Cliente: Semanas laborales obtenidas:', data.records?.length || 0);
    
    // Si encontramos semanas, las guardamos en caché y las devolvemos
    if (data.records && data.records.length > 0) {
      // Guardar en caché
      cacheSemanas[cacheKey] = {
        timestamp: ahora,
        data: data.records
      };
      return data.records;
    }
    
    // Si no se encontraron semanas, devolver array vacío
    console.warn('API Cliente: No se encontraron semanas para el mes:', mesLimpio);
    return [];
  } catch (error) {
    console.error('API Cliente: Error al obtener semanas laborales:', error);
    return []; // Devolvemos array vacío en caso de error para evitar bloquear la interfaz
  }
}

// Función para verificar actividades ya generadas para un empleado
export async function verificarActividadesGeneradas(empleadoId: string): Promise<string[]> {
  try {
    console.log('API Cliente: Verificando actividades generadas para empleado/vacante:', empleadoId);
    
    // Detección rápida si es una vacante basada en el ID (las vacantes típicamente tienen un prefijo diferente)
    const esVacante = empleadoId.startsWith('rec') && empleadoId.length >= 17;
    if (esVacante) {
      // Para vacantes, verificamos primero si tiene el estado "Pendiente"
      console.log('API Cliente: ID posiblemente pertenece a una vacante, optimizando consulta');
      
      // Para vacantes, podemos devolver un array vacío más rápido ya que típicamente no tienen actividades
      // o realizar una verificación más ligera
      const verificacionRapida = await fetch(`/api/airtable?action=verificarEsVacante&empleadoId=${empleadoId}`);
      if (verificacionRapida.ok) {
        const resultado = await verificacionRapida.json();
        if (resultado.esVacante) {
          console.log('API Cliente: Confirmado que es una vacante, no se requiere verificación extensa');
          return []; // Las vacantes típicamente no tienen actividades generadas
        }
      }
    }
    
    // Si no es vacante o no pudimos determinar, continuar con la verificación normal
    const response = await fetch(`/api/airtable?action=verificarActividadesGeneradas&empleadoId=${empleadoId}`);
    
    if (!response.ok) {
      console.error('API Cliente: Error en respuesta:', await response.text());
      throw new Error(`Error al verificar actividades generadas: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Procesar la respuesta en el nuevo formato
    if (data.semanasIds && Array.isArray(data.semanasIds)) {
      console.log('API Cliente: Semanas ya generadas:', data.semanasIds.length);
      console.log('API Cliente: IDs de semanas generadas:', data.semanasIds);
      return data.semanasIds;
    }
    
    // Fallback para compatibilidad con el formato anterior
    if (data.records && Array.isArray(data.records)) {
      console.log('API Cliente: Actividades encontradas (formato antiguo):', data.records.length);
      
      // Extraer los IDs de semanas laborales de todas las actividades
      const semanasGeneradas = new Set<string>();
      
      data.records.forEach((record: any) => {
        if (record.fields['Semanas Laborales']) {
          if (Array.isArray(record.fields['Semanas Laborales'])) {
            record.fields['Semanas Laborales'].forEach((semanaId: string) => {
              semanasGeneradas.add(semanaId);
            });
          } else if (typeof record.fields['Semanas Laborales'] === 'string') {
            semanasGeneradas.add(record.fields['Semanas Laborales']);
          }
        }
      });
      
      const resultado = Array.from(semanasGeneradas);
      console.log('API Cliente: Semanas ya generadas (formato antiguo):', resultado.length);
      return resultado;
    }
    
    console.warn('API Cliente: Formato de respuesta no reconocido:', data);
    return [];
  } catch (error) {
    console.error('API Cliente: Error al verificar actividades generadas:', error);
    return []; // En caso de error, devolvemos un array vacío en lugar de fallar
  }
}

// Función para generar actividades para un empleado
export async function generarActividades(
  empleadoId: string, 
  semanasIds: string[], 
  tiendaId: string,
  onProgress?: (mensaje: string, progreso: number) => void
): Promise<{
  success: boolean;
  resultados: {
    actividadesSemanales: number;
    actividadesDiarias: number;
    errores: string[];
  }
}> {
  try {
    console.log('API Cliente: Generando actividades para empleado:', empleadoId, 'semanas:', semanasIds.length, 'tienda:', tiendaId);
    
    // Si tenemos una función de progreso, informamos que estamos comenzando
    if (onProgress) {
      onProgress('Enviando solicitud al servidor...', 10);
    }
    
    const response = await fetch('/api/airtable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generarActividades',
        empleadoId,
        semanasIds,
        tiendaId
      }),
    });
    
    // Informar progreso después de enviar solicitud
    if (onProgress) {
      onProgress('Procesando respuesta del servidor...', 50);
    }
    
    if (!response.ok) {
      const errorResponse = await response.text();
      console.error('API Cliente: Error en respuesta de generación:', errorResponse);
      throw new Error(`Error al generar actividades: ${response.status} - ${errorResponse}`);
    }
    
    const data = await response.json();
    console.log('API Cliente: Actividades generadas con éxito:', data);
    
    // Informar finalización
    if (onProgress) {
      onProgress('Actividades generadas correctamente', 100);
    }
    
    return data;
  } catch (error) {
    console.error('API Cliente: Error al generar actividades:', error);
    
    // Informar error
    if (onProgress) {
      onProgress(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, 100);
    }
    
    throw error;
  }
}

// Función para agregar una vacante
export async function agregarVacante(datos: { 
  tiendaId: string; 
  tipoJornada: string; 
  horasContrato?: number; 
}): Promise<VacanteRecord> {
  try {
    const response = await fetch('/api/airtable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'agregarVacante',
        ...datos
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error al agregar vacante: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al agregar vacante:', error);
    throw error;
  }
}

// Función para eliminar una vacante
export async function eliminarVacante(vacanteId: string): Promise<void> {
  try {
    const response = await fetch('/api/airtable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'eliminarVacante',
        vacanteId
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error al eliminar vacante: ${response.status}`);
    }
    
    await response.json();
  } catch (error) {
    console.error('Error al eliminar vacante:', error);
    throw error;
  }
}

// Función para asignar un empleado a una vacante
export async function asignarEmpleado(vacanteId: string, datosEmpleado: {
  Nombre: string;
  Apellidos: string;
  CodigoEmpleado: string;
  'Status Empleado': string;
  Perfil: string;
}): Promise<EmpleadoRecord> {
  try {
    const response = await fetch('/api/airtable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'asignarEmpleado',
        vacanteId,
        datosEmpleado
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error al asignar empleado: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al asignar empleado:', error);
    throw error;
  }
}

// Función para obtener meses del gestor mensual
/**
 * @deprecated Esta función ya no se utiliza en la aplicación.
 * Los meses ahora se generan estáticamente en el componente MesSelector.
 */
export async function obtenerMesesGestor(): Promise<string[]> {
  try {
    const response = await fetch(`/api/airtable?action=obtenerMesesGestor`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener meses del gestor: ${response.status}`);
    }
    
    const data = await response.json();
    return data.meses || [];
  } catch (error) {
    console.error('Error al obtener meses del gestor:', error);
    throw error;
  }
}

/**
 * Función optimizada para obtener empleados usando sus IDs directamente
 * @param empleadosIds Array de IDs de empleados a obtener
 * @returns Array de empleados
 */
export async function obtenerEmpleadosPorIds(empleadosIds: string[]): Promise<EmpleadoRecord[]> {
  if (!empleadosIds || empleadosIds.length === 0) {
    console.log('API Cliente: No hay IDs de empleados para consultar');
    return [];
  }
  
  try {
    console.log(`API Cliente: Obteniendo ${empleadosIds.length} empleados por IDs directamente`);
    
    // Construir los parámetros de la URL con los IDs codificados
    const idsParam = encodeURIComponent(JSON.stringify(empleadosIds));
    const url = `/api/airtable?action=obtenerEmpleadosPorIds&ids=${idsParam}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error al obtener empleados por IDs: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`API Cliente: Recibidos ${data.records?.length || 0} empleados de ${empleadosIds.length} solicitados`);
    
    return data.records || [];
  } catch (error) {
    console.error('API Cliente: Error en obtenerEmpleadosPorIds:', error);
    throw error;
  }
}

// Función para obtener el calendario de un empleado
export async function obtenerCalendarioEmpleado(
  empleadoId: string,
  mes: string,
  year: string
): Promise<any[]> {
  try {
    console.log('API Cliente: Obteniendo calendario para empleado:', empleadoId, 'mes:', mes, 'año:', year);
    
    const response = await fetch(
      `/api/airtable?action=obtenerCalendarioEmpleado&empleadoId=${empleadoId}&mes=${mes}&year=${year}`
    );
    
    if (!response.ok) {
      console.error('API Cliente: Error en respuesta:', await response.text());
      throw new Error(`Error al obtener calendario del empleado: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Cliente: Actividades encontradas para el calendario:', data.records?.length || 0);
    
    return data.records || [];
  } catch (error) {
    console.error('API Cliente: Error al obtener calendario del empleado:', error);
    return []; // En caso de error, devolvemos un array vacío
  }
}

// Caché para almacenar empleados entre búsquedas
const cacheEmpleados: {
  timestamp: number;
  empleados: EmpleadoRecord[];
  indiceNombres: Map<string, EmpleadoRecord[]>;
  indiceCodigos: Map<string, EmpleadoRecord>;
  cargando: boolean;
} = {
  timestamp: 0,
  empleados: [],
  indiceNombres: new Map(),
  indiceCodigos: new Map(),
  cargando: false
};

// Duración de la caché (30 minutos)
const CACHE_EMPLEADOS_DURACION = 30 * 60 * 1000;

// Iniciar precarga de empleados inmediatamente
setTimeout(() => {
  precargarEmpleados();
}, 100);

// Función para precargar los empleados inmediatamente
async function precargarEmpleados(): Promise<void> {
  if (cacheEmpleados.cargando) return;
  if (cacheEmpleados.empleados.length > 0 && 
      (Date.now() - cacheEmpleados.timestamp) < CACHE_EMPLEADOS_DURACION) return;
  
  try {
    cacheEmpleados.cargando = true;
    
    // Llamada directa a la API para obtener todos los empleados activos
    console.log('Precargando empleados para búsqueda rápida...');
    
    const response = await fetch('/api/airtable?action=obtenerEmpleadosTienda&status=Activo');
    
    if (!response.ok) {
      throw new Error(`Error al precargar empleados: ${response.status}`);
    }
    
    const data = await response.json();
    const empleados = data.records || [];
    
    console.log(`Precarga: Se encontraron ${empleados.length} empleados activos para indexar`);
    
    if (empleados && empleados.length > 0) {
      // Crear índices para búsqueda rápida
      const indiceNombres = new Map<string, EmpleadoRecord[]>();
      const indiceCodigos = new Map<string, EmpleadoRecord>();
      
      empleados.forEach((emp: EmpleadoRecord) => {
        // Indexar por código
        if (emp.fields.CodigoEmpleado) {
          const codigo = emp.fields.CodigoEmpleado.toLowerCase();
          indiceCodigos.set(codigo, emp);
        }
        
        // Indexar por nombre completo
        const nombreCompleto = `${(emp.fields.Nombre || '').toLowerCase()} ${(emp.fields.Apellidos || '').toLowerCase()}`.trim();
        const palabras = nombreCompleto.split(/\s+/);
        
        // Agregar cada palabra como índice al empleado
        palabras.forEach(palabra => {
          if (palabra.length < 2) return; // Ignorar palabras muy cortas
          
          if (!indiceNombres.has(palabra)) {
            indiceNombres.set(palabra, []);
          }
          indiceNombres.get(palabra)!.push(emp);
        });
        
        // También indexar el nombre completo
        if (!indiceNombres.has(nombreCompleto)) {
          indiceNombres.set(nombreCompleto, []);
        }
        indiceNombres.get(nombreCompleto)!.push(emp);
      });
      
      // Actualizar caché con los índices
      cacheEmpleados.empleados = empleados;
      cacheEmpleados.indiceNombres = indiceNombres;
      cacheEmpleados.indiceCodigos = indiceCodigos;
      cacheEmpleados.timestamp = Date.now();
      
      console.log('Precarga de empleados completada con éxito');
    }
  } catch (error) {
    console.error('Error en precarga de empleados:', error);
  } finally {
    cacheEmpleados.cargando = false;
  }
}

/**
 * Función para buscar empleados por nombre completo o código
 * @param searchTerm Término de búsqueda (nombre completo o código)
 * @returns Lista de empleados que coinciden con la búsqueda
 */
export async function buscarEmpleados(searchTerm: string): Promise<EmpleadoRecord[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  try {
    console.log(`Buscando empleados con término: "${searchTerm}"`);
    
    // Construir la formula de búsqueda
    const termLimpio = searchTerm.trim();
    
    // Creamos una fórmula para buscar en código de empleado, nombre y apellidos
    const formula = `OR(
      FIND("${termLimpio.toLowerCase()}", LOWER({CodigoEmpleado})),
      FIND("${termLimpio.toLowerCase()}", LOWER({Nombre})),
      FIND("${termLimpio.toLowerCase()}", LOWER({Apellidos})),
      FIND("${termLimpio.toLowerCase()}", LOWER({Nombre} & " " & {Apellidos}))
    )`;
    
    // Enviamos la consulta directamente a la API
    const url = `/api/airtable?action=buscarEmpleados&formula=${encodeURIComponent(formula)}`;
    console.log(`URL de búsqueda: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error en la búsqueda: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Empleados encontrados: ${data.records?.length || 0}`);
    
    return data.records || [];
  } catch (error) {
    console.error('Error al buscar empleados:', error);
    return [];
  }
}

/**
 * Obtiene las solicitudes de empleados pendientes para una tienda
 */
export async function obtenerSolicitudesPendientes(storeId: string): Promise<EmpleadoPendiente[]> {
  try {
    console.log(`Obteniendo solicitudes pendientes para tienda: ${storeId}`);
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/airtable?action=obtenerEmpleadosTienda&storeId=${encodeURIComponent(storeId)}&status=${encodeURIComponent(STATUS_EMPLEADO.PENDIENTE)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error al obtener solicitudes pendientes: ${response.status}`);
    }
    
    const data: ApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error desconocido al obtener solicitudes pendientes');
    }
    
    return data.data as EmpleadoPendiente[];
  } catch (error) {
    console.error("Error al obtener solicitudes pendientes:", error);
    return [];
  }
} 