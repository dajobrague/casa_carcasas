import { jsPDF } from 'jspdf';
// Importar jspdf-autotable usando la importación específica para TypeScript
import autoTable from 'jspdf-autotable';

// Interfaces necesarias para usar los tipos correctos
interface TiendaData {
  id: string;
  fields: {
    TIENDA?: string;
    PAIS?: string;
    Apertura?: string; // Formato HH:MM
    Cierre?: string;   // Formato HH:MM
    "Atención Deseada"?: Record<string, number | string> | number | string; // Puede ser un objeto por hora o un número simple
    "Atencion Deseada"?: Record<string, number | string> | number | string; // Variante sin tilde
    [key: string]: any;
  };
}

/**
 * Módulo para manejar la lógica de cálculo de Atención Deseada y tráfico
 */

interface DatosTrafico {
  tiendaId: string;
  fechaInicio: string;
  fechaFin: string;
  entradasPorHora: Record<string, number>;
  simulado?: boolean;
  timestamp?: string;
}

interface RecomendacionPorHora {
  entradas: number;
  recomendacion: number;
  detalles: {
    formula: string;
    factor: string;
    divisor: string;
    calculoCompleto: string;
  };
}

interface ResultadoRecomendaciones {
  horaApertura: number;
  horaCierre: number;
  recomendaciones: Record<string, RecomendacionPorHora>;
  timestamp: string;
}

/**
 * Calcula las recomendaciones de personal basadas en el tráfico
 * 
 * @param entradasPorHora - Datos de entradas por hora
 * @param atencionDeseada - Valor de atención deseada
 * @param crecimiento - Valor de crecimiento en porcentaje (entre 0 y 1)
 * @param horarioTienda - Horario de la tienda en formato "HH:MM-HH:MM"
 * @returns Objeto con las recomendaciones calculadas
 */
export function calcularRecomendacionesPersonal(
  entradasPorHora: Record<string, number>,
  atencionDeseada: number,
  crecimiento: number,
  horarioTienda?: string
): ResultadoRecomendaciones {
  // Validar parámetros
  if (!entradasPorHora || Object.keys(entradasPorHora).length === 0) {
    throw new Error("No hay datos de tráfico disponibles");
  }
  
  if (!atencionDeseada || atencionDeseada <= 0) {
    throw new Error(`Atención Deseada inválida: ${atencionDeseada}`);
  }
  
  // Extraer horario de la tienda
  let horaApertura = 10;
  let horaCierre = 22;
  
  if (horarioTienda) {
    const partes = horarioTienda.split('-');
    if (partes.length === 2) {
      horaApertura = parseInt(partes[0].split(':')[0]);
      horaCierre = parseInt(partes[1].split(':')[0]);
    }
  }
  
  // Inicializar resultados
  const recomendaciones: Record<string, RecomendacionPorHora> = {};
  
  // Calcular para cada hora
  for (const [hora, entradas] of Object.entries(entradasPorHora)) {
    const horaNum = parseInt(hora.split(':')[0]);
    
    // Solo procesar horas dentro del horario de la tienda
    if (horaNum >= horaApertura && horaNum < horaCierre) {
      // Aplicar fórmula: (Entradas * (1 + Crecimiento)) / (Atención Deseada / 2)
      const factor = (1 + crecimiento);
      const divisor = (atencionDeseada / 2);
      const recomendacion = Math.round((entradas * factor) / divisor * 100) / 100;
      
      recomendaciones[hora] = {
        entradas,
        recomendacion,
        detalles: {
          formula: `(${entradas} * (1 + ${(crecimiento * 100).toFixed(2)}%)) / (${atencionDeseada} / 2)`,
          factor: factor.toFixed(2),
          divisor: divisor.toFixed(2),
          calculoCompleto: `(${entradas} * ${factor.toFixed(2)}) / ${divisor.toFixed(2)} = ${recomendacion}`
        }
      };
    }
  }
  
  return {
    horaApertura,
    horaCierre,
    recomendaciones,
    timestamp: new Date().toISOString()
  };
}

/**
 * Obtiene las horas enteras que caen dentro del horario de la tienda
 * 
 * @param horarioTienda - Horario de la tienda en formato "HH:MM-HH:MM"
 * @returns Array de horas en formato "HH:00"
 */
export function obtenerHorasCompletas(horarioTienda?: string): string[] {
  // Valores por defecto
  let horaApertura = 10;
  let horaCierre = 22;
  
  // Extraer horario si está disponible
  if (horarioTienda) {
    const partes = horarioTienda.split('-');
    if (partes.length === 2) {
      horaApertura = parseInt(partes[0].split(':')[0]);
      horaCierre = parseInt(partes[1].split(':')[0]);
    }
  }
  
  // Generar array de horas completas
  const horas: string[] = [];
  
  for (let hora = horaApertura; hora < horaCierre; hora++) {
    horas.push(`${hora.toString().padStart(2, '0')}:00`);
  }
  
  return horas;
}

/**
 * Filtra un objeto de entradas por hora para incluir solo horas completas
 * 
 * @param entradasPorHora - Objeto con entradas por hora
 * @returns Objeto filtrado con solo las horas completas
 */
export function filtrarHorasCompletas(entradasPorHora: Record<string, number>): Record<string, number> {
  const resultado: Record<string, number> = {};
  
  // Filtrar solo las horas que terminan en ":00"
  for (const [hora, entradas] of Object.entries(entradasPorHora)) {
    if (hora.endsWith(':00')) {
      resultado[hora] = entradas;
    }
  }
  
  return resultado;
}

/**
 * Genera una tabla para mostrar en el PDF con la atención deseada y las recomendaciones
 * 
 * @param recomendaciones - Objeto con las recomendaciones calculadas
 * @param atencionDeseada - Valor de atención deseada
 * @returns Datos para generar la tabla en el PDF
 */
export function generarDatosTablaAtencion(
  recomendaciones: ResultadoRecomendaciones,
  atencionDeseada: number
): { cabeceras: string[], filas: any[][] } {
  const { recomendaciones: recomendacionesPorHora } = recomendaciones;
  
  // Ordenar horas
  const horasOrdenadas = Object.keys(recomendacionesPorHora).sort();
  
  // Generar cabeceras
  const cabeceras = ['Hora', 'Entradas', 'Atención Deseada', 'Recomendación'];
  
  // Generar filas
  const filas = horasOrdenadas.map(hora => {
    const { entradas, recomendacion } = recomendacionesPorHora[hora];
    
    return [
      hora,
      entradas,
      atencionDeseada,
      Math.ceil(recomendacion) // Redondeamos hacia arriba para asegurar cobertura
    ];
  });
  
  return { cabeceras, filas };
}

export default {
  calcularRecomendacionesPersonal,
  obtenerHorasCompletas,
  filtrarHorasCompletas,
  generarDatosTablaAtencion
};

/**
 * Genera una tabla con la información de "Atención Deseada" en slots de hora
 * 
 * @param tiendaData - Datos de la tienda con la información de "Atención Deseada"
 * @param doc - Documento PDF donde se insertará la tabla
 * @param startY - Posición Y donde comenzar a dibujar
 * @param slots - Slots de tiempo originales (15 o 30 minutos)
 * @param slotsAgrupados - Slots agrupados que se muestran en la tabla principal
 * @returns La nueva posición Y después de dibujar la tabla
 */
export function generarTablaAtencionDeseada(
  tiendaData: TiendaData,
  doc: jsPDF,
  startY: number,
  slots: string[],
  slotsAgrupados: string[]
): number {
  console.log('Verificando datos de atención deseada:', tiendaData.fields);
  
  // Verificar si existe información de "Atención Deseada" (con o sin tilde)
  const atencionDeseadaRaw = tiendaData.fields["Atención Deseada"] || tiendaData.fields["Atencion Deseada"];
  
  // Log para depuración
  console.log('Datos de atención deseada encontrados:', atencionDeseadaRaw, typeof atencionDeseadaRaw);
  
  // Si no hay datos de atención deseada, no mostrar la tabla
  if (atencionDeseadaRaw === undefined || atencionDeseadaRaw === null) {
    console.log('No hay información de Atención Deseada disponible');
    return startY; // No dibujar nada si no hay datos
  }
  
  // Preparar título para la tabla
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  
  // Obtener la hora de cierre de la tienda
  const horaCierre = tiendaData.fields.Cierre 
    ? parseInt(tiendaData.fields.Cierre.split(':')[0]) 
    : 22; // Valor por defecto
  
  console.log(`Hora de cierre de la tienda: ${horaCierre}:00`);
  
  // Agrupar slots por hora y filtrar para excluir la hora de cierre
  // Ejemplo: ["10:00", "10:30", "11:00"] => {"10": ["10:00", "10:30"], "11": ["11:00"]}
  const slotsPorHora: Record<string, string[]> = {};
  
  slotsAgrupados.forEach(slot => {
    const hora = slot.split(':')[0];
    const horaNum = parseInt(hora);
    
    // Solo incluir slots antes de la hora de cierre
    if (horaNum < horaCierre) {
      if (!slotsPorHora[hora]) {
        slotsPorHora[hora] = [];
      }
      slotsPorHora[hora].push(slot);
    }
  });
  
  // Preparar encabezados para la tabla
  // Solo mostramos las horas, no los minutos
  const horas = Object.keys(slotsPorHora).sort((a, b) => parseInt(a) - parseInt(b));
  console.log('Horas disponibles para atención deseada (excluyendo hora de cierre):', horas);
  
  // Si no hay horas después de filtrar, no mostrar la tabla
  if (horas.length === 0) {
    console.log('No hay horas disponibles dentro del horario de apertura');
    return startY;
  }
  
  // Verificar si tenemos datos de recomendaciones calculadas
  let recomendacionesTiene = false;
  let recomendaciones: any = {};
  
  // Intentar obtener las recomendaciones de la variable global
  if (typeof window !== 'undefined' && (window as any).recomendacionesCalculadas) {
    recomendacionesTiene = true;
    recomendaciones = (window as any).recomendacionesCalculadas.recomendaciones;
    console.log('Datos de recomendaciones encontrados para incluir en la tabla:', 
      Object.keys(recomendaciones).length);
  } else {
    console.log('No se encontraron datos de recomendaciones para incluir en la tabla');
  }
  
  // Título para la sección
  doc.text('Datos de Gestión por Hora:', 5, startY);
  
  // Añadir un pequeño espacio después del título
  startY += 4;
  
  // Convertir datos a formato adecuado para la tabla
  // Primera fila: Atención Deseada
  const rowAtencionDeseada: string[] = [];
  
  // Segunda fila: Recomendaciones basadas en tráfico
  const rowRecomendaciones: string[] = [];
  
  // Tercera fila: Ratio Tráfico
  const rowTrafico: string[] = [];
  
  // Manejar el caso donde "Atención Deseada" es un número simple
  if (typeof atencionDeseadaRaw === 'number' || typeof atencionDeseadaRaw === 'string') {
    const valorGeneral = String(atencionDeseadaRaw);
    console.log(`Usando el mismo valor de atención (${valorGeneral}) para todas las horas`);
    
    // Repetir el mismo valor para todas las horas
    horas.forEach(hora => {
      // Atención deseada
      rowAtencionDeseada.push(valorGeneral);
      
      // Recomendaciones
      const horaCompleta = `${hora.padStart(2, '0')}:00`;
      if (recomendacionesTiene && recomendaciones[horaCompleta]) {
        const valor = recomendaciones[horaCompleta].recomendacion.toFixed(2);
        rowRecomendaciones.push(valor);
        
        // Tráfico
        const entradas = recomendaciones[horaCompleta].entradas || 0;
        rowTrafico.push(String(entradas));
      } else {
        rowRecomendaciones.push('-');
        rowTrafico.push('-');
      }
    });
  } else {
    // Es un objeto, usar los valores específicos por hora
    const atencionDeseada = atencionDeseadaRaw as Record<string, number | string>;
    
    horas.forEach(hora => {
      // Atención deseada
      const valor = atencionDeseada[hora] !== undefined ? String(atencionDeseada[hora]) : '-';
      rowAtencionDeseada.push(valor);
      
      // Recomendaciones
      const horaCompleta = `${hora.padStart(2, '0')}:00`;
      if (recomendacionesTiene && recomendaciones[horaCompleta]) {
        const valorRec = recomendaciones[horaCompleta].recomendacion.toFixed(2);
        rowRecomendaciones.push(valorRec);
        
        // Tráfico
        const entradas = recomendaciones[horaCompleta].entradas || 0;
        rowTrafico.push(String(entradas));
      } else {
        rowRecomendaciones.push('-');
        rowTrafico.push('-');
      }
    });
  }
  
  // Si no hay ningún valor en la atención deseada, no mostrar la tabla
  if (rowAtencionDeseada.every(val => val === '-')) {
    console.log('No hay valores de atención deseada para las horas de la tabla');
    return startY;
  }
  
  // Configuración de columnas para que coincidan con la tabla principal
  const columnStyles: Record<number, Record<string, any>> = {};
  
  // Para cada hora, configurar el ancho como la suma de los anchos de sus slots
  horas.forEach((hora, index) => {
    const cantidadSlots = slotsPorHora[hora].length;
    // El ancho depende de cuántos slots de 15 o 30 minutos hay en esta hora
    columnStyles[index] = { 
      cellWidth: 10 * cantidadSlots,
      halign: 'center'
    };
  });
  
  // Crear cabeceras con etiquetas más informativas
  const cabecerasConTexto = horas.map(hora => `${hora}:00`);
  
  // Añadir nombres a las filas para mejor comprensión
  const body = [
    ['Tráfico', ...rowTrafico],
    ['At. Deseada', ...rowAtencionDeseada],
    ['Recomendado', ...rowRecomendaciones]
  ];
  
  // Asegurar que las etiquetas tengan su propio estilo
  columnStyles[-1] = {
    cellWidth: 25,
    fontStyle: 'bold',
    fillColor: [240, 240, 240]
  };
  
  // Generar la tabla
  autoTable(doc, {
    startY: startY,
    head: [['Hora', ...cabecerasConTexto]],
    body: body,
    theme: 'grid',
    headStyles: { 
      fillColor: [100, 100, 130],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 1,
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 2
    },
    columnStyles: columnStyles,
    margin: { left: 5, right: 5 },
    tableWidth: 'auto',
  });
  
  // Devolver la posición final Y
  // @ts-ignore - Acceder al lastAutoTable aunque no esté en el tipo
  const finalY = doc.lastAutoTable.finalY + 2;
  
  return finalY + 5;
} 