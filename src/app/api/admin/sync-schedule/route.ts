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

// Endpoint GET para obtener la configuración actual
export async function GET(request: NextRequest) {
  try {
    // Verificar si es una solicitud interna del programador
    const isInternalRequest = request.headers.get('X-Internal-Scheduler') === 'true';
    
    // Si no es una solicitud interna, validar sesión de administrador
    if (!isInternalRequest) {
      const adminAuth = request.cookies.get('adminAuth')?.value;

      // Verificar si hay una cookie de autenticación
      if (!adminAuth) {
        // Verificar si existe la sesión de administrador usando la función existente
        const isAdmin = await validateAdminSession(request);
        if (!isAdmin) {
          return NextResponse.json({ error: 'No autorizado', details: 'No se encontró sesión de administrador' }, { status: 401 });
        }
      } else {
        try {
          const authData = JSON.parse(adminAuth);
          if (!authData.isLoggedIn) {
            return NextResponse.json({ error: 'No autorizado', details: 'Sesión de administrador inválida' }, { status: 401 });
          }
        } catch (err) {
          console.error('Error al procesar la cookie de autenticación:', err);
          return NextResponse.json({ error: 'No autorizado', details: 'Error al procesar la cookie de autenticación' }, { status: 401 });
        }
      }
    }
    
    // Leer la configuración
    const config = await readConfig();
    
    // Obtener el tipo específico solicitado (si existe)
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'usuarios' | 'tiendas' | null;
    
    if (type && (type === 'usuarios' || type === 'tiendas')) {
      return NextResponse.json({ 
        success: true, 
        config: config[type]
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      config
    });
  } catch (error) {
    console.error('Error en API sync-schedule:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}

// Endpoint POST para actualizar la configuración
export async function POST(request: NextRequest) {
  try {
    // Verificar si es una solicitud interna del programador
    const isInternalRequest = request.headers.get('X-Internal-Scheduler') === 'true';
    
    // Si no es una solicitud interna, validar sesión de administrador
    if (!isInternalRequest) {
      const isAdmin = await validateAdminSession(request);
      if (!isAdmin) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }
    
    // Obtener los datos del cuerpo
    const body = await request.json();
    
    if (!body.config || !body.type) {
      return NextResponse.json({ error: 'Configuración o tipo no proporcionado' }, { status: 400 });
    }
    
    const { config, type } = body;
    
    if (type !== 'usuarios' && type !== 'tiendas') {
      return NextResponse.json({ error: 'Tipo de sincronización no válido' }, { status: 400 });
    }
    
    // Validar los datos recibidos
    if (config.schedule !== 'daily' && config.schedule !== 'weekly') {
      return NextResponse.json({ error: 'Programación no válida' }, { status: 400 });
    }
    
    // Si es semanal, validar el día de la semana
    if (config.schedule === 'weekly' && 
        (!config.dayOfWeek || !['0', '1', '2', '3', '4', '5', '6'].includes(config.dayOfWeek))) {
      return NextResponse.json({ error: 'Día de la semana no válido' }, { status: 400 });
    }
    
    // Validar el formato de la hora
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(config.time)) {
      return NextResponse.json({ error: 'Formato de hora no válido' }, { status: 400 });
    }
    
    // Leer la configuración actual
    const fullConfig = await readConfig();
    
    // Actualizar solo el tipo específico
    fullConfig[type] = {
      enabled: config.enabled,
      schedule: config.schedule,
      time: config.time,
      dayOfWeek: config.dayOfWeek,
      lastRun: fullConfig[type].lastRun // Mantener la última ejecución
    };
    
    // Guardar la configuración
    await saveConfig(fullConfig);
    
    return NextResponse.json({ 
      success: true, 
      message: `Configuración de ${type} guardada correctamente`,
      config: fullConfig[type]
    });
  } catch (error) {
    console.error('Error en API sync-schedule:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
} 