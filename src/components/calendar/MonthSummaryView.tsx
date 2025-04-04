'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  obtenerSemanasLaborales, 
  formatearFecha, 
  SemanaLaboralRecord, 
  obtenerActividadesDiarias, 
  obtenerDatosTienda,
  ActividadDiariaRecord,
  DiaLaboralRecord 
} from '@/lib/airtable';
import { calcularHorasEfectivasDiarias, obtenerColorIntensidadTrafico } from '@/lib/utils';
import { FileText, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useSchedule } from '@/context/ScheduleContext';

// Interfaces temporales y funciones auxiliares que necesitamos
interface DatosTraficoDia {
  fecha?: string;
  entradasPorHora?: number[];
  entradasTotales?: number;
  estimadoPersonal?: number[];
}

// Cambiando el nombre de la interfaz local
interface DiaLaboralData {
  id: string;
  fields: {
    Name: string;
    'Semana Laboral'?: string[];
  };
}

// Interface para datos de horas por día
interface DiaHorasData {
  diaId: string;
  horasAprobadas: number;
  horasContratadas: number;
  horasEfectivas: number;
  fecha: string; // La fecha del día en formato YYYY-MM-DD
  isWeekend: boolean;
  semanaId: string;
  diaSemana: number; // 0=lunes, 1=martes, ..., 6=domingo
}

interface MonthSummaryViewProps {
  mes: string;
  año: string;
  onBack: () => void;
}

// Interfaz para los datos de día en el calendario
interface DiaCalendario {
  fecha: Date;
  diaId: string | null;
  horasAprobadas: number;
  horasContratadas: number;
  horasEfectivas: number;
  esDiaActual: boolean;
  esFestivo: boolean;
  esDiaLaboral: boolean;
}

export function MonthSummaryView({ mes, año, onBack }: MonthSummaryViewProps) {
  const { storeRecordId } = useSchedule(); // Obtenemos el storeRecordId del contexto
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diasCalendario, setDiasCalendario] = useState<DiaCalendario[]>([]);
  const [nombresMeses] = useState<{[key: string]: number}>({
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  });
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const resumenRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  
  // Nombres de los días de la semana (empezando por lunes)
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Función para exportar a PDF
  const exportarAPDF = async () => {
    try {
      if (!calendarRef.current || !resumenRef.current) {
        alert('Error: No se puede acceder a los elementos del calendario');
        return;
      }

      setIsExportingPdf(true);
      
      // Crear documento PDF con orientación landscape y mayor tamaño
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Dimensiones de la página A4 landscape
      const pdfWidth = 297;  // A4 landscape width en mm
      const pdfHeight = 210; // A4 landscape height en mm
      
      // Margins
      const margin = 10;
      const contentWidth = pdfWidth - (2 * margin);
      
      // Añadir título
      pdf.setFontSize(18);
      pdf.text(`Resumen de ${mes} ${año}`, margin, margin + 5);
      pdf.setFontSize(12);
      
      // Primer paso: Capturar el resumen
      const resumenCanvas = await html2canvas(resumenRef.current, {
        scale: 1.5, // Reducimos resolución para evitar archivos demasiado grandes
        useCORS: true,
        logging: false
      });
      
      // Calcular dimensiones para el resumen
      const resumenAspectRatio = resumenCanvas.height / resumenCanvas.width;
      const resumenHeight = contentWidth * resumenAspectRatio;
      
      // Añadir imagen del resumen al PDF manteniendo proporción
      const resumenImgData = resumenCanvas.toDataURL('image/png');
      pdf.addImage(
        resumenImgData, 
        'PNG', 
        margin, 
        margin + 10, 
        contentWidth, 
        Math.min(resumenHeight, 40) // Limitamos altura máxima
      );
      
      // Segundo paso: Capturar el calendario
      const calendarCanvas = await html2canvas(calendarRef.current, {
        scale: 1.5, // Reducimos resolución para evitar archivos demasiado grandes
        useCORS: true,
        logging: false,
        onclone: (document, element) => {
          // Aseguramos que no haya overflow o scroll
          if (element instanceof HTMLElement) {
            element.style.height = 'auto';
            element.style.overflow = 'visible';
          }
        }
      });
      
      // Calcular dimensiones para el calendario
      const calendarAspectRatio = calendarCanvas.height / calendarCanvas.width;
      const calendarHeightInPdf = contentWidth * calendarAspectRatio;
      
      // Calcular posición Y para el calendario (después del resumen)
      const calendarYPos = margin + 10 + Math.min(resumenHeight, 40) + 5;
      
      // Asegurar que el calendario quepa en el espacio restante de la página
      const availableHeightForCalendar = pdfHeight - calendarYPos - margin;
      
      // Si el calendario es demasiado grande, reducimos su tamaño
      let finalCalendarHeight = calendarHeightInPdf;
      let finalCalendarWidth = contentWidth;
      
      if (calendarHeightInPdf > availableHeightForCalendar) {
        const scale = availableHeightForCalendar / calendarHeightInPdf;
        finalCalendarHeight = calendarHeightInPdf * scale;
        finalCalendarWidth = contentWidth * scale;
      }
      
      // Centrar el calendario horizontalmente si es más pequeño que el ancho disponible
      const calendarXPos = margin + (contentWidth - finalCalendarWidth) / 2;
      
      // Añadir imagen del calendario al PDF con las dimensiones calculadas
      const calendarImgData = calendarCanvas.toDataURL('image/png');
      pdf.addImage(
        calendarImgData, 
        'PNG', 
        calendarXPos, 
        calendarYPos, 
        finalCalendarWidth, 
        finalCalendarHeight
      );
      
      // Generar y descargar el PDF
      pdf.save(`resumen_${mes.toLowerCase()}_${año}.pdf`);
      
      setIsExportingPdf(false);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
      setIsExportingPdf(false);
    }
  };

  // Cargar días del mes directamente
  useEffect(() => {
    async function cargarDatos() {
      setIsLoading(true);
      setError(null);
      try {
        // Verificar si tenemos un ID de tienda válido
        if (!storeRecordId) {
          throw new Error("No hay un ID de tienda válido. Por favor, seleccione una tienda primero.");
        }
        
        // Ahora que sabemos que storeRecordId no es null, podemos usarlo como string
        const storeIdValidado = storeRecordId;
        
        // Convertir el mes a índice (0-11)
        const mesIndex = nombresMeses[mes.toLowerCase()];
        if (mesIndex === undefined) {
          throw new Error(`Mes no válido: ${mes}`);
        }
        
        // Crear fecha del primer día del mes
        const primerDiaMes = new Date(parseInt(año), mesIndex, 1);
        
        // Obtener el último día del mes
        const ultimoDiaMes = new Date(parseInt(año), mesIndex + 1, 0);
        
        console.log(`Cargando datos para el mes: ${mes} ${año} (índice: ${mesIndex})`);
        
        // Usar el store ID obtenido del contexto
        console.log(`Usando Store ID: ${storeIdValidado}`);
        const tiendaData = await obtenerDatosTienda(storeIdValidado);
        
        if (!tiendaData) {
          throw new Error("No se pudo obtener datos de la tienda");
        }
        
        console.log(`Tienda cargada: ${tiendaData.id || 'sin ID'}`);
        
        // Obtener todas las semanas laborales para el mes
        const semanasLaborales = await obtenerSemanasLaborales(mes, año);
        console.log(`Semanas laborales encontradas: ${semanasLaborales.length}`);
        
        // Crear una estructura de mapa para almacenar los datos de días por su fecha
        const mapaDiasPorFecha = new Map<string, DiaHorasData>();
        
        // Para cada semana, procesar sus días y obtener actividades
        for (const semana of semanasLaborales) {
          // Verificar que tenga fechas de inicio y fin
          if (!semana.fields['Fecha de Inicio'] || !semana.fields['Fecha de fin']) {
            console.warn(`Semana ${semana.fields.Name || semana.id} no tiene fechas definidas`);
            continue;
          }
          
          // Obtener fechas de la semana
          const fechaInicioStr = semana.fields['Fecha de Inicio'];
          const fechaFinStr = semana.fields['Fecha de fin'];
          
          console.log(`Semana ${semana.fields.Name || semana.id}: ${fechaInicioStr} a ${fechaFinStr}`);
          
          // Convertir las fechas a objetos Date
          const fechaInicio = new Date(fechaInicioStr);
          const fechaFin = new Date(fechaFinStr);
          
          // Debug de fechas
          console.log(`Fecha inicio parsed: ${fechaInicio.toISOString()}`);
          
          // Obtener los IDs de los días laborales
          const diasIds = semana.fields['Dias Laborales'] || [];
          
          if (diasIds.length === 0) {
            console.log(`Semana ${semana.fields.Name || semana.id} no tiene días laborales asociados`);
            continue;
          }
          
          console.log(`Procesando ${diasIds.length} días de semana ${semana.fields.Name || semana.id}`);
          
          // Asignar fechas a cada día basándose en la fecha de inicio de la semana
          // Asumimos que los días están ordenados de lunes a domingo
          for (let i = 0; i < diasIds.length; i++) {
            const diaId = diasIds[i];
            
            try {
              // Calcular la fecha para este día
              // NOTA: Necesitamos ajustar el cálculo de fecha para corregir el desfase
              const fechaDia = new Date(fechaInicio);
              // Sumamos i para movernos por los días de la semana (0=lunes, 1=martes, etc.)
              // Además, añadimos 1 para corregir el desfase observado
              fechaDia.setDate(fechaInicio.getDate() + i + 1);
              
              // Formatear la fecha como YYYY-MM-DD
              const fechaStr = `${fechaDia.getFullYear()}-${String(fechaDia.getMonth() + 1).padStart(2, '0')}-${String(fechaDia.getDate()).padStart(2, '0')}`;
              
              console.log(`Procesando día ${i+1} (${diasSemana[i]}): ${diaId} - Fecha calculada: ${fechaStr}`);
              
              // Obtener actividades para este día
              const actividades = await obtenerActividadesDiarias(storeIdValidado, diaId);
              console.log(`Actividades para día ${fechaStr}: ${actividades.length}`);
              
              // Calcular horas efectivas
              const horasEfectivas = calcularHorasEfectivasDiarias(
                actividades,
                {
                  PAIS: tiendaData.fields?.PAIS || 'España',
                  Apertura: tiendaData.fields?.Apertura || '10:00',
                  Cierre: tiendaData.fields?.Cierre || '21:00'
                }
              );
              
              // Calcular horas contratadas (contando columnas de tiempo con "TRABAJO")
              let horasContratadas = 0;
              actividades.forEach(actividad => {
                // Contar cuántas columnas de tiempo tienen asignado "TRABAJO"
                const horasTrabajo = Object.entries(actividad.fields)
                  .filter(([campo, valor]) => 
                    // Solo contamos los campos que son columnas de tiempo (formato HH:MM)
                    /^\d{2}:\d{2}$/.test(campo) && 
                    // Y que tengan valor "TRABAJO"
                    valor === 'TRABAJO'
                  ).length;
                
                // Ajustar según el país (Francia usa intervalos de 15 minutos, otros 30 minutos)
                const intervaloPais = tiendaData.fields?.PAIS?.toUpperCase() === 'FRANCIA' ? 0.25 : 0.5;
                
                // Sumar las horas de trabajo para esta actividad
                horasContratadas += horasTrabajo * intervaloPais;
                console.log(`Actividad ${actividad.id}: Horas de trabajo calculadas = ${horasTrabajo} x ${intervaloPais} = ${(horasTrabajo * intervaloPais).toFixed(1)}`);
              });
              
              console.log(`Total horas contratadas para día ${fechaStr}: ${horasContratadas.toFixed(1)}`);
              
              // Calcular horas aprobadas (si existen, de lo contrario usar el valor del campo de tienda)
              // Dividimos las horas aprobadas entre 7 para obtener las horas aprobadas diarias
              const horasAprobadasTotales = tiendaData.fields?.['Horas Aprobadas'] || 0;
              const horasAprobadas = horasAprobadasTotales / 7;
              
              console.log(`Horas aprobadas totales: ${horasAprobadasTotales} -> Horas aprobadas diarias: ${horasAprobadas.toFixed(1)}`);
              
              // Determinar si es fin de semana basado en el índice del día (5=sábado, 6=domingo)
              const isWeekend = i >= 5;
              
              // Guardar datos del día
              mapaDiasPorFecha.set(fechaStr, {
                diaId,
                horasAprobadas,
                horasContratadas,
                horasEfectivas,
                fecha: fechaStr,
                isWeekend,
                semanaId: semana.id,
                diaSemana: i // 0=lunes, 1=martes, ..., 6=domingo
              });
              
              console.log(`Día ${fechaStr} procesado: HA=${horasAprobadas.toFixed(1)}, HC=${horasContratadas.toFixed(1)}, HE=${horasEfectivas.toFixed(1)}`);
            } catch (err) {
              console.error(`Error al procesar día ${diaId}:`, err);
            }
          }
        }
        
        console.log(`Total de días procesados: ${mapaDiasPorFecha.size}`);
        
        // Generar array de días del calendario
        const diasDelCalendario: DiaCalendario[] = [];
        
        // Determinar el día de la semana del primer día (0: domingo, 1: lunes, ..., 6: sábado)
        let diaSemanaInicio = primerDiaMes.getDay();
        // Convertir de domingo = 0 a lunes = 0
        diaSemanaInicio = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;
        
        // Añadir días del mes anterior para completar la primera semana
        const diaAnteriorMes = new Date(primerDiaMes);
        diaAnteriorMes.setDate(diaAnteriorMes.getDate() - 1);
        for (let i = diaSemanaInicio - 1; i >= 0; i--) {
          const fecha = new Date(diaAnteriorMes);
          fecha.setDate(diaAnteriorMes.getDate() - i);
          
          diasDelCalendario.push({
            fecha,
            diaId: null,
            horasAprobadas: 0,
            horasContratadas: 0,
            horasEfectivas: 0,
            esDiaActual: false,
            esFestivo: fecha.getDay() === 0 || fecha.getDay() === 6, // Sábado o domingo
            esDiaLaboral: false
          });
        }
        
        // Añadir todos los días del mes actual
        const hoy = new Date();
        
        for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
          const fecha = new Date(parseInt(año), mesIndex, dia);
          // Asegurarnos de que el formato coincide exactamente con el que usamos en el mapeo
          const fechaFormateada = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
          
          // Buscar si este día está en nuestro mapa de días procesados
          const datosDia = mapaDiasPorFecha.get(fechaFormateada);
          
          // Valores por defecto si no se encuentra el día
          let horasAprobadas = 0;
          let horasContratadas = 0;
          let horasEfectivas = 0;
          let esDiaLaboral = false;
          let diaId = null;
          
          // Si es un día laboral, usar sus datos
          if (datosDia) {
            horasAprobadas = datosDia.horasAprobadas;
            horasContratadas = datosDia.horasContratadas;
            horasEfectivas = datosDia.horasEfectivas;
            esDiaLaboral = true;
            diaId = datosDia.diaId;
            
            console.log(`Día ${fechaFormateada} encontrado en el mapa, HA=${horasAprobadas.toFixed(1)}, HC=${horasContratadas.toFixed(1)}, HE=${horasEfectivas.toFixed(1)}`);
          } else {
            console.log(`No hay datos para el día ${fechaFormateada}`);
          }
          
          diasDelCalendario.push({
            fecha,
            diaId,
            horasAprobadas,
            horasContratadas,
            horasEfectivas,
            esDiaActual: fecha.toDateString() === hoy.toDateString(),
            esFestivo: fecha.getDay() === 0 || fecha.getDay() === 6, // Sábado o domingo
            esDiaLaboral
          });
        }
        
        // Completar última semana con días del mes siguiente si es necesario
        const ultimoDiaIndex = (diaSemanaInicio + ultimoDiaMes.getDate() - 1) % 7;
        if (ultimoDiaIndex < 6) {
          const diasFaltantes = 6 - ultimoDiaIndex;
          const primerDiaSiguienteMes = new Date(parseInt(año), mesIndex + 1, 1);
          
          for (let i = 0; i < diasFaltantes; i++) {
            const fecha = new Date(primerDiaSiguienteMes);
            fecha.setDate(fecha.getDate() + i);
            
            diasDelCalendario.push({
              fecha,
              diaId: null,
              horasAprobadas: 0,
              horasContratadas: 0,
              horasEfectivas: 0,
              esDiaActual: false,
              esFestivo: fecha.getDay() === 0 || fecha.getDay() === 6, // Sábado o domingo
              esDiaLaboral: false
            });
          }
        }
        
        console.log(`Calendario generado con ${diasDelCalendario.length} días`);
        console.log(`Días laborales en el calendario: ${diasDelCalendario.filter(d => d.esDiaLaboral).length}`);
        
        // Buscar días laborales del mes actual
        const diasLaboralesDelMes = diasDelCalendario.filter(d => 
          d.esDiaLaboral && d.fecha.getMonth() === mesIndex
        );
        console.log(`Días laborales del mes ${mes}: ${diasLaboralesDelMes.length}`);
        
        // Mostrar detalles de los días laborales para debug
        if (diasLaboralesDelMes.length > 0) {
          diasLaboralesDelMes.forEach(dia => {
            console.log(`Día laboral: ${dia.fecha.toISOString().split('T')[0]}, HC: ${dia.horasContratadas}, HE: ${dia.horasEfectivas}`);
          });
        } else {
          console.warn(`No se encontraron días laborales para el mes ${mes} ${año}`);
        }
        
        setDiasCalendario(diasDelCalendario);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
        console.error('Error al cargar datos del calendario:', err);
      } finally {
        setIsLoading(false);
      }
    }

    cargarDatos();
  }, [mes, año, nombresMeses, storeRecordId]);

  // Renderizar celda del día
  const renderizarCeldaDia = (dia: DiaCalendario) => {
    // Clases para la celda principal
    let celdaClases = "h-28 border border-gray-200 p-1 transition-colors";
    
    if (!dia.esDiaLaboral && dia.fecha.getMonth() === nombresMeses[mes.toLowerCase()]) {
      // Día del mes actual pero no laborable
      celdaClases += " bg-gray-50";
    } else if (dia.fecha.getMonth() !== nombresMeses[mes.toLowerCase()]) {
      // Día de otro mes
      celdaClases += " bg-gray-100 opacity-70"; // Aumentado la opacidad para mejor legibilidad
    } else if (dia.esDiaLaboral) {
      // Día laborable
      celdaClases += " bg-white";
    }
    
    if (dia.esDiaActual) {
      celdaClases += " border-2 border-green-500";
    }
    
    // Formato fecha para mostrar
    const diaDelMes = dia.fecha.getDate();
    
    // Determinar si es día del mes actual o de otro mes
    const esOtroMes = dia.fecha.getMonth() !== nombresMeses[mes.toLowerCase()];
    
    return (
      <div className={celdaClases}>
        <div className="flex justify-between">
          <div 
            className={`
              flex items-center justify-center w-6 h-6 rounded-full 
              ${dia.esDiaActual ? 'bg-green-500 text-white' : ''} 
              ${dia.esDiaLaboral ? 'font-bold' : 'font-medium'}
            `}
          >
            <span 
              className={`
                text-base ${dia.esDiaActual ? 'text-white' : 
                dia.esFestivo ? 'text-red-600' : 
                esOtroMes ? 'text-gray-500' : 'text-gray-800'}
              `}
            >
              {diaDelMes}
            </span>
          </div>
          {dia.esDiaLaboral && (
            <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
              Laboral
            </span>
          )}
        </div>
        
        {dia.esDiaLaboral && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center">
              <span className="text-xs text-blue-700 font-medium w-24">Horas Apro:</span>
              <span className="text-xs font-bold">{dia.horasAprobadas.toFixed(1)}</span>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-green-700 font-medium w-24">Horas Cont:</span>
              <span className="text-xs font-bold">{dia.horasContratadas.toFixed(1)}</span>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-red-700 font-medium w-24">Horas Efec:</span>
              <span className="text-xs font-bold">{dia.horasEfectivas.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-24 h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-36 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Skeleton para el resumen general */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-4"></div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="bg-gray-100 p-3 rounded-lg">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton para el calendario */}
        <div className="bg-white rounded-lg shadow-sm p-4 overflow-x-auto">
          <div className="min-w-full">
            {/* Encabezados de los días de la semana */}
            <div className="grid grid-cols-7 mb-2">
              {diasSemana.map(dia => (
                <div key={dia} className="text-center py-2">
                  <div className="h-5 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div>
                </div>
              ))}
            </div>
            
            {/* Celdas del calendario skeleton */}
            <div className="grid grid-cols-7 gap-1">
              {[...Array(42)].map((_, index) => (
                <div key={index} className="h-28 border border-gray-200 p-1">
                  <div className="flex justify-between mb-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="w-14 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center">
                      <div className="w-20 h-3 bg-gray-200 rounded animate-pulse mr-1"></div>
                      <div className="w-6 h-3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-20 h-3 bg-gray-200 rounded animate-pulse mr-1"></div>
                      <div className="w-6 h-3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-20 h-3 bg-gray-200 rounded animate-pulse mr-1"></div>
                      <div className="w-6 h-3 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center py-8 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">Resumen de {mes} {año}</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportarAPDF}
          disabled={isExportingPdf}
        >
          {isExportingPdf ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
              Generando PDF...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-1" />
              Guardar como PDF
            </>
          )}
        </Button>
      </div>

      {/* Resumen general del mes */}
      <div ref={resumenRef} className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-2">Resumen Mensual</h3>
        
        <div className="flex flex-nowrap overflow-x-auto gap-3 pb-2">
          <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0 min-w-[180px]">
            <div className="text-xs text-blue-700 font-medium">Total Días Laborales</div>
            <div className="text-lg font-bold text-gray-800">
              {diasCalendario.filter(d => d.esDiaLaboral).length}
            </div>
          </div>
          
          <div className="bg-indigo-50 p-3 rounded-lg flex-shrink-0 min-w-[180px]">
            <div className="text-xs text-indigo-700 font-medium">Total Horas Aprobadas</div>
            <div className="text-lg font-bold text-gray-800">
              {(() => {
                console.log("========= CALCULANDO TOTAL DE HORAS APROBADAS =========");
                let totalHA = 0;
                // Solo considerar días laborales del mes actual
                const diasLaboralesMes = diasCalendario.filter(d => 
                  d.esDiaLaboral && d.fecha.getMonth() === nombresMeses[mes.toLowerCase()]
                );
                
                diasLaboralesMes.forEach(d => {
                  console.log(`Día ${d.fecha.getDate()}: ${d.horasAprobadas.toFixed(1)} horas aprobadas`);
                  totalHA += d.horasAprobadas;
                });
                console.log(`TOTAL HORAS APROBADAS (solo días laborales de ${mes}): ${totalHA.toFixed(1)}`);
                
                return totalHA.toFixed(1);
              })()}
            </div>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg flex-shrink-0 min-w-[180px]">
            <div className="text-xs text-green-700 font-medium">Total Horas Contratadas</div>
            <div className="text-lg font-bold text-gray-800">
              {(() => {
                console.log("========= CALCULANDO TOTAL DE HORAS CONTRATADAS =========");
                let totalHC = 0;
                // Solo considerar días laborales del mes actual
                const diasLaboralesMes = diasCalendario.filter(d => 
                  d.esDiaLaboral && d.fecha.getMonth() === nombresMeses[mes.toLowerCase()]
                );
                
                diasLaboralesMes.forEach(d => {
                  console.log(`Día ${d.fecha.getDate()}: ${d.horasContratadas.toFixed(1)} horas contratadas`);
                  totalHC += d.horasContratadas;
                });
                console.log(`TOTAL HORAS CONTRATADAS (solo días laborales de ${mes}): ${totalHC.toFixed(1)}`);
                
                // Verificación adicional para diagnosticar posibles problemas
                if (diasLaboralesMes.length > 0) {
                  console.log("Detalle de las horas contratadas por día:");
                  diasLaboralesMes.forEach(d => {
                    console.log(`- Día ${d.fecha.getDate()}: ${d.horasContratadas.toFixed(1)} HC (diaId: ${d.diaId || 'sin ID'})`);
                  });
                  
                  // Información de tipos de datos para diagnóstico
                  const firstDay = diasLaboralesMes[0];
                  console.log(`Tipo de dato de horasContratadas: ${typeof firstDay.horasContratadas}`);
                  console.log(`Ejemplo completo de día: `, JSON.stringify(firstDay, null, 2));
                }
                
                return totalHC.toFixed(1);
              })()}
            </div>
          </div>
          
          <div className="bg-red-50 p-3 rounded-lg flex-shrink-0 min-w-[180px]">
            <div className="text-xs text-red-700 font-medium">Total Horas Efectivas</div>
            <div className="text-lg font-bold text-gray-800">
              {(() => {
                console.log("========= CALCULANDO TOTAL DE HORAS EFECTIVAS =========");
                let totalHE = 0;
                // Solo considerar días laborales del mes actual
                const diasLaboralesMes = diasCalendario.filter(d => 
                  d.esDiaLaboral && d.fecha.getMonth() === nombresMeses[mes.toLowerCase()]
                );
                
                diasLaboralesMes.forEach(d => {
                  console.log(`Día ${d.fecha.getDate()}: ${d.horasEfectivas.toFixed(1)} horas efectivas`);
                  totalHE += d.horasEfectivas;
                });
                console.log(`TOTAL HORAS EFECTIVAS (solo días laborales de ${mes}): ${totalHE.toFixed(1)}`);
                
                return totalHE.toFixed(1);
              })()}
            </div>
          </div>
          
          <div className="bg-purple-50 p-3 rounded-lg flex-shrink-0 min-w-[180px]">
            <div className="text-xs text-purple-700 font-medium">Diferencia Horas Contratadas - Efectivas</div>
            <div className="text-lg font-bold text-gray-800">
              {(() => {
                // Solo considerar días laborales del mes actual
                const diasLaboralesMes = diasCalendario.filter(d => 
                  d.esDiaLaboral && d.fecha.getMonth() === nombresMeses[mes.toLowerCase()]
                );
                
                const totalHC = diasLaboralesMes.reduce((sum, d) => sum + d.horasContratadas, 0);
                const totalHE = diasLaboralesMes.reduce((sum, d) => sum + d.horasEfectivas, 0);
                const diferencia = totalHC - totalHE;
                
                console.log(`DIFERENCIA HC-HE (solo días laborales de ${mes}): ${diferencia.toFixed(1)}`);
                
                return diferencia.toFixed(1);
              })()}
            </div>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg flex-shrink-0 min-w-[180px]">
            <div className="text-xs text-yellow-700 font-medium">Promedio Horas Efectivas/Día</div>
            <div className="text-lg font-bold text-gray-800">
              {(() => {
                // Solo considerar días laborales del mes actual
                const diasLaboralesMes = diasCalendario.filter(d => 
                  d.esDiaLaboral && d.fecha.getMonth() === nombresMeses[mes.toLowerCase()]
                );
                
                const totalHE = diasLaboralesMes.reduce((sum, d) => sum + d.horasEfectivas, 0);
                const cantidadDias = Math.max(1, diasLaboralesMes.length);
                const promedio = totalHE / cantidadDias;
                
                console.log(`PROMEDIO HE/DÍA (solo días laborales de ${mes}): ${promedio.toFixed(1)}`);
                
                return promedio.toFixed(1);
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div ref={calendarRef} className="bg-white rounded-lg shadow-sm p-4 overflow-x-auto">
        <div className="min-w-full">
          {/* Encabezados de los días de la semana */}
          <div className="grid grid-cols-7 mb-2">
            {diasSemana.map(dia => (
              <div key={dia} className="text-center font-medium text-gray-700 py-2">
                {dia}
              </div>
            ))}
          </div>
          
          {/* Celdas del calendario */}
          <div className="grid grid-cols-7 gap-1">
            {diasCalendario.map((dia, index) => (
              <div key={index}>
                {renderizarCeldaDia(dia)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 