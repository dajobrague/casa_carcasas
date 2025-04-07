/**
 * Helper para obtener URLs absolutas de API
 * Esto evita problemas en producción con las rutas relativas
 */

// Variable de entorno definida en next.config.js
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Convierte una ruta de API relativa a absoluta
 * @param path Ruta relativa de la API (ej: /api/airtable)
 * @returns URL absoluta
 */
export function getApiUrl(path: string): string {
  // Si la ruta ya es absoluta, devolverla sin cambios
  if (path.startsWith('http')) {
    return path;
  }
  
  // Asegurarse de que la ruta comienza con /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // En desarrollo usar rutas relativas
  if (process.env.NODE_ENV !== 'production') {
    return normalizedPath;
  }
  
  // En producción usar URLs absolutas
  return `${BASE_URL}${normalizedPath}`;
}

export default getApiUrl; 