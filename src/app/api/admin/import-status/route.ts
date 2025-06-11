import { NextRequest } from 'next/server';
import logger from '@/lib/logger';

// Almacén de eventos en memoria (en un entorno de producción consideraría usar Redis)
type ImportStatus = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  errors: string[];
  message: string;
  isCompleted: boolean;
  lastUpdated: number; // Timestamp para verificar actividad
};

// Mantener los estados completados por 2 horas para que los clientes puedan reconectarse
const COMPLETED_STATUS_TTL = 2 * 60 * 60 * 1000; // 2 horas

let statusStore: Record<string, ImportStatus> = {};
let lastSentData: Record<string, string> = {}; // Almacenar último mensaje enviado para cada sesión

// Función para agregar un evento al almacén
export function addImportEvent(
  sessionId: string, 
  data: Partial<ImportStatus>
) {
  // Inicializar si no existe
  if (!statusStore[sessionId]) {
    statusStore[sessionId] = {
      created: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      currentBatch: 0,
      totalBatches: 0,
      errors: [],
      message: "Iniciando importación...",
      isCompleted: false,
      lastUpdated: Date.now()
    };
    logger.info(`[SSE] Iniciada nueva sesión: ${sessionId}`);
  }

  // Actualizar con los nuevos datos
  statusStore[sessionId] = {
    ...statusStore[sessionId],
    ...data,
    lastUpdated: Date.now()
  };
  
  // Guardar los datos completados en el almacenamiento global
  // Esto asegura que los estados completados no se pierdan
  if (data.isCompleted) {
    logger.info(`[STATUS] Importación completada para sesión ${sessionId}. Manteniendo estado activo.`);
  }
  
  // Añadir log para cada actualización
  logger.info(`[SSE] Actualización para sesión ${sessionId}: ${data.message || 'Sin mensaje'} (Lote: ${statusStore[sessionId].currentBatch}/${statusStore[sessionId].totalBatches}, Completado: ${statusStore[sessionId].isCompleted})`);
}

// Función para obtener el estado actual
export function getImportStatus(sessionId: string): ImportStatus | null {
  const status = statusStore[sessionId];
  
  if (status) {
    logger.info(`[STATUS CHECK] Estado encontrado para sesión ${sessionId}: ${status.isCompleted ? 'completado' : 'en progreso'}`);
    return status;
  }
  
  logger.warn(`[STATUS CHECK] No se encontró estado para sesión ${sessionId}`);
  return null;
}

// Función para limpiar eventos antiguos
export function cleanupImportEvents() {
  const now = Date.now();
  const expireTime = 30 * 60 * 1000; // 30 minutos para sesiones activas
  
  Object.keys(statusStore).forEach(sessionId => {
    const status = statusStore[sessionId];
    const inactiveTime = now - status.lastUpdated;
    
    // Si está completado, usar un TTL mucho más largo
    const ttl = status.isCompleted ? COMPLETED_STATUS_TTL : expireTime;
    
    if (inactiveTime > ttl) {
      logger.info(`[SSE] Eliminando sesión ${sessionId} (completada: ${status.isCompleted}, inactiva por: ${Math.round(inactiveTime/1000)}s)`);
      delete statusStore[sessionId];
      delete lastSentData[sessionId];
    }
  });
}

// Iniciamos una limpieza periódica
setInterval(cleanupImportEvents, 5 * 60 * 1000); // Cada 5 minutos

// Función para enviar un heartbeat y mantener la conexión viva
function sendHeartbeat(controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  controller.enqueue(encoder.encode(": heartbeat\n\n"));
}

// Endpoint SSE
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('No session ID provided', { status: 400 });
  }
  
  logger.info(`[SSE] Nueva conexión para sesión: ${sessionId}`);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Enviar estado inicial si existe
      const initialStatus = statusStore[sessionId];
      if (initialStatus) {
        const initialData = JSON.stringify(initialStatus);
        controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));
        lastSentData[sessionId] = initialData;
        logger.info(`[SSE] Enviado estado inicial para ${sessionId}: ${initialStatus.message} (Lote: ${initialStatus.currentBatch}/${initialStatus.totalBatches})`);
      } else {
        logger.warn(`[SSE] No se encontró estado inicial para ${sessionId}`);
        
        // Crear un estado por defecto para evitar error en el cliente
        const defaultStatus: ImportStatus = {
          created: 0,
          updated: 0,
          skipped: 0,
          total: 0,
          currentBatch: 0,
          totalBatches: 1,
          errors: [],
          message: "Esperando información del servidor...",
          isCompleted: false,
          lastUpdated: Date.now()
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(defaultStatus)}\n\n`));
      }
      
      // Función para enviar eventos al cliente solo si hay cambios
      const sendEvent = (data: ImportStatus) => {
        try {
          const jsonData = JSON.stringify(data);
          
          // Solo enviar si los datos cambiaron
          if (lastSentData[sessionId] !== jsonData) {
            controller.enqueue(encoder.encode(`data: ${jsonData}\n\n`));
            lastSentData[sessionId] = jsonData;
            logger.debug(`[SSE] Evento enviado para ${sessionId}: ${data.message}`);
          }
        } catch (err) {
          logger.error(`[SSE] Error al enviar evento: ${err}`);
        }
      };
      
      // Enviar heartbeat cada 15 segundos para mantener la conexión viva
      const heartbeatId = setInterval(() => {
        sendHeartbeat(controller, encoder);
      }, 15000);

      // Establecer un intervalo para verificar actualizaciones (cada 2 segundos)
      const intervalId = setInterval(() => {
        const status = statusStore[sessionId];
        if (status) {
          // Enviar siempre el estado actual
          sendEvent(status);
          
          // Si la importación está completa, cerramos el stream después de enviar el estado final
          if (status.isCompleted) {
            logger.info(`[SSE] Cerrando stream para sesión completada ${sessionId}`);
            clearInterval(intervalId);
            clearInterval(heartbeatId);
            
            // Enviamos un último evento y cerramos después de un pequeño retraso
            setTimeout(() => {
              sendEvent({...status, message: "Importación finalizada. Cerrando conexión..."});
              // Mantenemos el status para posibles reconexiones
              setTimeout(() => controller.close(), 3000);
            }, 2000);
          }
        }
      }, 2000); // Reducir a cada 2 segundos para menos sobrecarga

      // Limpieza cuando el cliente se desconecta
      request.signal.addEventListener('abort', () => {
        logger.info(`[SSE] Cliente desconectado para sesión ${sessionId}`);
        clearInterval(intervalId);
        clearInterval(heartbeatId);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Para evitar buffering en nginx
    }
  });
} 