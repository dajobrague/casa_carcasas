import type { NextApiRequest, NextApiResponse } from 'next';
import { obtenerDatosTienda } from '@/lib/tienda/api-client';
import { obtenerDatosSemana, obtenerDiasLaborales } from '@/lib/semana/api-client';
import { obtenerTraficoDelDia, procesarActividadesEmpleados } from '@/lib/trafico/api-client';
import { calcularRecomendacionesDelDia } from '@/lib/trafico/calculadora';
import { generarResumenSemanal } from '@/lib/trafico/estadisticas';
import { RespuestaTraficoSemanal, TraficoDia, RecomendacionDiaria, EmpleadoActividad } from '@/lib/trafico/types';
import logger from '@/lib/logger';
import { obtenerActividadesDiarias } from '@/lib/airtable';

/**
 * API para obtener recomendaciones semanales basadas en tráfico
 * 
 * Parámetros:
 * - storeId: ID de la tienda en Airtable
 * - semanaId: ID de la semana en Airtable
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Añadir encabezados CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Responder directamente a las solicitudes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar método HTTP
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  
  console.log('API trafico-semana: Iniciando procesamiento');
  const errores: string[] = [];
  
  try {
    // Obtener parámetros de la solicitud
    const { storeId, semanaId } = req.query;
    
    // Validar parámetros
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere el ID de la tienda' 
      });
    }
    
    if (!semanaId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere el ID de la semana' 
      });
    }
    
    console.log(`API trafico-semana: Procesando tienda: ${storeId}, semana: ${semanaId}`);
    
    // 1. Obtener datos de la tienda
    const tienda = await obtenerDatosTienda(storeId as string);
    
    // 2. Obtener datos de la semana
    const semana = await obtenerDatosSemana(semanaId as string);
    
    // 3. Obtener días laborales de la semana
    const diasLaborales = await obtenerDiasLaborales(semanaId as string);
    console.log(`API trafico-semana: Encontrados ${diasLaborales.length} días laborales`);
    
    // Arreglos para almacenar datos procesados
    const traficosDiarios: TraficoDia[] = [];
    const recomendacionesDiarias: RecomendacionDiaria[] = [];
    const resultadosDiarios: any[] = [];
    
    // 4. Para cada día laboral, obtener tráfico y calcular recomendaciones
    for (const diaLaboral of diasLaborales) {
      try {
        // Verificar que tenemos una fecha válida
        if (!diaLaboral.fecha) {
          errores.push(`Día laboral ${diaLaboral.id} sin fecha definida`);
          continue;
        }
        
        // Obtener datos de tráfico
        let traficoDia: TraficoDia | null = null;
        try {
          // Usamos el número de tienda para obtener datos de tráfico
          // Si el número es 0 o inválido, se usarán datos simulados
          traficoDia = await obtenerTraficoDelDia(tienda.numero, diaLaboral.fecha);
          console.log(`API trafico-semana: Tráfico para ${diaLaboral.fecha}: ${traficoDia.metadatos.totalEntradas} entradas`);
        } catch (error) {
          const mensaje = error instanceof Error ? error.message : String(error);
          console.error(`Error al obtener tráfico para día ${diaLaboral.fecha}: ${mensaje}`);
          errores.push(`No se pudo obtener tráfico para ${diaLaboral.fecha}: ${mensaje}`);
          continue;
        }
        
        // Si tenemos datos de tráfico, calcular recomendaciones
        if (traficoDia) {
          traficosDiarios.push(traficoDia);
          
          const opciones = {
            atencionDeseada: tienda.atencionDeseada,
            crecimiento: tienda.factorCrecimiento,
            horarioApertura: diaLaboral.horarioApertura,
            horarioCierre: diaLaboral.horarioCierre,
            redondear: true
          };
          
          const recomendacionDiaria = calcularRecomendacionesDelDia(traficoDia, opciones, diaLaboral);
          recomendacionesDiarias.push(recomendacionDiaria);
          
          // Obtener actividades de empleados para este día
          let datosEmpleados: EmpleadoActividad[] = [];
          try {
            const actividadesDiarias = await obtenerActividadesDiarias(storeId as string, diaLaboral.id);
            datosEmpleados = procesarActividadesEmpleados(actividadesDiarias);
            console.log(`API trafico-semana: Encontrados ${datosEmpleados.length} empleados con actividades para ${diaLaboral.fecha}`);
          } catch (error) {
            const mensaje = error instanceof Error ? error.message : String(error);
            console.error(`Error al obtener actividades de empleados para ${diaLaboral.fecha}: ${mensaje}`);
            errores.push(`No se pudo obtener actividades de empleados para ${diaLaboral.fecha}: ${mensaje}`);
            // Continuamos aunque no tengamos datos de empleados
          }
          
          // Guardar resultados diarios
          resultadosDiarios.push({
            id: diaLaboral.id,
            fecha: diaLaboral.fecha,
            diaSemana: diaLaboral.diaSemana,
            nombre: diaLaboral.nombre,
            horarioApertura: diaLaboral.horarioApertura,
            horarioCierre: diaLaboral.horarioCierre,
            trafico: traficoDia,
            recomendaciones: recomendacionDiaria,
            empleados: datosEmpleados // Añadimos la información de empleados
          });
        }
      } catch (errorDia) {
        const mensaje = errorDia instanceof Error ? errorDia.message : String(errorDia);
        console.error(`Error procesando día ${diaLaboral.fecha}: ${mensaje}`);
        errores.push(`Error en día ${diaLaboral.fecha}: ${mensaje}`);
      }
    }
    
    // 5. Generar resumen semanal
    const resumenSemanal = generarResumenSemanal(traficosDiarios, recomendacionesDiarias);
    console.log(`API trafico-semana: Resumen semanal generado. Total entradas: ${resumenSemanal.totalEntradasSemana}, personal recomendado: ${resumenSemanal.totalPersonalRedondeado}`);
    
    // 6. Construir y enviar respuesta
    const respuesta: RespuestaTraficoSemanal = {
      success: true,
      timestamp: new Date().toISOString(),
      tienda: {
        id: tienda.id,
        nombre: tienda.nombre,
        codigo: tienda.codigo,
        atencionDeseada: tienda.atencionDeseada,
        crecimiento: tienda.factorCrecimiento
      },
      semana: {
        id: semana.id,
        nombre: semana.nombre,
        fechaInicio: semana.fechaInicio,
        fechaFin: semana.fechaFin
      },
      datos: {
        diasLaborales: resultadosDiarios,
        resumenSemanal
      }
    };
    
    // Incluir errores si los hay
    if (errores.length > 0) {
      respuesta.errores = errores;
      console.warn(`API trafico-semana: Completado con ${errores.length} errores`);
    } else {
      console.log('API trafico-semana: Procesamiento completado sin errores');
    }
    
    return res.status(200).json(respuesta);
    
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error(`Error en API trafico-semana: ${mensaje}`);
    
    // Incluir errores previos si los hay
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      mensaje,
      errores,
      timestamp: new Date().toISOString()
    });
  }
} 