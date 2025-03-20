import { TraficoDia, RecomendacionDiaria } from './types';
import logger from '@/lib/logger';

/**
 * Interfaz para el resumen semanal de tráfico y recomendaciones
 */
interface ResumenSemanal {
  totalEntradasSemana: number;
  totalPersonalRecomendado: number;
  totalPersonalRedondeado: number;
  promedioEntradasDiario: number;
  diaMayorTrafico: string;
  entradasDiaMayorTrafico: number;
}

/**
 * Genera un resumen semanal a partir de los datos de tráfico y recomendaciones diarias
 * @param traficosDiarios Array de objetos de tráfico diario
 * @param recomendacionesDiarias Array de objetos de recomendaciones diarias
 * @returns Resumen semanal con estadísticas agregadas
 */
export function generarResumenSemanal(
  traficosDiarios: TraficoDia[], 
  recomendacionesDiarias: RecomendacionDiaria[]
): ResumenSemanal {
  try {
    // Inicializar variables para acumular
    let totalEntradasSemana = 0;
    let totalPersonalRecomendado = 0;
    let totalPersonalRedondeado = 0;
    let diaMayorTrafico = '';
    let entradasDiaMayorTrafico = 0;
    
    // Procesar datos de tráfico diario
    for (const traficoDia of traficosDiarios) {
      const entradasDia = traficoDia.metadatos.totalEntradas;
      totalEntradasSemana += entradasDia;
      
      // Identificar el día con mayor tráfico
      if (entradasDia > entradasDiaMayorTrafico) {
        entradasDiaMayorTrafico = entradasDia;
        diaMayorTrafico = traficoDia.fecha;
      }
    }
    
    // Procesar recomendaciones diarias
    for (const recomendacionDiaria of recomendacionesDiarias) {
      totalPersonalRecomendado += recomendacionDiaria.metadatos.totalPersonalRecomendado;
      totalPersonalRedondeado += recomendacionDiaria.metadatos.totalPersonalRedondeado;
    }
    
    // Calcular promedio diario
    const diasConDatos = traficosDiarios.length;
    const promedioEntradasDiario = diasConDatos > 0 
      ? Math.round(totalEntradasSemana / diasConDatos) 
      : 0;
    
    // Construir y devolver el resumen
    return {
      totalEntradasSemana,
      totalPersonalRecomendado: Math.round(totalPersonalRecomendado * 100) / 100,
      totalPersonalRedondeado: Math.round(totalPersonalRedondeado),
      promedioEntradasDiario,
      diaMayorTrafico,
      entradasDiaMayorTrafico
    };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error(`Error al generar resumen semanal: ${mensaje}`);
    
    // Devolver un resumen con valores predeterminados en caso de error
    return {
      totalEntradasSemana: 0,
      totalPersonalRecomendado: 0,
      totalPersonalRedondeado: 0,
      promedioEntradasDiario: 0,
      diaMayorTrafico: '',
      entradasDiaMayorTrafico: 0
    };
  }
}

/**
 * Formatea las estadísticas para visualización en consola (útil para depuración)
 * @param resumenSemanal Resumen semanal de tráfico y recomendaciones
 * @returns Cadena formateada para visualización
 */
export function formatearResumenParaConsola(resumenSemanal: ResumenSemanal): string {
  const fechaFormateada = resumenSemanal.diaMayorTrafico 
    ? new Date(resumenSemanal.diaMayorTrafico).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'No disponible';
  
  return `
🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷
📊 RESUMEN SEMANAL DE TRÁFICO Y RECOMENDACIONES
🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷

👥 RESULTADOS GLOBALES:
--------------------------------------------------
📈 Total entradas registradas:       ${resumenSemanal.totalEntradasSemana}
👤 Total personal recomendado:       ${resumenSemanal.totalPersonalRecomendado}
👥 Total personal (redondeado):      ${resumenSemanal.totalPersonalRedondeado}

📊 ESTADÍSTICAS:
--------------------------------------------------
📊 Promedio de entradas diarias:     ${resumenSemanal.promedioEntradasDiario} entradas/día
🔝 Día con mayor tráfico:            ${fechaFormateada}
   └─ Total entradas ese día:        ${resumenSemanal.entradasDiaMayorTrafico}

💡 INDICADORES:
--------------------------------------------------
🔄 Proporción personal/100 entradas: ${(resumenSemanal.totalPersonalRecomendado / resumenSemanal.totalEntradasSemana * 100).toFixed(2)}
⏱️ Entradas promedio por hora:       ${(resumenSemanal.promedioEntradasDiario / 12).toFixed(2)} (estimado en 12h/día)

🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷����🔷🔷🔷🔷🔷🔷
`;
} 