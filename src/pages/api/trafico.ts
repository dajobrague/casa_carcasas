import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API para obtener datos de tráfico por hora
 * 
 * Parámetros:
 * - tiendaId: ID de la tienda en el sistema externo
 * - fechaInicio: Fecha de inicio en formato YYYY-MM-DD
 * - fechaFin: Fecha de fin en formato YYYY-MM-DD
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verificar método HTTP
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método no permitido' });
    }
    
    // Obtener parámetros de la solicitud
    const { tiendaId, fechaInicio, fechaFin } = req.query;
    
    // Validar parámetros
    if (!tiendaId) {
      return res.status(400).json({ error: 'Se requiere el ID de la tienda' });
    }
    
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
    }
    
    // Cargar variables de entorno para la API de tráfico
    const TRAFICO_API_TOKEN = process.env.TRAFICO_API_TOKEN;
    const TRAFICO_API_BASE_URL = process.env.TRAFICO_API_BASE_URL;
    
    if (!TRAFICO_API_TOKEN || !TRAFICO_API_BASE_URL) {
      // Ir directamente a datos simulados si no hay configuración
      return generarDatosSimulados(tiendaId as string, fechaInicio as string, fechaFin as string, res);
    }
    
    // Intentar usar la API real
    try {
      const apiBaseUrl = TRAFICO_API_BASE_URL as string;
      const apiUrl = new URL(`${apiBaseUrl}/api/v1/rrhh/get_stores_access`);
      
      apiUrl.searchParams.append('store_code', tiendaId as string);
      apiUrl.searchParams.append('date', fechaInicio as string);
      
      // Timeout para la llamada externa
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos
      
      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TRAFICO_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convertir datos al formato esperado con entradas, tickets y euros
      const datosPorHora: Record<string, { entradas: number; tickets: number; euros: number }> = {};
      
      if (data && data.data && Array.isArray(data.data)) {
        data.data.forEach((registro: any) => {
          if (registro.hora !== undefined) {
            const hora = parseInt(registro.hora);
            const horaFormateada = `${hora.toString().padStart(2, '0')}:00`;
            
            if (!datosPorHora[horaFormateada]) {
              datosPorHora[horaFormateada] = { entradas: 0, tickets: 0, euros: 0 };
            }
            
            datosPorHora[horaFormateada].entradas += Number(registro.entradas || 0);
            datosPorHora[horaFormateada].tickets += Number(registro.tickets || 0);
            datosPorHora[horaFormateada].euros += Number(registro.euros || 0);
          }
        });
      }
      
      return res.status(200).json({
        tiendaId: tiendaId,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        entradasPorHora: datosPorHora,  // ✅ Corregir el nombre del campo
        timestamp: new Date().toISOString(),
        simulado: false
      });
      
    } catch (apiError) {
      // Si hay error con la API externa, usar datos simulados sin log detallado
      return generarDatosSimulados(tiendaId as string, fechaInicio as string, fechaFin as string, res);
    }
    
  } catch (error: any) {
    // Error simplificado sin stack trace largo
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Error al procesar solicitud de tráfico'
    });
  }
}

/**
 * Función para generar datos simulados de tráfico
 */
function generarDatosSimulados(
  tiendaId: string, 
  fechaInicio: string, 
  fechaFin: string, 
  res: NextApiResponse
) {
  const datosPorHora: Record<string, { entradas: number; tickets: number; euros: number }> = {};
  
  // Patrón de tráfico diario simplificado
  const patronHorario: Record<number, { entradas: number; tickets: number; euros: number }> = {
    9: { entradas: 15, tickets: 3, euros: 85.50 },
    10: { entradas: 25, tickets: 8, euros: 220.75 },
    11: { entradas: 35, tickets: 12, euros: 315.80 },
    12: { entradas: 45, tickets: 15, euros: 425.25 },
    13: { entradas: 50, tickets: 18, euros: 510.40 },
    14: { entradas: 40, tickets: 14, euros: 380.60 },
    15: { entradas: 30, tickets: 10, euros: 285.30 },
    16: { entradas: 35, tickets: 12, euros: 340.90 },
    17: { entradas: 45, tickets: 16, euros: 450.75 },
    18: { entradas: 50, tickets: 20, euros: 580.25 },
    19: { entradas: 40, tickets: 15, euros: 420.80 },
    20: { entradas: 25, tickets: 8, euros: 245.60 },
    21: { entradas: 15, tickets: 5, euros: 135.40 }
  };
  
  // Generar datos con variación aleatoria
  for (const hora in patronHorario) {
    const valorBase = patronHorario[parseInt(hora)];
    const variacion = (Math.random() - 0.5) * 0.4;
    
    const horaFormateada = `${hora.padStart(2, '0')}:00`;
    datosPorHora[horaFormateada] = {
      entradas: Math.round(valorBase.entradas * (1 + variacion)),
      tickets: Math.round(valorBase.tickets * (1 + variacion)),
      euros: Math.round(valorBase.euros * (1 + variacion) * 100) / 100 // Redondear a 2 decimales
    };
  }
  
  return res.status(200).json({
    tiendaId: tiendaId,
    fechaInicio: fechaInicio,
    fechaFin: fechaFin,
    entradasPorHora: datosPorHora,  // ✅ Corregir el nombre del campo aquí también
    simulado: true,
    timestamp: new Date().toISOString()
  });
} 