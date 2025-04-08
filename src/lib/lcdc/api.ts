import { EndpointType, saveToCache, getLatestCache } from './cache';

// Configuración base (usando variables ya existentes)
const API_HOST = process.env.TRAFICO_API_BASE_URL || 'https://apiintranet.lacasadelascarcasas.es';
const API_TOKEN = process.env.TRAFICO_API_TOKEN || '';

// Opciones para peticiones
interface RequestOptions {
  useCache?: boolean;
  forceRefresh?: boolean;
  fallbackToCache?: boolean;
}

// Función base para peticiones API
async function makeApiRequest(
  endpoint: string, 
  options: RequestOptions = { useCache: true, forceRefresh: false }
): Promise<any> {
  if (!API_TOKEN) {
    throw new Error('API Token no configurado en las variables de entorno');
  }
  
  try {
    console.log(`Realizando petición a ${API_HOST}${endpoint} con token`);
    
    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No se pudo leer el mensaje de error');
      console.error('Respuesta de error completa:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      
      // Manejar específicamente errores de autenticación
      if (response.status === 401) {
        throw new Error('Error de autenticación: Token inválido o expirado');
      }
      
      throw new Error(`Error en API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error en petición a ${endpoint}:`, error);
    throw error;
  }
}

// Función para obtener usuarios sin usar caché
export async function getUsers(options: RequestOptions = {}): Promise<any> {
  const endpoint = '/api/v1/rrhh/get_users';
  
  // Hacer petición a la API, sin depender del caché
  console.log('Obteniendo datos de usuarios desde API');
  
  try {
    const data = await makeApiRequest(endpoint);
    
    // Solo guardamos en caché si la opción está habilitada, pero siempre devolvemos los datos frescos
    if (options.useCache) {
      // Guardamos en caché solo para registros históricos, pero no lo usamos como fuente
      saveToCache(EndpointType.USERS, data).catch(err => 
        console.error('Error al guardar en caché los datos de usuarios:', err)
      );
    }
    
    return data;
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    
    // Si hay un error y hay opción de usar caché como último recurso
    if (options.useCache && options.fallbackToCache) {
      try {
        const cachedData = await getLatestCache(EndpointType.USERS);
        if (cachedData) {
          console.log('FALLBACK - Usando datos en caché como último recurso debido a error de API');
          return {
            ...cachedData,
            fromCache: true,
            apiError: (error as Error).message
          };
        }
      } catch (cacheError) {
        console.error('Error al intentar usar el caché como fallback:', cacheError);
      }
    }
    
    throw error;
  }
}

// Función para obtener tiendas sin usar caché
export async function getStores(options: RequestOptions = {}): Promise<any> {
  const endpoint = '/api/v1/rrhh/get_stores';
  
  // Hacer petición a la API, sin depender del caché
  console.log('Obteniendo datos de tiendas desde API');
  
  try {
    const data = await makeApiRequest(endpoint);
    
    // Solo guardamos en caché si la opción está habilitada, pero siempre devolvemos los datos frescos
    if (options.useCache) {
      // Guardamos en caché solo para registros históricos, pero no lo usamos como fuente
      saveToCache(EndpointType.STORES, data).catch(err => 
        console.error('Error al guardar en caché los datos de tiendas:', err)
      );
    }
    
    return data;
  } catch (error) {
    console.error('Error al obtener tiendas:', error);
    
    // Si hay un error y hay opción de usar caché como último recurso
    if (options.useCache && options.fallbackToCache) {
      try {
        const cachedData = await getLatestCache(EndpointType.STORES);
        if (cachedData) {
          console.log('FALLBACK - Usando datos en caché como último recurso debido a error de API');
          return {
            ...cachedData,
            fromCache: true,
            apiError: (error as Error).message
          };
        }
      } catch (cacheError) {
        console.error('Error al intentar usar el caché como fallback:', cacheError);
      }
    }
    
    throw error;
  }
} 