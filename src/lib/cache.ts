/**
 * Sistema de caché en memoria para almacenar temporalmente datos de peticiones frecuentes
 * 
 * Este sistema almacena los datos en memoria con un tiempo de expiración configurable.
 * Ayuda a reducir el número de peticiones a la API y mejora la percepción de velocidad.
 */

interface CacheItem<T> {
  value: T;
  expiry: number; // Timestamp de expiración
}

class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  
  /**
   * Almacena un valor en la caché con una clave y tiempo de expiración
   * 
   * @param key Clave única para identificar el valor
   * @param value Valor a almacenar
   * @param ttlSeconds Tiempo de vida en segundos (por defecto: 5 minutos)
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
    
    // Log para desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] Almacenado: ${key} (expira en ${ttlSeconds}s)`);
    }
  }
  
  /**
   * Obtiene un valor de la caché si existe y no ha expirado
   * 
   * @param key Clave del valor a obtener
   * @returns El valor almacenado o undefined si no existe o expiró
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    // Si no existe el item, devolver undefined
    if (!item) {
      return undefined;
    }
    
    // Si el item ha expirado, eliminarlo y devolver undefined
    if (Date.now() > item.expiry) {
      this.delete(key);
      return undefined;
    }
    
    // Log para desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] Recuperado: ${key}`);
    }
    
    return item.value as T;
  }
  
  /**
   * Elimina un valor de la caché
   * 
   * @param key Clave del valor a eliminar
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Limpia toda la caché
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Obtiene el tamaño actual de la caché
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Elimina todos los elementos expirados de la caché
   * 
   * @returns Número de elementos eliminados
   */
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
}

// Exportar una única instancia para uso en toda la aplicación
export const memoryCache = new MemoryCache();

// Programar limpieza automática cada 15 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    memoryCache.cleanup();
  }, 15 * 60 * 1000);
} 