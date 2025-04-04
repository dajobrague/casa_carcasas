import fs from 'fs';
import path from 'path';

// Tipos de endpoint para organización de caché
export enum EndpointType {
  USERS = 'users',
  STORES = 'stores'
}

// Configuración básica
const CACHE_DIR = process.env.LCDC_CACHE_DIRECTORY || './cache/lcdc';

// Función para generar nombre de archivo con timestamp
export function generateCacheFilename(
  type: EndpointType
): string {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  return `${timestamp}.json`;
}

// Función para asegurar que el directorio existe
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Guardar datos en caché
export async function saveToCache(
  type: EndpointType, 
  data: any
): Promise<string> {
  const cacheDir = path.join(CACHE_DIR, type);
  ensureDirectoryExists(cacheDir);
  
  const filename = generateCacheFilename(type);
  const filePath = path.join(cacheDir, filename);
  
  await fs.promises.writeFile(
    filePath, 
    JSON.stringify(data, null, 2),
    'utf8'
  );
  
  return filePath;
}

// Obtener el archivo de caché más reciente
export async function getLatestCache(
  type: EndpointType
): Promise<any | null> {
  const cacheDir = path.join(CACHE_DIR, type);
  
  if (!fs.existsSync(cacheDir)) {
    return null;
  }
  
  const files = await fs.promises.readdir(cacheDir);
  
  if (files.length === 0) {
    return null;
  }
  
  // Ordenar por fecha de modificación (más reciente primero)
  const sortedFiles = files.sort((a, b) => {
    const statA = fs.statSync(path.join(cacheDir, a));
    const statB = fs.statSync(path.join(cacheDir, b));
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
  
  // Leer el archivo más reciente
  const latestFile = path.join(cacheDir, sortedFiles[0]);
  const data = await fs.promises.readFile(latestFile, 'utf8');
  
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Error parsing cache file:', error);
    return null;
  }
} 