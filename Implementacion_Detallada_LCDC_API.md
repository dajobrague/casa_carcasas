# Implementación Detallada: Integración API LCDC

## 1. Sistema de Caché (`/src/lib/lcdc/cache.ts`)

```typescript
import fs from 'fs';
import path from 'path';

// Tipos de endpoint para organización de caché
export enum EndpointType {
  USERS = 'users',
  STORES = 'stores',
  STORES_ACCESS = 'stores-access'
}

// Configuración básica
const CACHE_DIR = process.env.LCDC_CACHE_DIRECTORY || './cache/lcdc';

// Función para generar nombre de archivo con timestamp
export function generateCacheFilename(
  type: EndpointType, 
  params?: { storeCode?: number; date?: string }
): string {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  
  if (type === EndpointType.STORES_ACCESS && params?.storeCode) {
    return `store_${params.storeCode}-${params.date || ''}-${timestamp}.json`;
  }
  
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
  data: any, 
  params?: { storeCode?: number; date?: string }
): Promise<string> {
  const cacheDir = path.join(CACHE_DIR, type);
  ensureDirectoryExists(cacheDir);
  
  const filename = generateCacheFilename(type, params);
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
  type: EndpointType,
  params?: { storeCode?: number; date?: string }
): Promise<any | null> {
  const cacheDir = path.join(CACHE_DIR, type);
  
  if (!fs.existsSync(cacheDir)) {
    return null;
  }
  
  const files = await fs.promises.readdir(cacheDir);
  
  // Filtrar por parámetros si es necesario
  let filteredFiles = files;
  if (type === EndpointType.STORES_ACCESS && params?.storeCode) {
    const prefix = `store_${params.storeCode}`;
    filteredFiles = files.filter(file => file.startsWith(prefix));
  }
  
  if (filteredFiles.length === 0) {
    return null;
  }
  
  // Ordenar por fecha de modificación (más reciente primero)
  const sortedFiles = filteredFiles.sort((a, b) => {
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
```

## 2. Cliente API (`/src/lib/lcdc/api.ts`)

```typescript
import { EndpointType, saveToCache, getLatestCache } from './cache';

// Configuración base
const API_HOST = process.env.LCDC_API_HOST || 'https://apiintranet.lacasadelascarcasas.es';
const API_TOKEN = process.env.LCDC_API_TOKEN || '';

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
    throw new Error('API Token no configurado');
  }
  
  try {
    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
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
      return cachedData;
    }
  }
  
  // Hacer petición a la API
  const data = await makeApiRequest(endpoint);
  
  // Guardar en caché
  await saveToCache(cacheType, data);
  
  return data;
}

// Función para obtener tiendas con manejo de caché
export async function getStores(options: RequestOptions = {}): Promise<any> {
  const endpoint = '/api/v1/rrhh/get_stores';
  const cacheType = EndpointType.STORES;
  
  // Verificar si debemos usar caché
  if (options.useCache && !options.forceRefresh) {
    const cachedData = await getLatestCache(cacheType);
    if (cachedData) {
      return cachedData;
    }
  }
  
  // Hacer petición a la API
  const data = await makeApiRequest(endpoint);
  
  // Guardar en caché
  await saveToCache(cacheType, data);
  
  return data;
}

// Función para obtener acceso a tiendas con manejo de caché
export async function getStoresAccess(
  storeCode: number, 
  date: string, 
  options: RequestOptions = {}
): Promise<any> {
  const endpoint = `/api/v1/rrhh/get_stores_access?store_code=${storeCode}&date=${date}`;
  const cacheType = EndpointType.STORES_ACCESS;
  const cacheParams = { storeCode, date };
  
  // Verificar si debemos usar caché
  if (options.useCache && !options.forceRefresh) {
    const cachedData = await getLatestCache(cacheType, cacheParams);
    if (cachedData) {
      return cachedData;
    }
  }
  
  // Hacer petición a la API
  const data = await makeApiRequest(endpoint);
  
  // Guardar en caché
  await saveToCache(cacheType, data, cacheParams);
  
  return data;
}
```

## 3. API Routes Implementación

### `/src/app/api/lcdc/users/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/lcdc/api';
import { syncUsers } from '@/lib/lcdc/airtable';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Obtener parámetros de la petición
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    // Obtener datos (con o sin caché)
    const data = await getUsers({ 
      useCache: true, 
      forceRefresh 
    });
    
    // Sincronizar con Airtable si se solicita
    const shouldSync = searchParams.get('sync') === 'true';
    if (shouldSync) {
      await syncUsers(data);
    }
    
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      fromCache: !forceRefresh,
      data 
    });
  } catch (error) {
    console.error('Error en API users:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### `/src/app/api/lcdc/stores/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getStores } from '@/lib/lcdc/api';
import { syncStores } from '@/lib/lcdc/airtable';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Obtener parámetros de la petición
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    // Obtener datos (con o sin caché)
    const data = await getStores({ 
      useCache: true, 
      forceRefresh 
    });
    
    // Sincronizar con Airtable si se solicita
    const shouldSync = searchParams.get('sync') === 'true';
    if (shouldSync) {
      await syncStores(data);
    }
    
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      fromCache: !forceRefresh,
      data 
    });
  } catch (error) {
    console.error('Error en API stores:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### `/src/app/api/lcdc/stores-access/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getStoresAccess } from '@/lib/lcdc/api';
import { syncStoresAccess } from '@/lib/lcdc/airtable';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Obtener parámetros de la petición
    const { searchParams } = new URL(request.url);
    const storeCode = searchParams.get('store_code');
    const date = searchParams.get('date');
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    // Validar parámetros obligatorios
    if (!storeCode || !date) {
      return NextResponse.json(
        { error: 'Parámetros store_code y date son obligatorios' },
        { status: 400 }
      );
    }
    
    // Obtener datos (con o sin caché)
    const data = await getStoresAccess(
      parseInt(storeCode), 
      date,
      { useCache: true, forceRefresh }
    );
    
    // Sincronizar con Airtable si se solicita
    const shouldSync = searchParams.get('sync') === 'true';
    if (shouldSync) {
      await syncStoresAccess(data);
    }
    
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      fromCache: !forceRefresh,
      data 
    });
  } catch (error) {
    console.error('Error en API stores-access:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

## 4. Página de Administración

### `/src/app/admin/api-sync/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

enum SyncType {
  USERS = 'usuarios',
  STORES = 'tiendas',
  STORES_ACCESS = 'accesos'
}

export default function ApiSyncPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [syncType, setSyncType] = useState<SyncType>(SyncType.USERS);
  const [storeCode, setStoreCode] = useState<string>('');
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [forceRefresh, setForceRefresh] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Protección de ruta
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Función para ejecutar sincronización
  const handleSync = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      let url = '';
      
      switch (syncType) {
        case SyncType.USERS:
          url = `/api/lcdc/users?sync=true&forceRefresh=${forceRefresh}`;
          break;
        case SyncType.STORES:
          url = `/api/lcdc/stores?sync=true&forceRefresh=${forceRefresh}`;
          break;
        case SyncType.STORES_ACCESS:
          if (!storeCode || !date) {
            throw new Error('Código de tienda y fecha son obligatorios para accesos');
          }
          url = `/api/lcdc/stores-access?store_code=${storeCode}&date=${date}&sync=true&forceRefresh=${forceRefresh}`;
          break;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la sincronización');
      }
      
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (status === 'loading') {
    return <div className="p-8">Cargando...</div>;
  }
  
  if (status === 'unauthenticated') {
    return null; // Redirecciona en useEffect
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Sincronización API LCDC</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="mb-4">
          <label className="block mb-2 font-medium">Tipo de sincronización</label>
          <select
            className="w-full p-2 border rounded"
            value={syncType}
            onChange={(e) => setSyncType(e.target.value as SyncType)}
          >
            <option value={SyncType.USERS}>Usuarios</option>
            <option value={SyncType.STORES}>Tiendas</option>
            <option value={SyncType.STORES_ACCESS}>Accesos de tiendas</option>
          </select>
        </div>
        
        {syncType === SyncType.STORES_ACCESS && (
          <>
            <div className="mb-4">
              <label className="block mb-2 font-medium">Código de tienda</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value)}
                placeholder="Ej: 1"
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 font-medium">Fecha</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </>
        )}
        
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="mr-2"
            />
            <span>Forzar actualización (no usar caché)</span>
          </label>
        </div>
        
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          onClick={handleSync}
          disabled={isLoading || (syncType === SyncType.STORES_ACCESS && (!storeCode || !date))}
        >
          {isLoading ? 'Sincronizando...' : 'Iniciar sincronización'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-8">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded">
          <h2 className="text-lg font-bold mb-2">Resultado de sincronización</h2>
          <div className="mb-2">
            <strong>Estado:</strong> {result.success ? 'Éxito' : 'Error'}
          </div>
          <div className="mb-2">
            <strong>Timestamp:</strong> {result.timestamp}
          </div>
          <div className="mb-2">
            <strong>Origen de datos:</strong> {result.fromCache ? 'Caché' : 'API'}
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer font-medium">Ver datos</summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto max-h-96">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
```

## 5. Integración con Airtable

### `/src/lib/lcdc/airtable.ts`

```typescript
import Airtable from 'airtable';

// Configuración de Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID || '');

// IDs de tablas en Airtable
const STORE_TABLE_ID = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID || 'tblpHRqsBrADEkeUL';
const EMPLOYEE_TABLE_ID = process.env.AIRTABLE_EMPLEADOS_TABLE_ID || 'tblX55NaVxeYDkYGi';

// Función para sincronizar tiendas
export async function syncStores(storesData: any): Promise<any> {
  // Asegurar que tenemos un array de tiendas
  let stores = storesData;
  if (stores && stores.data) {
    stores = stores.data;
  }
  
  if (!Array.isArray(stores)) {
    throw new Error('Formato de datos de tiendas inválido');
  }
  
  // Referencia a la tabla de tiendas
  const storeTable = base(STORE_TABLE_ID);
  
  // Obtener todas las tiendas existentes
  const query = await storeTable.select().all();
  
  // Crear un mapa para relacionar códigos de tienda con IDs de registro
  const storeIdMap = new Map();
  query.forEach(record => {
    storeIdMap.set(record.get('Tienda Numero'), record.id);
  });
  
  // Preparar actualizaciones y creaciones
  const updates = [];
  const creates = [];
  const missingOptions = new Set();
  
  for (const store of stores) {
    const codigoDepartamento = store.codigo_departamento;
    const nombreDepartamento = store.nombre_departamento.replace(/^\d+\.\-\s*/, '');
    const paisDepartamento = store.pais_departamento.toUpperCase();
    const areaManager = store.area_manager ? [{ id: store.area_manager.toString() }] : [];
    
    // Verificar si el país existe en las opciones del campo
    // Esto requeriría una implementación más compleja en producción
    // Para simplificar, asumimos que los países ya existen como opciones
    
    // Verificar si existe un registro con el mismo número de tienda
    const existingRecordId = storeIdMap.get(codigoDepartamento);
    
    if (existingRecordId) {
      // Si el registro existe, añadir a la lista de actualizaciones
      updates.push({
        id: existingRecordId,
        fields: {
          "TIENDA": nombreDepartamento,
          "PAIS": { name: paisDepartamento },
          "Area Manager": areaManager
        }
      });
    } else {
      // Si el registro no existe, añadir a la lista de creaciones
      creates.push({
        fields: {
          "N°": codigoDepartamento,
          "TIENDA": nombreDepartamento,
          "PAIS": { name: paisDepartamento },
          "Area Manager": areaManager
        }
      });
    }
  }
  
  // Procesar actualizaciones en lotes
  const updateResults = [];
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    if (batch.length > 0) {
      const result = await storeTable.update(batch);
      updateResults.push(result);
    }
  }
  
  // Procesar creaciones en lotes
  const createResults = [];
  for (let i = 0; i < creates.length; i += 10) {
    const batch = creates.slice(i, i + 10);
    if (batch.length > 0) {
      const result = await storeTable.create(batch);
      createResults.push(result);
    }
  }
  
  return {
    updates: updates.length,
    creates: creates.length,
    updateResults,
    createResults,
    missingOptions: Array.from(missingOptions)
  };
}

// Función para sincronizar usuarios
export async function syncUsers(usersData: any): Promise<any> {
  // Asegurar que tenemos un array de usuarios
  let users = usersData;
  if (users && users.data) {
    users = users.data;
  }
  
  if (!Array.isArray(users)) {
    throw new Error('Formato de datos de usuarios inválido');
  }
  
  // Referencia a las tablas
  const employeeTable = base(EMPLOYEE_TABLE_ID);
  const storeTable = base(STORE_TABLE_ID);
  
  // Obtener todas las tiendas para mapear códigos a IDs
  const storeQuery = await storeTable.select().all();
  
  // Crear un mapa para relacionar códigos de tienda con IDs de registro
  const storeIdMap = new Map();
  storeQuery.forEach(record => {
    storeIdMap.set(record.get('Tienda Numero'), record.id);
  });
  
  // Obtener todos los empleados
  const employeeQuery = await employeeTable.select().all();
  
  // Crear un mapa para relacionar códigos de empleado con IDs de registro
  const employeeIdMap = new Map();
  employeeQuery.forEach(record => {
    employeeIdMap.set(record.get('CodigoEmpleado'), record.id);
  });
  
  // Preparar actualizaciones y creaciones
  const updates = [];
  const creates = [];
  
  for (const user of users) {
    const codigoEmpleado = user.codigo_empleado;
    const nombre = user.nombre;
    const apellidos = user.apellidos;
    const perfil = user.perfil;
    const codigoDepartamento = user.codigo_departamento;
    const horasContrato = user.horas_contrato;
    
    // Obtener ID de registro de tienda a partir del código
    const tiendaRecordId = storeIdMap.get(codigoDepartamento);
    
    // Verificar si existe un registro con el mismo código de empleado
    const existingEmployeeId = employeeIdMap.get(codigoEmpleado);
    
    if (existingEmployeeId) {
      // Si el registro existe, añadir a la lista de actualizaciones
      updates.push({
        id: existingEmployeeId,
        fields: {
          "Perfil": perfil,
          "Horas Semanales": horasContrato,
          "Tienda [Link]": tiendaRecordId ? [{ id: tiendaRecordId }] : []
        }
      });
    } else {
      // Si el registro no existe, añadir a la lista de creaciones
      creates.push({
        fields: {
          "CodigoEmpleado": codigoEmpleado,
          "Nombre": nombre,
          "Apellidos": apellidos,
          "Perfil": perfil,
          "Tienda [Link]": tiendaRecordId ? [{ id: tiendaRecordId }] : [],
          "Horas Semanales": horasContrato
        }
      });
    }
  }
  
  // Procesar actualizaciones en lotes
  const updateResults = [];
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    if (batch.length > 0) {
      const result = await employeeTable.update(batch);
      updateResults.push(result);
    }
  }
  
  // Procesar creaciones en lotes
  const createResults = [];
  for (let i = 0; i < creates.length; i += 10) {
    const batch = creates.slice(i, i + 10);
    if (batch.length > 0) {
      const result = await employeeTable.create(batch);
      createResults.push(result);
    }
  }
  
  return {
    updates: updates.length,
    creates: creates.length,
    updateResults,
    createResults
  };
}

// Función para sincronizar accesos (a implementar según sea necesario)
export async function syncStoresAccess(accessData: any): Promise<any> {
  // Implementación pendiente según los requisitos exactos
  
  return {
    message: "Sincronización de accesos pendiente de implementar",
    data: accessData
  };
}
``` 