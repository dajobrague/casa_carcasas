/**
 * Generador principal de PDFs
 * Este archivo sirve como punto de entrada principal para la generación de PDFs
 */
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchPost, formatearFecha } from './pdf-utils';
import { mostrarModalPreviewPDF, generarTablaConSlots } from './pdf-components';
import { procesarTraficoParaDia } from './pdf-traffic-processor';
import { calcularRecomendaciones } from './recomendaciones';

/**
 * Genera un PDF simple para una tienda y semana específicas
 */
export async function generarPDFSimple(
  idTienda: string,
  semanaId: string,
  semanaIsoString: string, 
  nombreSemana: string,
  mostrarModal = true
): Promise<Blob> {
  console.log(`[PDF-GENERATOR] Iniciando generación de PDF para tienda ${idTienda}, semana ${semanaId}`);
  try {
    // Crear instancia de jsPDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Configuración básica del documento
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Obtener datos de la tienda
    console.log(`[PDF-GENERATOR] Obteniendo datos para tienda ${idTienda}`);
    const tiendaResponse = await fetchPost('/api/tienda', { id: idTienda });
    const tiendaData = tiendaResponse.data;
    
    if (!tiendaData || !tiendaData.fields) {
      throw new Error(`No se encontraron datos para la tienda ${idTienda}`);
    }
    
    // Obtener datos de actividades para la semana
    console.log(`[PDF-GENERATOR] Obteniendo actividades para semana ${semanaId}`);
    const actividadesResponse = await fetchPost('/api/actividades', { 
      tiendaId: idTienda,
      semanaId: semanaId
    });
    
    const actividades = actividadesResponse.data || [];
    console.log(`[PDF-GENERATOR] Se encontraron ${actividades.length} actividades`);
    
    // Obtener datos básicos de la semana
    const fechaInicio = parseISO(semanaIsoString);
    const diasLaborales = [];
    
    // Generar array de días laborales (lunes a domingo)
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fechaInicio.getDate() + i);
      diasLaborales.push(fecha);
    }
    
    // Añadir encabezado
    añadirEncabezado(doc, tiendaData, nombreSemana);
    
    // Generar tabla de horarios con los slots
    let currentY = 40; // Posición inicial Y después del encabezado
    
    if (actividades.length > 0) {
      console.log(`[PDF-GENERATOR] Generando tabla de horarios para ${actividades.length} actividades`);
      currentY = generarTablaConSlots(actividades, tiendaData, doc, currentY);
      currentY += 10; // Espacio después de la tabla
    } else {
      console.log('[PDF-GENERATOR] No hay actividades para mostrar');
      doc.setFontSize(12);
      doc.setTextColor(150, 0, 0);
      doc.text('No hay actividades para la semana seleccionada', doc.internal.pageSize.width / 2, 50, { align: 'center' });
      currentY = 60;
    }
    
    // Procesar cada día para obtener datos de tráfico y recomendaciones
    // Este bloque es crítico para asegurar que se procesen todos los días
    console.log('[PDF-GENERATOR] Procesando datos de tráfico para cada día de la semana...');
    
    for (const fecha of diasLaborales) {
      const diaSemana = format(fecha, 'EEEE', { locale: es });
      const diaFormateado = format(fecha, 'yyyy-MM-dd');
      
      console.log(`[PDF-GENERATOR] ========== Procesando ${diaSemana} (${diaFormateado}) ==========`);
      
      // Procesar tráfico para este día
      await procesarTraficoParaDia(fecha, idTienda, tiendaData);
      
      // Agregar un separador para diferenciar cada día en la consola
      console.log('[PDF-GENERATOR] --------------------------------------------------------');
    }
    
    // Fecha de generación
    const fechaGeneracion = formatearFecha(new Date());
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado: ${fechaGeneracion}`, doc.internal.pageSize.width - 15, 10, { align: 'right' });
    
    // Generar PDF como blob
    console.log('[PDF-GENERATOR] Finalizando generación del PDF');
    const pdfBlob = doc.output('blob');
    
    // Mostrar modal con vista previa si se solicita
    if (mostrarModal) {
      console.log('[PDF-GENERATOR] Mostrando vista previa del PDF');
      const nombreArchivo = `${nombreSemana} - ${tiendaData.fields.Nombre || 'Tienda'}.pdf`;
      mostrarModalPreviewPDF(pdfBlob, nombreArchivo, nombreSemana);
    }
    
    return pdfBlob;
  } catch (error) {
    console.error('[PDF-GENERATOR] Error generando PDF:', error);
    throw error;
  }
}

/**
 * Añade el encabezado al PDF
 */
function añadirEncabezado(doc: jsPDF, tiendaData: any, nombreSemana: string): void {
  // Título principal
  doc.setFontSize(16);
  doc.setTextColor(64, 87, 109);
  doc.text(nombreSemana, doc.internal.pageSize.width / 2, 15, { align: 'center' });
  
  // Información de la tienda
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  const nombreTienda = tiendaData.fields.Nombre || 'Sin nombre';
  const direccion = tiendaData.fields.Direccion || 'Sin dirección';
  const pais = tiendaData.fields.PAIS || 'Sin país';
  
  doc.text(`Tienda: ${nombreTienda}`, 15, 25);
  doc.text(`Dirección: ${direccion}`, 15, 30);
  doc.text(`País: ${pais}`, 15, 35);
  
  // Fecha de generación
  const fechaGeneracion = formatearFecha(new Date());
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado: ${fechaGeneracion}`, doc.internal.pageSize.width - 15, 10, { align: 'right' });
}

/**
 * Genera un solo PDF con datos para una semana específica
 */
export async function generarPDFSemana(
  idTienda: string, 
  semanaId: string, 
  semanaIsoString: string, 
  nombreSemana: string
): Promise<void> {
  try {
    console.log('===== LLAMADA A LA NUEVA VERSIÓN DE generarPDFSemana =====');
    console.log(`[PDF-GENERATOR] Iniciando generación de PDF para semana: ${nombreSemana}`);
    await generarPDFSimple(idTienda, semanaId, semanaIsoString, nombreSemana);
    console.log('[PDF-GENERATOR] PDF generado exitosamente');
  } catch (error) {
    console.error('[PDF-GENERATOR] Error al generar PDF:', error);
    throw error;
  }
} 