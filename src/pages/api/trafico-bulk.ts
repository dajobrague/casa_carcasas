import type { NextApiRequest, NextApiResponse } from 'next';

interface TraficoRequest {
  tiendaId: string;
  fecha: string;
}

interface TraficoResponse {
  fecha: string;
  datos: {
    entradasPorHora: Record<string, { entradas: number; tickets: number; euros: number }>;
  };
  simulado: boolean;
  error?: string;
}

/**
 * API optimizada para obtener datos de tráfico de múltiples fechas en paralelo
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Soportar tanto GET como POST
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido. Use GET o POST' });
    }

    let requests: TraficoRequest[] = [];

    if (req.method === 'GET') {
      // Modo GET: tiendaId y fechas como query params
      const { tiendaId, fechas } = req.query;
      
      if (!tiendaId || !fechas) {
        return res.status(400).json({ error: 'Se requieren tiendaId y fechas' });
      }
      
      const fechasArray = (fechas as string).split(',').filter(f => f.trim());
      if (fechasArray.length === 0) {
        return res.status(400).json({ error: 'Se requiere al menos una fecha' });
      }
      
      requests = fechasArray.map(fecha => ({
        tiendaId: tiendaId as string,
        fecha: fecha.trim()
      }));
      
    } else {
      // Modo POST: requests en el body
      const { requests: bodyRequests } = req.body as { requests: TraficoRequest[] };
      
      if (!Array.isArray(bodyRequests) || bodyRequests.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de requests' });
      }
      
      requests = bodyRequests;
    }

    if (requests.length > 25) {
      return res.status(400).json({ error: 'Máximo 25 requests por llamada' });
    }

    // Configuración de la API externa
    const TRAFICO_API_TOKEN = process.env.TRAFICO_API_TOKEN;
    const TRAFICO_API_BASE_URL = process.env.TRAFICO_API_BASE_URL;
    
    const useExternalAPI = TRAFICO_API_TOKEN && TRAFICO_API_BASE_URL;

    // Procesar en chunks de 8 para optimizar concurrencia
    const chunkSize = 8;
    const chunks = [];
    for (let i = 0; i < requests.length; i += chunkSize) {
      chunks.push(requests.slice(i, i + chunkSize));
    }

    const allResults: TraficoResponse[] = [];

    // Procesar todos los chunks en paralelo
    const chunkPromises = chunks.map(async (chunk) => {
      const chunkPromises = chunk.map(async (request): Promise<TraficoResponse> => {
        try {
          if (useExternalAPI) {
            // Intentar API externa
            const apiUrl = new URL(`${TRAFICO_API_BASE_URL}/api/v1/rrhh/get_stores_access`);
            apiUrl.searchParams.append('store_code', request.tiendaId);
            apiUrl.searchParams.append('date', request.fecha);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos timeout

            const response = await fetch(apiUrl.toString(), {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${TRAFICO_API_TOKEN}`,
                'Content-Type': 'application/json'
              },
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              
              // Convertir datos al formato esperado por historical-traffic.ts
              const entradasPorHora: Record<string, { entradas: number; tickets: number; euros: number }> = {};
              
              if (data && data.data && Array.isArray(data.data)) {
                data.data.forEach((registro: any) => {
                  if (registro.hora !== undefined) {
                    const hora = parseInt(registro.hora);
                    const horaFormateada = `${hora.toString().padStart(2, '0')}:00`;
                    
                    if (!entradasPorHora[horaFormateada]) {
                      entradasPorHora[horaFormateada] = { entradas: 0, tickets: 0, euros: 0 };
                    }
                    
                    entradasPorHora[horaFormateada].entradas += Number(registro.entradas || 0);
                    entradasPorHora[horaFormateada].tickets += Number(registro.tickets || 0);
                    entradasPorHora[horaFormateada].euros += Number(registro.euros || 0);
                  }
                });
              }

              return {
                fecha: request.fecha,
                datos: {
                  entradasPorHora
                },
                simulado: false
              };
            }
          }
          
          // Fallback a datos simulados
          throw new Error('Usar datos simulados');
          
        } catch (error) {
          // Generar datos simulados
          return generarDatosSimuladosFecha(request.fecha);
        }
      });

      return Promise.all(chunkPromises);
    });

    // Esperar a que todos los chunks terminen
    const chunkResults = await Promise.all(chunkPromises);
    
    // Aplanar resultados
    chunkResults.forEach(chunkResult => {
      allResults.push(...chunkResult);
    });

    return res.status(200).json({
      success: true,
      resultados: allResults,
      total: allResults.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en trafico-bulk:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Error al procesar solicitudes de tráfico'
    });
  }
}

/**
 * Genera datos simulados para una fecha específica
 */
function generarDatosSimuladosFecha(fecha: string): TraficoResponse {
  const entradasPorHora: Record<string, { entradas: number; tickets: number; euros: number }> = {};
  
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
  
  // Generar datos con variación aleatoria basada en la fecha para consistencia
  const seed = fecha.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  const random = () => {
    const x = Math.sin(seed) * 10000;
    return (x - Math.floor(x)) * 0.4 - 0.2; // Variación entre -0.2 y 0.2
  };
  
  for (const hora in patronHorario) {
    const valorBase = patronHorario[parseInt(hora)];
    const variacion = random();
    
    const horaFormateada = `${hora.padStart(2, '0')}:00`;
    entradasPorHora[horaFormateada] = {
      entradas: Math.max(0, Math.round(valorBase.entradas * (1 + variacion))),
      tickets: Math.max(0, Math.round(valorBase.tickets * (1 + variacion))),
      euros: Math.max(0, Math.round(valorBase.euros * (1 + variacion) * 100) / 100)
    };
  }
  
  return {
    fecha,
    datos: {
      entradasPorHora
    },
    simulado: true
  };
} 