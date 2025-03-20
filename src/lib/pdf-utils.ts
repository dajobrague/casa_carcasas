/**
 * Utilidades específicas para la generación de PDFs
 */
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Formatea una fecha según el formato especificado
 */
export function formatearFecha(fecha: Date, formatoFecha: string = 'dd/MM/yyyy'): string {
  try {
    return format(fecha, formatoFecha, { locale: es });
  } catch (error) {
    console.error('[PDF-UTILS] Error al formatear fecha:', error);
    return 'Fecha inválida';
  }
}

/**
 * Realiza una petición POST
 */
export async function fetchPost(url: string, data: any): Promise<any> {
  try {
    const response = await axios.post(url, data);
    return response.data;
  } catch (error) {
    console.error(`[PDF-UTILS] Error al realizar petición POST a ${url}:`, error);
    throw error;
  }
}

/**
 * Genera un color RGB aleatorio dentro de un rango
 */
export function colorAleatorio(min = 100, max = 220): [number, number, number] {
  const r = Math.floor(Math.random() * (max - min + 1)) + min;
  const g = Math.floor(Math.random() * (max - min + 1)) + min;
  const b = Math.floor(Math.random() * (max - min + 1)) + min;
  return [r, g, b];
}

/**
 * Convierte un color hexadecimal a componentes RGB
 */
export function hexARgb(hex: string): [number, number, number] {
  // Eliminar el # si existe
  hex = hex.replace(/^#/, '');
  
  // Convertir el hexadecimal a RGB
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  
  return [r, g, b];
}

/**
 * Genera un color RGB basado en un texto (hash del texto)
 */
export function colorDesdeTexto(texto: string): [number, number, number] {
  // Generar un hash simple del texto
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = texto.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convertir a componentes RGB, asegurando que no sean demasiado oscuros
  const r = Math.max(((hash >> 0) & 0xFF) % 200 + 55, 100);
  const g = Math.max(((hash >> 8) & 0xFF) % 200 + 55, 100);
  const b = Math.max(((hash >> 16) & 0xFF) % 200 + 55, 100);
  
  return [r, g, b];
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncarTexto(texto: string, longMax: number): string {
  if (!texto) return '';
  return texto.length > longMax ? texto.substring(0, longMax - 3) + '...' : texto;
}

/**
 * Devuelve un texto con mayúscula inicial
 */
export function capitalizarPrimeraLetra(texto: string): string {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

/**
 * Genera un array de IDs únicos para etiquetar elementos
 */
export function generarIdsUnicos(cantidad: number, prefijo = 'id-'): string[] {
  const ids: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    ids.push(`${prefijo}${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  }
  return ids;
}

/**
 * Limita un número entre un mínimo y un máximo
 */
export function limitarNumero(valor: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, valor));
}

/**
 * Formatea un número como euros
 */
export function formatearEuros(valor: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
}

/**
 * Comprueba si dos rangos de fechas se solapan
 */
export function fechasSolapadas(
  inicio1: Date, 
  fin1: Date, 
  inicio2: Date, 
  fin2: Date
): boolean {
  return inicio1 <= fin2 && inicio2 <= fin1;
}

/**
 * Convierte minutos a formato hora:minutos
 */
export function minutosAHora(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Convierte una hora en formato "HH:MM" a minutos
 */
export function horaAMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Compara dos horas en formato "HH:MM"
 * Retorna -1 si hora1 < hora2, 0 si son iguales, 1 si hora1 > hora2
 */
export function compararHoras(hora1: string, hora2: string): number {
  const minutos1 = horaAMinutos(hora1);
  const minutos2 = horaAMinutos(hora2);
  
  if (minutos1 < minutos2) return -1;
  if (minutos1 > minutos2) return 1;
  return 0;
}

/**
 * Captura el contenido completo de un iframe y lo descarga como PDF
 * Esta función maneja correctamente el contenido con scroll
 * @param iframe Elemento iframe a capturar
 * @param filename Nombre del archivo PDF a descargar
 */
export async function captureIframeAsPdf(iframe: HTMLIFrameElement, filename: string): Promise<void> {
  try {
    if (!iframe || !iframe.contentWindow) {
      console.error('El iframe no está disponible o no tiene contentWindow');
      return;
    }

    // Referencia al documento del iframe
    const iframeDocument = iframe.contentWindow.document;
    const iframeBody = iframeDocument.body;
    const iframeHtml = iframeDocument.documentElement;

    // Guardar dimensiones y estilos originales
    const originalHeight = iframeHtml.style.height;
    const originalOverflow = iframeHtml.style.overflow;
    const originalBodyHeight = iframeBody.style.height;
    const originalBodyOverflow = iframeBody.style.overflow;
    const originalScrollTop = iframeHtml.scrollTop;
    
    // Obtener dimensiones reales del contenido
    const scrollHeight = Math.max(
      iframeBody.scrollHeight,
      iframeHtml.scrollHeight,
      iframeBody.offsetHeight,
      iframeHtml.offsetHeight,
      iframeBody.clientHeight,
      iframeHtml.clientHeight
    );
    
    // Obtener ancho real del contenido
    const scrollWidth = Math.max(
      iframeBody.scrollWidth,
      iframeHtml.scrollWidth,
      iframeBody.offsetWidth,
      iframeHtml.offsetWidth,
      iframeBody.clientWidth,
      iframeHtml.clientWidth
    );

    console.log(`Capturando contenido con dimensiones: ${scrollWidth}x${scrollHeight}`);
    
    try {
      // Asegurar que todos los estilos se hayan cargado
      await forceStylesLoading(iframeDocument);
      
      // Aplicar estilos adicionales para mejorar la impresión
      const printStyleTag = iframeDocument.createElement('style');
      printStyleTag.innerHTML = `
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        body {
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        @page {
          size: landscape;
          margin: 0;
        }
        .no-print {
          display: none !important;
        }
      `;
      iframeDocument.head.appendChild(printStyleTag);
      
      // Modificar los estilos para hacer visible todo el contenido
      iframeHtml.style.height = 'auto';
      iframeHtml.style.overflow = 'visible';
      iframeBody.style.height = 'auto';
      iframeBody.style.overflow = 'visible';
      iframeHtml.scrollTop = 0;
      
      // Agregar pequeño retraso para asegurar que los estilos se aplican
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Opciones específicas para asegurar la captura de todo el contenido
      const options = {
        allowTaint: true,
        useCORS: true,
        scale: 2,                  // Mayor escala para mejor calidad
        scrollX: 0,
        scrollY: 0,
        windowWidth: scrollWidth,
        windowHeight: scrollHeight,
        width: scrollWidth,
        height: scrollHeight,
        x: 0,
        y: 0,
        logging: false,
        backgroundColor: '#ffffff', // Asegurar fondo blanco
        ignoreElements: (element: Element) => {
          if (element.classList?.contains('no-print')) return true;
          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') return true;
          return false;
        },
        onclone: (clonedDoc: Document) => {
          // Asegurar que los estilos se apliquen correctamente en el clon
          const styleSheets = Array.from(iframeDocument.styleSheets);
          styleSheets.forEach(sheet => {
            try {
              if (sheet.cssRules) {
                const newStyle = clonedDoc.createElement('style');
                Array.from(sheet.cssRules).forEach(rule => {
                  newStyle.appendChild(clonedDoc.createTextNode(rule.cssText));
                });
                clonedDoc.head.appendChild(newStyle);
              }
            } catch (e) {
              console.warn('No se pudo acceder a cssRules:', e);
            }
          });
        }
      };

      // Capturar el contenido completo
      console.log('Iniciando captura del contenido...');
      const canvas = await html2canvas(iframeBody, options);
      console.log('Captura completada con dimensiones:', canvas.width, 'x', canvas.height);

      // Crear PDF en orientación horizontal
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Dimensiones de página A4 horizontal (ancho: 297mm, alto: 210mm)
      const pdfWidth = 297;
      const pdfHeight = 210;
      
      // Márgenes
      const marginX = 10;
      const marginY = 10;
      const contentWidth = pdfWidth - (marginX * 2);
      const contentHeight = pdfHeight - (marginY * 2);
      
      // Calcular la relación de aspecto del contenido
      const canvasRatio = canvas.height / canvas.width;
      
      // Tamaño de la imagen en el PDF
      const imgWidth = contentWidth;
      const totalImgHeight = imgWidth * canvasRatio;
      
      // Calcular el número de páginas
      const pageHeight = contentHeight;
      const totalPages = Math.ceil(totalImgHeight / pageHeight);
      
      console.log(`El documento requiere ${totalPages} páginas`);
      
      // Crear cada página
      for (let i = 0; i < totalPages; i++) {
        // Añadir página excepto para la primera
        if (i > 0) {
          pdf.addPage();
        }
        
        // Calcular qué parte del canvas se mostrará en esta página
        const pageImgHeight = Math.min(totalImgHeight - (i * pageHeight), pageHeight);
        
        // Altura proporcional en el canvas
        const canvasPartHeight = (pageImgHeight / totalImgHeight) * canvas.height;
        
        // Posición Y en el canvas
        const canvasPartY = i * (canvas.height / totalPages);
        
        // Crear un canvas temporal para esta sección
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvasPartHeight;
        
        // Dibujar la sección correspondiente del canvas original
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas, 
            0, canvasPartY, 
            canvas.width, canvasPartHeight, 
            0, 0, 
            tempCanvas.width, tempCanvas.height
          );
          
          // Añadir esta sección al PDF
          pdf.addImage(
            tempCanvas.toDataURL('image/jpeg', 1.0),  // Calidad máxima
            'JPEG',
            marginX,
            marginY,
            imgWidth,
            pageImgHeight
          );
          
          // Añadir indicador de continuación si no es la última página
          if (i < totalPages - 1) {
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text('(continúa en la siguiente página)', pdfWidth/2, pdfHeight - 5, { align: 'center' });
          }
        }
      }

      // Guardar el PDF
      pdf.save(filename);
      console.log('PDF guardado exitosamente');
      
      // Eliminar el estilo temporal
      if (printStyleTag.parentNode) {
        printStyleTag.parentNode.removeChild(printStyleTag);
      }
    } finally {
      // Restaurar los estilos originales
      iframeHtml.style.height = originalHeight;
      iframeHtml.style.overflow = originalOverflow;
      iframeBody.style.height = originalBodyHeight;
      iframeBody.style.overflow = originalBodyOverflow;
      iframeHtml.scrollTop = originalScrollTop;
    }
  } catch (error) {
    console.error('Error al capturar iframe como PDF:', error);
    alert('Hubo un error al generar el PDF. Inténtalo de nuevo o contacta con soporte.');
  }
}

/**
 * Fuerza la carga de todas las hojas de estilo en un documento
 * @param doc Documento HTML
 */
async function forceStylesLoading(doc: Document): Promise<void> {
  // Obtener todas las hojas de estilo externas
  const linkElements = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  
  // Si no hay hojas de estilo externas, no hacer nada
  if (linkElements.length === 0) return;
  
  try {
    // Esperar a que todas las hojas de estilo estén cargadas
    await Promise.all(
      linkElements.map(link => {
        return new Promise<void>((resolve) => {
          // Si ya está cargado, resolver inmediatamente
          if ((link as HTMLLinkElement).sheet) {
            resolve();
            return;
          }
          
          // De lo contrario, esperar al evento load o error
          link.addEventListener('load', () => resolve());
          link.addEventListener('error', () => {
            console.warn('Error al cargar hoja de estilo:', (link as HTMLLinkElement).href);
            resolve(); // Resolver de todos modos para no bloquear
          });
        });
      })
    );
    
    console.log(`${linkElements.length} hojas de estilo procesadas`);
  } catch (error) {
    console.warn('Error al procesar hojas de estilo:', error);
  }
} 