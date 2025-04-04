import { EndpointType, saveToCache, getLatestCache } from './cache';

// Configuración base (usando variables ya existentes)
const API_HOST = process.env.TRAFICO_API_BASE_URL || 'https://apiintranet.lacasadelascarcasas.es';
const API_TOKEN = process.env.TRAFICO_API_TOKEN || '';

// Opciones para peticiones
interface RequestOptions {
  useCache?: boolean;
  forceRefresh?: boolean;
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

// Función para obtener usuarios con manejo de caché
export async function getUsers(options: RequestOptions = {}): Promise<any> {
  const endpoint = '/api/v1/rrhh/get_users';
  const cacheType = EndpointType.USERS;
  
  // Verificar si debemos usar caché
  if (options.useCache && !options.forceRefresh) {
    const cachedData = await getLatestCache(cacheType);
    if (cachedData) {
      console.log('Usando datos en caché para usuarios');
      return cachedData;
    }
  }
  
  // Hacer petición a la API
  console.log('Obteniendo datos de usuarios desde API');
  
  try {
    const data = await makeApiRequest(endpoint);
    
    // Guardar en caché
    await saveToCache(cacheType, data);
    console.log('Datos de usuarios guardados en caché');
    
    return data;
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    
    // Si hay un error pero tenemos datos en caché, los usamos como fallback
    if (options.useCache) {
      const cachedData = await getLatestCache(cacheType);
      if (cachedData) {
        console.log('Usando datos en caché como fallback debido a error de API');
        return {
          ...cachedData,
          fromCache: true,
          apiError: (error as Error).message
        };
      }
    }
    
    throw error;
  }
}

// Función para obtener tiendas con manejo de caché
export async function getStores(options: RequestOptions = {}): Promise<any> {
  const endpoint = '/api/v1/rrhh/get_stores';
  const cacheType = EndpointType.STORES;
  
  // Verificar si debemos usar caché
  if (options.useCache && !options.forceRefresh) {
    const cachedData = await getLatestCache(cacheType);
    if (cachedData) {
      console.log('Usando datos en caché para tiendas');
      return cachedData;
    }
  }
  
  // Hacer petición a la API
  console.log('Obteniendo datos de tiendas desde API');
  
  try {
    const data = await makeApiRequest(endpoint);
    
    // Guardar en caché
    await saveToCache(cacheType, data);
    console.log('Datos de tiendas guardados en caché');
    
    return data;
  } catch (error) {
    console.error('Error al obtener tiendas:', error);
    
    // Si hay un error pero tenemos datos en caché, los usamos como fallback
    if (options.useCache) {
      const cachedData = await getLatestCache(cacheType);
      if (cachedData) {
        console.log('Usando datos en caché como fallback debido a error de API');
        return {
          ...cachedData,
          fromCache: true,
          apiError: (error as Error).message
        };
      }
    }
    
    throw error;
  }
} 