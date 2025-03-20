import type { NextApiRequest, NextApiResponse } from 'next';
import { calcularRecomendaciones, generarDatosTraficoSimulados, OpcionesRecomendacion } from '@/lib/recomendaciones';
import { format, parse, isValid } from 'date-fns';
import logger from '@/lib/logger';

/**
 * Endpoint para obtener recomendaciones de personal
 * Basado en datos de tráfico y parámetros de la tienda
 * 
 * Params:
 * - storeCode: Código de la tienda
 * - startDate: Fecha de inicio (YYYY-MM-DD)
 * - endDate: Fecha de fin (YYYY-MM-DD)
 * - atencionDeseada: (opcional) Valor de atención deseada
 * - crecimiento: (opcional) Porcentaje de crecimiento en formato decimal (ej: 0.15 para 15%)
 * - horarioApertura: (opcional) Horario de apertura (HH:MM)
 * - horarioCierre: (opcional) Horario de cierre (HH:MM)
 * - redondear: (opcional) Si se debe redondear al entero más cercano ('true'/'false')
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Solo admitir método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Obtener parámetros de la URL
    const { storeCode, startDate, endDate, atencionDeseada, crecimiento, horarioApertura, horarioCierre, redondear } = req.query;
    
    // Validación de parámetros obligatorios
    if (!storeCode) {
      logger.warn('API Recomendaciones: Falta el parámetro storeCode');
      return res.status(400).json({ error: 'El parámetro storeCode es obligatorio' });
    }
    
    if (!startDate) {
      logger.warn('API Recomendaciones: Falta el parámetro startDate');
      return res.status(400).json({ error: 'El parámetro startDate es obligatorio' });
    }
    
    if (!endDate) {
      logger.warn('API Recomendaciones: Falta el parámetro endDate');
      return res.status(400).json({ error: 'El parámetro endDate es obligatorio' });
    }
    
    // Validar formato de fechas
    const parsedStartDate = parse(startDate as string, 'yyyy-MM-dd', new Date());
    const parsedEndDate = parse(endDate as string, 'yyyy-MM-dd', new Date());
    
    if (!isValid(parsedStartDate)) {
      logger.warn(`API Recomendaciones: Formato de fecha incorrecto startDate=${startDate}`);
      return res.status(400).json({ error: 'El formato de startDate debe ser YYYY-MM-DD' });
    }
    
    if (!isValid(parsedEndDate)) {
      logger.warn(`API Recomendaciones: Formato de fecha incorrecto endDate=${endDate}`);
      return res.status(400).json({ error: 'El formato de endDate debe ser YYYY-MM-DD' });
    }
    
    // Formatear fechas en el formato correcto
    const formattedStartDate = format(parsedStartDate, 'yyyy-MM-dd');
    const formattedEndDate = format(parsedEndDate, 'yyyy-MM-dd');
    
    // Obtener datos de tráfico para el rango de fechas y la tienda
    // TODO: Implementar la obtención de datos reales desde la API de tráfico
    // Por ahora, utilizamos datos simulados para propósitos de demostración
    const trafico = await generarDatosTraficoSimulados(formattedStartDate, formattedEndDate);
    
    // Configurar opciones para el cálculo
    const opciones: OpcionesRecomendacion = {
      atencionDeseada: atencionDeseada ? parseFloat(atencionDeseada as string) : 25,
      crecimiento: crecimiento ? parseFloat(crecimiento as string) : 0.0,
      redondear: redondear === 'true',
    };
    
    // Agregar horarios si están presentes
    if (horarioApertura) {
      opciones.horarioApertura = horarioApertura as string;
    }
    
    if (horarioCierre) {
      opciones.horarioCierre = horarioCierre as string;
    }
    
    // Calcular recomendaciones
    const resultados = calcularRecomendaciones(trafico, opciones);
    
    // Log para depuración
    logger.debug(`API Recomendaciones: Calculadas ${Object.keys(resultados.recomendaciones).length} recomendaciones para tienda ${storeCode}`);
    
    // Devolver resultados
    return res.status(200).json({
      storeCode,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      resultados
    });
    
  } catch (error) {
    logger.error(`API Recomendaciones: Error inesperado: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
} 