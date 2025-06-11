/**
 * Componentes visuales para la generación de PDFs
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generarColumnasTiempo } from './utils';
import { generarTablaAtencionDeseada } from './atencion-deseada';

/**
 * Función para mostrar un modal de vista previa del PDF
 */
export function mostrarModalPreviewPDF(blob: Blob, fileName: string, semanaName: string): void {
  console.log('[PDF-COMPONENTS] Mostrando modal de vista previa para PDF');
  
  // Crear URL para el blob
  const pdfUrl = URL.createObjectURL(blob);
  
  // Guardar el estado de overflow original del body
  const originalOverflow = document.body.style.overflow;
  
  // Crear contenedor del modal
  const modalContainer = document.createElement('div');
  modalContainer.style.position = 'fixed';
  modalContainer.style.top = '0';
  modalContainer.style.left = '0';
  modalContainer.style.right = '0';
  modalContainer.style.bottom = '0';
  modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modalContainer.style.zIndex = '9999';
  modalContainer.style.display = 'flex';
  modalContainer.style.alignItems = 'center';
  modalContainer.style.justifyContent = 'center';
  modalContainer.style.padding = '1rem';
  modalContainer.style.transition = 'all 0.3s ease-out';
  
  // Crear el contenido del modal
  modalContainer.innerHTML = `
    <div id="modal-content" style="
      background-color: white;
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 1280px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      transition: transform 0.3s ease-out;
      transform: scale(0.95);
    ">
      <!-- Cabecera del modal -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
      ">
        <h3 style="
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        ">
          Vista previa: ${semanaName}
        </h3>
        <div style="display: flex; gap: 0.5rem;">
          <!-- Botón de descarga -->
          <button id="download-pdf" style="
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            font-weight: 500;
            color: white;
            background-color: #2563eb;
            border-radius: 0.375rem;
            border: none;
            cursor: pointer;
          ">
            <svg style="width: 1rem; height: 1rem; margin-right: 0.5rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar PDF
          </button>
          <!-- Botón de cerrar -->
          <button id="close-modal" style="
            color: #6b7280;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg style="width: 1.25rem; height: 1.25rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Contenedor de 2 columnas -->
      <div style="display: flex; flex: 1; min-height: 0;">
        <!-- Columna izquierda: iframe con el PDF -->
        <div style="flex: 1; min-height: 0; padding: 1rem; overflow: auto; border-right: 1px solid #e5e7eb;">
          <iframe 
            src="${pdfUrl}" 
            style="width: 100%; height: 75vh; border: none; border-radius: 0.25rem;"
          ></iframe>
        </div>
        
        <!-- Columna derecha: Panel de información -->
        <div style="width: 300px; padding: 1rem; overflow: auto;">
          <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0 0 0.5rem 0;">Información de la semana</h4>
            <p style="font-size: 0.875rem; color: #4b5563; margin: 0 0 0.25rem 0;">
              <strong>Semana:</strong> ${semanaName}
            </p>
            <p style="font-size: 0.875rem; color: #4b5563; margin: 0 0 0.25rem 0;">
              <strong>Archivo:</strong> ${fileName}
            </p>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0 0 0.5rem 0;">Resumen</h4>
            <div style="background-color: #f3f4f6; padding: 0.75rem; border-radius: 0.375rem;">
              <p style="font-size: 0.875rem; color: #4b5563; margin: 0 0 0.5rem 0;">
                Este informe incluye:
              </p>
              <ul style="font-size: 0.875rem; color: #4b5563; margin: 0; padding-left: 1.25rem;">
                <li style="margin-bottom: 0.25rem;">Resumen semanal de tráfico</li>
                <li style="margin-bottom: 0.25rem;">Comparativa diaria</li>
                <li style="margin-bottom: 0.25rem;">Detalle de horarios por empleado</li>
                <li style="margin-bottom: 0.25rem;">Recomendaciones de personal</li>
              </ul>
            </div>
          </div>
          
          <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0 0 0.5rem 0;">Leyenda</h4>
            <div style="display: flex; align-items: center; margin-bottom: 0.375rem;">
              <div style="width: 1rem; height: 1rem; background-color: #60a5fa; border-radius: 0.25rem; margin-right: 0.5rem;"></div>
              <span style="font-size: 0.875rem; color: #4b5563;">Entrada</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 0.375rem;">
              <div style="width: 1rem; height: 1rem; background-color: #10b981; border-radius: 0.25rem; margin-right: 0.5rem;"></div>
              <span style="font-size: 0.875rem; color: #4b5563;">Trabajo</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 0.375rem;">
              <div style="width: 1rem; height: 1rem; background-color: #f59e0b; border-radius: 0.25rem; margin-right: 0.5rem;"></div>
              <span style="font-size: 0.875rem; color: #4b5563;">Descanso</span>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="width: 1rem; height: 1rem; background-color: #ef4444; border-radius: 0.25rem; margin-right: 0.5rem;"></div>
              <span style="font-size: 0.875rem; color: #4b5563;">Salida</span>
            </div>
          </div>
          
          <div>
            <h4 style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0 0 0.5rem 0;">Ayuda</h4>
            <p style="font-size: 0.875rem; color: #4b5563; margin: 0 0 0.5rem 0;">
              Para descargar este informe, haga clic en el botón "Descargar PDF" en la parte superior derecha.
            </p>
            <p style="font-size: 0.875rem; color: #4b5563; margin: 0;">
              Este documento se genera automáticamente con los datos disponibles en el momento de la consulta.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Añadir el modal al DOM
  document.body.appendChild(modalContainer);
  document.body.style.overflow = 'hidden'; // Prevenir scroll
  
  // Animar la entrada del modal
  setTimeout(() => {
    const modalContent = modalContainer.querySelector('#modal-content') as HTMLElement;
    if (modalContent) {
      modalContent.style.transform = 'scale(1)';
    }
  }, 10);
  
  // Función para cerrar el modal con animación
  const closeModal = () => {
    console.log('[PDF-COMPONENTS] Cerrando modal de vista previa');
    
    // Animar salida
    modalContainer.style.opacity = '0';
    modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    
    const modalContent = modalContainer.querySelector('#modal-content') as HTMLElement;
    if (modalContent) {
      modalContent.style.transform = 'scale(0.95)';
    }
    
    // Eliminar después de la animación
    setTimeout(() => {
      document.body.removeChild(modalContainer);
      document.body.style.overflow = originalOverflow;
      
      // Liberar memoria
      URL.revokeObjectURL(pdfUrl);
      console.log('[PDF-COMPONENTS] URL del blob liberada');
    }, 300);
  };
  
  // Configurar evento de cierre
  const closeButton = modalContainer.querySelector('#close-modal');
  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }
  
  // Configurar evento de descarga
  const downloadButton = modalContainer.querySelector('#download-pdf');
  if (downloadButton) {
    downloadButton.addEventListener('click', () => {
      console.log('[PDF-COMPONENTS] Iniciando descarga del PDF desde el modal');
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('[PDF-COMPONENTS] Descarga iniciada');
    });
  }
  
  // Cerrar al hacer clic fuera del contenido del modal
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      closeModal();
    }
  });
  
  // Manejar tecla ESC
  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscKey);
    }
  };
  document.addEventListener('keydown', handleEscKey);
  
  console.log('[PDF-COMPONENTS] Modal de vista previa configurado y mostrado correctamente');
}

/**
 * Función para generar una tabla de actividades por slots de tiempo
 */
export function generarTablaConSlots(
  actividades: any[],
  tiendaData: any,
  doc: jsPDF,
  startY: number
): number {
  // Obtener columnas de tiempo basadas en el país y horario de la tienda
  // Priorizar el campo "Apertura" que es donde realmente está el horario
  const apertura = tiendaData.fields.Apertura || tiendaData.fields['Horario Apertura'];
  const cierre = tiendaData.fields.Cierre || tiendaData.fields['Horario Cierre'];
  const pais = tiendaData.fields.PAIS || tiendaData.fields.Pais || tiendaData.fields.País;
  
  console.log(`[PDF-COMPONENTS] Datos para horario: Apertura=${apertura}, Cierre=${cierre}, PAIS=${pais}`);
  
  const slots = generarColumnasTiempo(
    pais,
    apertura,
    cierre
  );
  
  console.log(`[PDF-COMPONENTS] Generando tabla con ${slots.length} slots de tiempo para ${actividades.length} actividades`);
  
  if (slots.length === 0) {
    console.warn('[PDF-COMPONENTS] No se pudieron generar slots de tiempo con los datos de la tienda');
    return startY + 5; // Retornar la posición Y actualizada
  }
  
  // Obtener la hora de cierre de la tienda
  // En el nuevo formato, no necesitamos filtrar los slots, ya que generarColumnasTiempo ya lo hace.
  // Solo si no estamos usando el nuevo formato (sin '-') verificamos la hora de cierre
  let slotsFiltrados = slots;
  if (!apertura || !apertura.includes('-')) {
    const horaCierre = cierre 
      ? parseInt(cierre.split(':')[0]) 
      : 22; // Valor por defecto
    
    console.log(`[PDF-COMPONENTS] Hora de cierre de la tienda: ${horaCierre}:00`);
    
    // Filtrar slots para excluir la hora de cierre
    slotsFiltrados = slots.filter(slot => {
      const hora = parseInt(slot.split(':')[0]);
      return hora < horaCierre;
    });
    
    console.log(`[PDF-COMPONENTS] Slots filtrados (excluyendo hora de cierre): ${slotsFiltrados.length}`);
  } else {
    console.log(`[PDF-COMPONENTS] Usando nuevo formato de horarios con múltiples intervalos`);
  }
  
  // Optimización: Si hay demasiados slots, considerar agruparlos
  let slotsAgrupados = slotsFiltrados;
  if (slotsFiltrados.length > 20) { // Si hay más de 20 slots, agrupar cada 2 (para Francia) o cada 1 (para otros)
    const esFrancia = pais?.toUpperCase() === 'FRANCIA';
    
    if (esFrancia) {
      // Para Francia, que usa intervalos de 15 min, agrupar cada 2 slots (30 min)
      slotsAgrupados = slotsFiltrados.filter((_, index) => index % 2 === 0);
    }
  }
  
  // Preparar datos para la tabla
  // Primero, crear un mapa de actividades por empleado
  const actividadesPorEmpleado: Record<string, any[]> = {};
  
  // Agrupar actividades por empleado
  actividades.forEach(actividad => {
    // Intentar diferentes campos para identificar al empleado
    const empleadoId = actividad.fields['Empleado ID'] || 
                       actividad.fields['ID Empleado'] || 
                       actividad.fields['Empleado'] || 
                       'sin_empleado';
    
    // Intentar diferentes campos para obtener el nombre
    const empleadoNombre = actividad.fields['Nombre'] || 
                          actividad.fields['Nombre Empleado'] || 
                          actividad.fields['Empleado Nombre'] || 
                          'Sin nombre';
    
    const clave = `${empleadoId}|${empleadoNombre}`;
    
    if (!actividadesPorEmpleado[clave]) {
      actividadesPorEmpleado[clave] = [];
    }
    
    actividadesPorEmpleado[clave].push(actividad);
  });
  
  // Preparar encabezados de la tabla - Optimización: formatear los encabezados para ser más compactos
  // Sólo mostrar la hora, sin los minutos cuando son :00
  const formatearHoraHeader = (slot: string) => {
    const [hora, minutos] = slot.split(':');
    return minutos === '00' ? hora : slot;
  };
  
  const headers = ['Empleado', ...slotsAgrupados.map(formatearHoraHeader), 'H.T'];
  
  // Preparar filas de datos
  const tableData: string[][] = [];
  
  Object.entries(actividadesPorEmpleado).forEach(([clave, actividadesEmpleado]) => {
    const [empleadoId, empleadoNombre] = clave.split('|');
    // Optimización: Truncar nombres largos
    const nombreTruncado = empleadoNombre.length > 15 ? 
      empleadoNombre.substring(0, 12) + '...' : 
      empleadoNombre;
    
    const fila: string[] = [nombreTruncado];
    
    // Mapa para registrar actividades por slot de tiempo
    const actividadPorSlot: Record<string, string> = {};
    
    // Registrar todas las actividades en sus slots correspondientes
    actividadesEmpleado.forEach(actividad => {
      // Intentar obtener hora inicio y fin de diferentes campos
      const horasActividad = obtenerHorasActividad(actividad);
      if (!horasActividad) return;
      
      const { horaInicio, horaFin, tipoActividad } = horasActividad;
      
      // Encontrar los slots que están dentro del rango de la actividad
      slotsFiltrados.forEach(slot => {
        if (estaEnRango(slot, horaInicio, horaFin)) {
          actividadPorSlot[slot] = tipoActividad;
        }
      });
    });
    
    // Construir la fila con el estado para cada slot
    slotsAgrupados.forEach(slot => {
      // En lugar de guardar texto, guardar símbolos representativos
      const actividad = actividadPorSlot[slot] || '';
      fila.push(obtenerSimboloActividad(actividad));
    });
    
    // Calcular horas trabajadas
    const horasTrabajadas = calcularHorasTrabajadas(actividadPorSlot, slotsFiltrados, pais);
    fila.push(horasTrabajadas.toFixed(1)); // Reducido a un decimal para ahorrar espacio
    
    tableData.push(fila);
  });
  
  // Configurar estilos para diferentes tipos de actividades
  const estilosPorActividad: Record<string, any> = {
    '■': { fillColor: [200, 255, 200], textColor: [0, 100, 0], fontStyle: 'bold' },  // TRABAJO - Verde
    '▲': { fillColor: [200, 200, 255], textColor: [0, 0, 200], fontStyle: 'bold' },  // VACACIONES - Azul
    '✕': { fillColor: [255, 200, 200], textColor: [200, 0, 0], fontStyle: 'bold' },  // LIBRE - Rojo
    '+': { fillColor: [255, 200, 255], textColor: [128, 0, 128], fontStyle: 'bold' }, // BAJA MÉDICA - Púrpura
    '●': { fillColor: [255, 230, 200], textColor: [200, 100, 0], fontStyle: 'bold' },  // FORMACIÓN - Naranja
    ' ': { fillColor: [245, 245, 245], textColor: [150, 150, 150] } // Vacío
  };
  
  // Definir función para estilo condicional de celdas
  const styleCellCallback = (data: any) => {
    const cellValue = data.cell.text[0] || ' ';
    const cellIndex = data.column.index;
    
    // Aplicar estilo solo a las celdas de actividades (no al empleado ni horas trabajadas)
    if (cellIndex > 0 && cellIndex <= slotsAgrupados.length) {
      const estilo = estilosPorActividad[cellValue] || estilosPorActividad[' '];
      return {
        ...estilo,
        halign: 'center',
        valign: 'middle',
        fontSize: 12, // Aumentado para mejor visibilidad
        fontStyle: 'bold',
        cellPadding: 1, // Reducido para ahorrar espacio
      };
    }
    
    // Estilo específico para la última columna (horas trabajadas)
    if (cellIndex === slotsAgrupados.length + 1) {
      return {
        halign: 'center',
        fontStyle: 'bold',
        fontSize: 8,
        fillColor: [240, 240, 240],
        textColor: [0, 0, 128]
      };
    }
    
    // Estilo para la columna de nombres
    if (cellIndex === 0) {
      return {
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left'
      };
    }
    
    return {};
  };
  
  // Optimización: Ajustar el ancho de columnas para que quepan más en una página
  const columnStyles: any = {
    0: { cellWidth: 30 }, // Reducido para nombres
    [headers.length - 1]: { cellWidth: 15 } // Reducido para horas trabajadas
  };
  
  // Asignar ancho mínimo a las columnas de horas
  for (let i = 1; i <= slotsAgrupados.length; i++) {
    columnStyles[i] = { cellWidth: 10 }; // Ancho mínimo para columnas de horas
  }
  
  // Generar la tabla
  autoTable(doc, {
    startY,
    head: [headers],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [64, 87, 109], 
      textColor: [255, 255, 255],
      fontSize: 7, // Reducido para encabezados
      cellPadding: 1, // Reducido para ahorrar espacio
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1, // Líneas más finas
    },
    columnStyles,
    willDrawCell: styleCellCallback,
    margin: { left: 5, right: 5 }, // Márgenes reducidos
    tableWidth: 'auto',
    styles: {
      lineColor: [200, 200, 200],
      lineWidth: 0.1, // Líneas más finas para toda la tabla
    },
    didDrawPage: (data: any) => {
      // La leyenda de actividades ahora está incluida en el encabezado del PDF
      // por lo que ya no es necesario incluirla aquí al final de cada día
    }
  });
  
  // Devolver la posición final Y
  // @ts-ignore - Acceder al lastAutoTable aunque no esté en el tipo
  const finalY = doc.lastAutoTable.finalY;
  
  // Agregar la tabla de atención deseada si corresponde
  if (tiendaData.fields["Atención Deseada"]) {
    // Generar la tabla de atención deseada justo después de la tabla principal
    const nuevaY = generarTablaAtencionDeseada(tiendaData, doc, finalY, slotsFiltrados, slotsAgrupados);
    return nuevaY;
  }
  
  return finalY + 10; // Reducido de 20 a 10
}

/**
 * Convertir el tipo de actividad a un símbolo visual
 */
export function obtenerSimboloActividad(tipoActividad: string): string {
  switch (tipoActividad.toUpperCase()) {
    case 'TRABAJO':
      return '■'; // Cambio de círculo a cuadrado relleno (más visible)
    case 'VACACIONES':
      return '▲'; // Cambio de cuadrado a triángulo (más distintivo)
    case 'LIBRE':
      return '✕'; // Mejora de cruz para mejor visibilidad
    case 'BAJA MÉDICA':
    case 'BAJA MEDICA':
      return '+'; // Cruz médica simplificada para mejor impresión
    case 'FORMACIÓN':
    case 'FORMACION':
      return '●'; // Cambio a círculo relleno (más visible)
    default:
      return ' '; // Espacio vacío para nada o desconocido
  }
}

/**
 * Obtiene las horas de inicio y fin de una actividad, buscando en varios campos posibles
 */
export function obtenerHorasActividad(actividad: any): { horaInicio: string, horaFin: string, tipoActividad: string } | null {
  const fields = actividad.fields;
  
  // Intentar obtener la actividad de varios campos posibles
  let tipoActividad = 
    fields['Actividad'] || 
    fields['Tipo'] || 
    fields['Tipo Actividad'] || 
    fields['Estado'] || 
    'DESCANSO';
  
  // Normalizar el tipo de actividad para reconocer variaciones comunes
  tipoActividad = normalizarTipoActividad(tipoActividad);
  
  // Primero intentar obtener horas de inicio y fin directamente
  let horaInicio = fields['Hora Inicio'] || fields['Hora_Inicio'] || fields['inicio'] || null;
  let horaFin = fields['Hora Fin'] || fields['Hora_Fin'] || fields['fin'] || null;
  
  // Si no hay horas directas, intentar buscar en campos de tiempo con formato XX:XX
  if (!horaInicio || !horaFin) {
    // Buscar en todos los campos que podrían contener horas
    for (const [campo, valor] of Object.entries(fields)) {
      if (typeof valor === 'string' && /^\d{1,2}:\d{2}$/.test(valor)) {
        // Si es un campo de tiempo y no tenemos hora inicio, usarlo como inicio
        if (!horaInicio && (campo.toLowerCase().includes('inicio') || campo.toLowerCase().includes('hora1'))) {
          horaInicio = valor;
        }
        // Si es un campo de tiempo y no tenemos hora fin, usarlo como fin
        else if (!horaFin && (campo.toLowerCase().includes('fin') || campo.toLowerCase().includes('hora2'))) {
          horaFin = valor;
        }
      }
    }
  }
  
  // Si no encontramos nada, buscar tiempos en campos numéricos específicos por hora
  if (!horaInicio || !horaFin) {
    // Recorrer los slots de tiempo potenciales
    for (let hora = 0; hora <= 23; hora++) {
      const horaStr = hora.toString().padStart(2, '0');
      
      // Ver si hay un campo para esta hora con un valor que indique actividad
      const tieneActividad = 
        fields[horaStr] === 'TRABAJO' || 
        fields[horaStr] === true || 
        fields[horaStr] === 1 ||
        fields[`${horaStr}:00`] === 'TRABAJO' || 
        fields[`${horaStr}:00`] === true || 
        fields[`${horaStr}:00`] === 1;
      
      if (tieneActividad) {
        // Si encontramos una hora marcada como trabajo
        if (!horaInicio) {
          horaInicio = `${horaStr}:00`;
        }
        
        // Actualizar la hora de fin (será la última hora + 1)
        horaFin = `${(hora+1).toString().padStart(2, '0')}:00`;
      }
    }
  }
  
  // Si tenemos una columna con información de horas trabajadas, ajustar el tipo de actividad
  if (horaInicio && horaFin) {
    const horasTrabajadas = parseFloat(String(fields['Horas Trabajadas'] || fields['Horas Efectivas'] || fields['Horas'] || '0'));
    
    // Si hay horas trabajadas pero el tipo no es TRABAJO, corregirlo
    if (horasTrabajadas > 0 && tipoActividad !== 'TRABAJO') {
      const actividadOriginal = tipoActividad;
      tipoActividad = 'TRABAJO';
      console.log(`[PDF-COMPONENTS] Ajustando tipo de actividad de ${actividadOriginal} a TRABAJO por tener ${horasTrabajadas} horas trabajadas`);
    }
    
    // Si no hay horas trabajadas y el tipo es TRABAJO, verificar si debería ser otro tipo
    if (horasTrabajadas === 0 && tipoActividad === 'TRABAJO') {
      // Comprobar si hay otras señales en los campos
      for (const [campo, valor] of Object.entries(fields)) {
        const campoLower = campo.toLowerCase();
        const valorStr = String(valor).toLowerCase();
        
        if (
          (campoLower.includes('libre') && valorStr === 'true') ||
          (campoLower.includes('vacaciones') && valorStr === 'true') ||
          (campoLower.includes('baja') && valorStr === 'true') ||
          (campoLower.includes('formacion') && valorStr === 'true')
        ) {
          // Si hay algún campo específico marcado como verdadero, usarlo
          tipoActividad = campoLower.includes('libre') ? 'LIBRE' :
                          campoLower.includes('vacaciones') ? 'VACACIONES' :
                          campoLower.includes('baja') ? 'BAJA MÉDICA' :
                          campoLower.includes('formacion') ? 'FORMACIÓN' : tipoActividad;
          
          console.log(`[PDF-COMPONENTS] Ajustando tipo de actividad a ${tipoActividad} por campo específico`);
          break;
        }
      }
    }
  }
  
  // Si no pudimos encontrar horas, devolver null
  if (!horaInicio || !horaFin) {
    return null;
  }
  
  return { horaInicio, horaFin, tipoActividad };
}

/**
 * Normaliza el tipo de actividad para manejar diferentes formatos y variantes
 */
export function normalizarTipoActividad(tipo: string): string {
  if (!tipo) return 'DESCANSO';
  
  // Convertir a string y mayúsculas para comparar
  const tipoUpper = String(tipo).toUpperCase().trim();
  
  // Mapeo de variantes comunes
  if (['TRABAJO', 'WORK', 'TRABAJAR', 'LABORAL', 'T'].includes(tipoUpper)) {
    return 'TRABAJO';
  }
  
  if (['VACACIONES', 'VACATION', 'VACANCE', 'HOLIDAY', 'V'].includes(tipoUpper)) {
    return 'VACACIONES';
  }
  
  if (['LIBRE', 'FREE', 'DESCANSO', 'REST', 'OFF', 'L', 'LIBRANZA'].includes(tipoUpper)) {
    return 'LIBRE';
  }
  
  if (['BAJA', 'BAJA MÉDICA', 'BAJA MEDICA', 'MEDICAL', 'SICK', 'ENFERMEDAD', 'B'].includes(tipoUpper)) {
    return 'BAJA MÉDICA';
  }
  
  if (['FORMACIÓN', 'FORMACION', 'TRAINING', 'COURSE', 'CAPACITACIÓN', 'F'].includes(tipoUpper)) {
    return 'FORMACIÓN';
  }
  
  // Si no coincide con ninguno, mantener el valor original
  return tipoUpper;
}

/**
 * Verifica si un slot de tiempo está dentro del rango de una actividad
 */
export function estaEnRango(slot: string, horaInicio: string, horaFin: string): boolean {
  try {
    // Convertir todos los tiempos a minutos para facilitar comparación
    const [slotHour, slotMinute] = slot.split(':').map(Number);
    const slotMinutos = slotHour * 60 + slotMinute;
    
    const [inicioHour, inicioMinute] = horaInicio.split(':').map(Number);
    const inicioMinutos = inicioHour * 60 + inicioMinute;
    
    const [finHour, finMinute] = horaFin.split(':').map(Number);
    const finMinutos = finHour * 60 + finMinute;
    
    // Un slot está dentro del rango si es >= inicio y < fin
    return slotMinutos >= inicioMinutos && slotMinutos < finMinutos;
  } catch (error) {
    console.error('[PDF-COMPONENTS] Error al comparar rangos de tiempo:', error);
    return false;
  }
}

/**
 * Calcula las horas trabajadas basadas en los slots marcados
 */
export function calcularHorasTrabajadas(
  actividadPorSlot: Record<string, string>,
  slots: string[],
  pais?: string
): number {
  const incremento = pais?.toUpperCase() === 'FRANCIA' ? 0.25 : 0.5; // 15 min = 0.25 horas, 30 min = 0.5 horas
  
  let horasTrabajadas = 0;
  
  slots.forEach(slot => {
    if (actividadPorSlot[slot] === 'TRABAJO') {
      horasTrabajadas += incremento;
    }
  });
  
  return horasTrabajadas;
} 