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
      return res.status(500).json({ 
        error: 'No se ha configurado la API de tráfico correctamente',
        missingTokens: !TRAFICO_API_TOKEN,
        missingUrl: !TRAFICO_API_BASE_URL
      });
    }
    
    console.log('Consultando tráfico para tienda:', tiendaId);
    console.log('Rango de fechas:', fechaInicio, 'a', fechaFin);
    
    // Intentar usar la API real, con la nueva ruta y parámetros correctos
    try {
      // Construir URL para la API externa con la ruta correcta
      const apiBaseUrl = TRAFICO_API_BASE_URL as string;
      const apiUrl = new URL(`${apiBaseUrl}/api/v1/rrhh/get_stores_access`);
      
      // Usar los parámetros correctos
      apiUrl.searchParams.append('store_code', tiendaId as string);
      apiUrl.searchParams.append('date', fechaInicio as string); // Usamos fechaInicio como date
      
      console.log('Intentando conectar con URL:', apiUrl.toString());
      
      // Realizar solicitud a la API externa
      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TRAFICO_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Verificar respuesta
      if (!response.ok) {
        console.error('Error en la API de tráfico:', response.status, response.statusText);
        const errorData = await response.text();
        console.error('Detalle del error:', errorData);
        
        // Si hay error, caer en la generación de datos simulados
        throw new Error(`Error al conectar con la API: ${response.status} ${response.statusText}`);
      }
      
      // Procesar respuesta
      const data = await response.json();
      console.log('Datos recibidos de la API:', JSON.stringify(data).substring(0, 200) + '...');
      
      // Convertir datos al formato esperado por el frontend
      const entradasPorHora: Record<string, number> = {};
      
      // La API devuelve un array de objetos con la estructura:
      // {"tienda":"1", "fecha":"2024-09-28", "hora":"7", "entradas":0, ...}
      if (data && data.data && Array.isArray(data.data)) {
        data.data.forEach((registro: any) => {
          if (registro.hora && registro.entradas !== undefined) {
            // Convertir el formato de hora (de "7" a "07:00")
            const hora = parseInt(registro.hora);
            const horaFormateada = `${hora.toString().padStart(2, '0')}:00`;
            
            // Sumar las entradas para esta hora
            if (entradasPorHora[horaFormateada] === undefined) {
              entradasPorHora[horaFormateada] = 0;
            }
            entradasPorHora[horaFormateada] += Number(registro.entradas);
          }
        });
      }
      
      console.log('Entradas procesadas por hora:', entradasPorHora);
      
      // Devolver datos procesados
      return res.status(200).json({
        tiendaId: tiendaId,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        entradasPorHora,
        // Metadatos para debug
        timestamp: new Date().toISOString(),
        simulado: false
      });
      
    } catch (apiError) {
      // Si hay error al conectar con la API, generar datos simulados
      console.error('Error al conectar con API, generando datos simulados:', apiError);
      console.log('Generando datos de ejemplo para el tráfico');
      
      // Generar datos de prueba para entradas por hora
      const entradasPorHora: Record<string, number> = {};
      
      // Fechas de inicio y fin
      const inicio = new Date(fechaInicio as string);
      const fin = new Date(fechaFin as string);
      
      // Número de días entre fechas
      const diasDiferencia = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      
      // Patrón de tráfico diario (promedio)
      const patronHorario: Record<number, number> = {
        9: 15,  // 9:00 AM - 15 entradas por hora
        10: 25, // 10:00 AM - 25 entradas por hora
        11: 35, // 11:00 AM - 35 entradas por hora
        12: 45, // 12:00 PM - 45 entradas por hora
        13: 50, // 1:00 PM - 50 entradas por hora
        14: 40, // 2:00 PM - 40 entradas por hora
        15: 30, // 3:00 PM - 30 entradas por hora
        16: 35, // 4:00 PM - 35 entradas por hora
        17: 45, // 5:00 PM - 45 entradas por hora
        18: 50, // 6:00 PM - 50 entradas por hora
        19: 40, // 7:00 PM - 40 entradas por hora
        20: 25  // 8:00 PM - 25 entradas por hora
      };
      
      // Para cada hora del día, generar un valor de tráfico
      for (const hora in patronHorario) {
        const valorBase = patronHorario[parseInt(hora)];
        
        // Agregar alguna variación aleatoria (±20%)
        const variacion = (Math.random() - 0.5) * 0.4; // Entre -0.2 y 0.2
        const valorConVariacion = Math.round(valorBase * (1 + variacion));
        
        // Guardar el valor para esta hora (formato "HH:00")
        const horaFormateada = `${hora.padStart(2, '0')}:00`;
        entradasPorHora[horaFormateada] = valorConVariacion;
      }
      
      // Devolver datos simulados
      return res.status(200).json({
        tiendaId: tiendaId,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        diasConsultados: diasDiferencia,
        entradasPorHora,
        // Metadatos para debug
        simulado: true,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error: any) {
    console.error('Error en el endpoint de tráfico:', error);
    
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 