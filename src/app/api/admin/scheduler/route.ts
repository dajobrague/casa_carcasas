import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import { validateAdminSession } from '@/lib/auth';
import { cookies } from 'next/headers';

// Directorio para almacenar la configuración
const CONFIG_DIR = path.join(process.cwd(), 'data', 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'sync-schedule.json');

// Interfaz para la configuración de un tipo específico
interface SyncTypeConfig {
  enabled: boolean;
  schedule: 'daily' | 'weekly';
  time: string;
  dayOfWeek?: string;
  lastRun?: string;
}

// Interfaz para la configuración completa
interface SyncScheduleConfig {
  usuarios: SyncTypeConfig;
  tiendas: SyncTypeConfig;
}

// Estructura de configuración predeterminada
const DEFAULT_TYPE_CONFIG: SyncTypeConfig = {
  enabled: false,
  schedule: 'daily',
  time: '03:00'
};

// Configuración completa predeterminada
const DEFAULT_CONFIG: SyncScheduleConfig = {
  usuarios: { ...DEFAULT_TYPE_CONFIG },
  tiendas: { ...DEFAULT_TYPE_CONFIG }
};

// Función para leer la configuración
async function readConfig(): Promise<SyncScheduleConfig> {
  try {
    const fileContent = await readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(fileContent) as any;
    
    // Compatibilidad con el formato antiguo
    if (config.type && typeof config.type === 'string') {
      const oldConfig = config as any;
      // Convertir el formato antiguo al nuevo
      const newConfig: SyncScheduleConfig = {
        usuarios: { ...DEFAULT_TYPE_CONFIG },
        tiendas: { ...DEFAULT_TYPE_CONFIG }
      };
      
      // Copiar la configuración del tipo antiguamente seleccionado
      if (oldConfig.type === 'usuarios') {
        newConfig.usuarios = {
          enabled: oldConfig.enabled || false,
          schedule: oldConfig.schedule || 'daily',
          time: oldConfig.time || '03:00',
          dayOfWeek: oldConfig.dayOfWeek,
          lastRun: oldConfig.lastRun
        };
      } else if (oldConfig.type === 'tiendas') {
        newConfig.tiendas = {
          enabled: oldConfig.enabled || false,
          schedule: oldConfig.schedule || 'daily',
          time: oldConfig.time || '03:00',
          dayOfWeek: oldConfig.dayOfWeek,
          lastRun: oldConfig.lastRun
        };
      }
      
      // Guardar en el nuevo formato
      await saveConfig(newConfig);
      return newConfig;
    }
    
    // Asegurarse de que la estructura es completa
    const fullConfig: SyncScheduleConfig = {
      usuarios: { ...DEFAULT_TYPE_CONFIG, ...(config.usuarios || {}) },
      tiendas: { ...DEFAULT_TYPE_CONFIG, ...(config.tiendas || {}) }
    };
    
    return fullConfig;
  } catch (err) {
    // Si el archivo no existe, retornamos la configuración predeterminada
    return { ...DEFAULT_CONFIG };
  }
}

// Función para guardar la configuración
async function saveConfig(config: SyncScheduleConfig): Promise<void> {
  try {
    // Asegurar que el directorio existe
    await mkdir(CONFIG_DIR, { recursive: true });
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error al guardar la configuración:', err);
    throw new Error('No se pudo guardar la configuración');
  }
}

// Función para actualizar la última ejecución
async function updateLastRun(config: SyncScheduleConfig, type: 'usuarios' | 'tiendas'): Promise<void> {
  try {
    config[type].lastRun = new Date().toISOString();
    await saveConfig(config);
  } catch (err) {
    console.error('Error al actualizar la última ejecución:', err);
  }
}

// Función para ejecutar la sincronización
async function executeSyncTask(type: 'usuarios' | 'tiendas'): Promise<any> {
  try {
    // Construir la URL de sincronización
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const endpoint = type === 'usuarios' ? '/api/lcdc/users' : '/api/lcdc/stores';
    const url = `${baseUrl}${endpoint}?sync=true`;
    
    console.log(`Ejecutando sincronización programada para ${type} en ${url}`);
    
    // Crear un controlador de tiempo de espera de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos como máximo
    
    try {
      // Realizar la petición con timeout
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
      
      // Si llegamos aquí, cancelar el timeout
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error en la sincronización: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      
      // Retornar solo la información esencial
      return {
        success: true,
        updates: result.syncResult?.updates || 0,
        creates: result.syncResult?.creates || 0,
        timestamp: result.timestamp || new Date().toISOString()
      };
    } catch (fetchError: any) {
      // Limpiar el timeout para evitar fugas de memoria
      clearTimeout(timeoutId);
      
      // Si fue abortado por timeout, lanzar un error específico
      if (fetchError.name === 'AbortError') {
        console.log(`La sincronización de ${type} tomó demasiado tiempo pero está siendo procesada en segundo plano`);
        return {
          success: true,
          message: `La sincronización de ${type} está en progreso (se excedió el tiempo de espera de 30s)`,
          isBackgroundProcessing: true
        };
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error ejecutando la tarea de sincronización:', error);
    throw error;
  }
}

// Función para verificar si una tarea debe ejecutarse
function shouldRunScheduledTask(typeConfig: SyncTypeConfig): boolean {
  if (!typeConfig || !typeConfig.enabled) {
    return false;
  }
  
  const now = new Date();
  
  // Extraer hora y minuto programados
  const [scheduledHour, scheduledMinute] = typeConfig.time.split(':').map(Number);
  
  // Si la programación es semanal, verificar si es el día correcto
  if (typeConfig.schedule === 'weekly') {
    const currentDay = now.getDay().toString();
    if (currentDay !== typeConfig.dayOfWeek) {
      return false;
    }
  }
  
  // Verificar si ya se ejecutó hoy
  if (typeConfig.lastRun) {
    const lastRun = new Date(typeConfig.lastRun);
    const isSameDay = lastRun.getDate() === now.getDate() && 
                     lastRun.getMonth() === now.getMonth() && 
                     lastRun.getFullYear() === now.getFullYear();
                     
    if (isSameDay) {
      return false; // Ya se ejecutó hoy
    }
  }
  
  // Verificar si es hora de ejecutar
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Ejecutar si la hora actual es igual o posterior a la programada
  // Esto permite que la tarea se ejecute incluso si el servidor estuvo inactivo en el momento exacto
  if (currentHour > scheduledHour || 
     (currentHour === scheduledHour && currentMinute >= scheduledMinute)) {
    // Verificar que no ha pasado demasiado tiempo (dentro de 30 min)
    const scheduledTime = new Date(now);
    scheduledTime.setHours(scheduledHour, scheduledMinute, 0, 0);
    
    const diffMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);
    return diffMinutes <= 30; // Ejecutar solo si estamos dentro de los 30 min siguientes
  }
  
  return false;
}

// Endpoint GET para verificar y ejecutar tareas programadas
export async function GET(request: NextRequest) {
  try {
    // Obtener el tipo de operación y el tipo de datos
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');
    const type = searchParams.get('type') as 'usuarios' | 'tiendas' | null;
    
    // Si es una operación interna, verificar token interno
    const isInternalRequest = request.headers.get('X-Internal-Scheduler') === 'true';
    
    // Para operaciones administrativas, verificar sesión de administrador
    if (!isInternalRequest) {
      // Verificar sesión de administrador usando cookies
      const adminAuth = request.cookies.get('adminAuth')?.value;
      
      // Verificar si hay una cookie de autenticación
      if (!adminAuth) {
        // Verificar si existe la sesión de administrador usando la función existente
        const isAdmin = await validateAdminSession(request);
        if (!isAdmin) {
          return NextResponse.json({ 
            error: 'No autorizado', 
            details: 'No se encontró sesión de administrador' 
          }, { status: 401 });
        }
      } else {
        try {
          const authData = JSON.parse(adminAuth);
          if (!authData.isLoggedIn) {
            return NextResponse.json({ 
              error: 'No autorizado', 
              details: 'Sesión de administrador inválida' 
            }, { status: 401 });
          }
        } catch (err) {
          console.error('Error al procesar la cookie de autenticación:', err);
          return NextResponse.json({ 
            error: 'No autorizado', 
            details: 'Error al procesar la cookie de autenticación' 
          }, { status: 401 });
        }
      }
    }
    
    // Leer la configuración
    const config = await readConfig();
    
    // Si es una operación de verificación
    if (operation === 'check') {
      // Si se especifica un tipo, verificar solo ese tipo
      if (type && (type === 'usuarios' || type === 'tiendas')) {
        const typeConfig = config[type];
        const shouldRun = shouldRunScheduledTask(typeConfig);
        
        return NextResponse.json({ 
          hasScheduledTask: shouldRun,
          type,
          config: typeConfig
        });
      }
      
      // Si no se especifica un tipo, verificar ambos
      const usuariosShouldRun = shouldRunScheduledTask(config.usuarios);
      const tiendasShouldRun = shouldRunScheduledTask(config.tiendas);
      
      return NextResponse.json({ 
        hasScheduledTask: usuariosShouldRun || tiendasShouldRun,
        tasks: {
          usuarios: {
            shouldRun: usuariosShouldRun,
            config: config.usuarios
          },
          tiendas: {
            shouldRun: tiendasShouldRun,
            config: config.tiendas
          }
        }
      });
    } 
    // Si es una operación de ejecución
    else if (operation === 'run') {
      // Si se especifica un tipo, ejecutar solo ese tipo
      if (type && (type === 'usuarios' || type === 'tiendas')) {
        const typeConfig = config[type];
        
        if (!typeConfig.enabled) {
          return NextResponse.json({ 
            success: false,
            message: `La sincronización de ${type} está desactivada`
          });
        }
        
        const shouldRun = shouldRunScheduledTask(typeConfig);
        
        if (!shouldRun) {
          return NextResponse.json({ 
            success: false,
            message: `No hay tareas de ${type} para ejecutar en este momento`
          });
        }
        
        // Ejecutar la tarea
        try {
          const result = await executeSyncTask(type);
          
          // Actualizar la última ejecución
          await updateLastRun(config, type);
          
          return NextResponse.json({ 
            success: true,
            message: `Tarea de sincronización de ${type} ejecutada correctamente`,
            result
          });
        } catch (error) {
          return NextResponse.json({ 
            success: false,
            message: `Error ejecutando tarea de ${type}: ${(error as Error).message}`
          }, { status: 500 });
        }
      }
      
      // Si no se especifica un tipo, ejecutar ambos si es necesario
      const results = {
        usuarios: { success: false, executed: false, message: '', result: null },
        tiendas: { success: false, executed: false, message: '', result: null }
      };
      
      // Procesar usuarios
      if (config.usuarios.enabled && shouldRunScheduledTask(config.usuarios)) {
        try {
          results.usuarios.executed = true;
          results.usuarios.result = await executeSyncTask('usuarios');
          await updateLastRun(config, 'usuarios');
          results.usuarios.success = true;
          results.usuarios.message = 'Sincronización de usuarios ejecutada correctamente';
        } catch (error) {
          results.usuarios.message = `Error: ${(error as Error).message}`;
        }
      } else if (!config.usuarios.enabled) {
        results.usuarios.message = 'La sincronización de usuarios está desactivada';
      } else {
        results.usuarios.message = 'No hay tareas de usuarios programadas para este momento';
      }
      
      // Procesar tiendas
      if (config.tiendas.enabled && shouldRunScheduledTask(config.tiendas)) {
        try {
          results.tiendas.executed = true;
          results.tiendas.result = await executeSyncTask('tiendas');
          await updateLastRun(config, 'tiendas');
          results.tiendas.success = true;
          results.tiendas.message = 'Sincronización de tiendas ejecutada correctamente';
        } catch (error) {
          results.tiendas.message = `Error: ${(error as Error).message}`;
        }
      } else if (!config.tiendas.enabled) {
        results.tiendas.message = 'La sincronización de tiendas está desactivada';
      } else {
        results.tiendas.message = 'No hay tareas de tiendas programadas para este momento';
      }
      
      const anyExecuted = results.usuarios.executed || results.tiendas.executed;
      
      return NextResponse.json({ 
        success: anyExecuted,
        message: anyExecuted ? 'Se ejecutaron las tareas programadas' : 'No había tareas para ejecutar',
        results
      });
    } 
    else {
      // Operación no válida
      return NextResponse.json({ 
        error: 'Operación no válida. Use "check" o "run"'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en API scheduler:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
} 