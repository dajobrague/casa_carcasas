/**
 * Este archivo sirve como puente entre el sistema antiguo y el nuevo sistema modular de generación de PDFs.
 * Mantiene la misma interfaz pública que simple-pdf.ts pero usa internamente los nuevos módulos.
 */

import { generarPDFSemana } from './pdf-generator';
import { fetchPost } from './pdf-utils';

/**
 * Genera un PDF simple con el horario semanal de una tienda
 * Esta función mantiene la firma original para compatibilidad, pero usa la nueva implementación modular
 * 
 * @param storeId ID de la tienda en Airtable
 * @param semanaId ID de la semana en Airtable
 * @returns true si se generó correctamente, false en caso contrario
 */
export async function generarPDFSimple(storeId: string, semanaId: string): Promise<boolean> {
  try {
    console.log('===== UTILIZANDO EL PUENTE HACIA LA NUEVA ARQUITECTURA =====');
    console.log(`Bridge: Generando PDF para tienda ${storeId}, semana ${semanaId}`);
    
    // 1. Obtener información de la semana para extraer el nombre y la fecha de inicio
    const semanaResponse = await fetchPost('/api/semana', { id: semanaId });
    
    if (!semanaResponse.success || !semanaResponse.data) {
      throw new Error(`No se encontraron datos para la semana ${semanaId}`);
    }
    
    const semanaData = semanaResponse.data;
    const nombreSemana = semanaData.fields.Name || `Semana ${semanaId}`;
    const fechaInicio = semanaData.fields.FechaInicio || new Date().toISOString();
    
    console.log(`Bridge: Nombre de semana: ${nombreSemana}, Fecha inicio: ${fechaInicio}`);
    
    // 2. Usar la nueva implementación modular
    await generarPDFSemana(storeId, semanaId, fechaInicio, nombreSemana);
    
    console.log('Bridge: PDF generado exitosamente con la nueva arquitectura');
    return true;
  } catch (error) {
    console.error('Bridge: Error generando PDF:', error);
    return false;
  }
} 