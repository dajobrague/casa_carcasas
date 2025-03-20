'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { obtenerSemanasLaborales, formatearFecha, SemanaLaboralRecord, obtenerActividadesDiarias, obtenerDatosTienda } from '@/lib/airtable';
import { FileText, ArrowLeft, Calendar, CalendarIcon, ChevronLeft } from 'lucide-react';
import { calcularHorasEfectivasDiarias } from '@/lib/utils';
import { useSchedule } from '@/context/ScheduleContext';
import { MonthViewMobile } from './MonthViewMobile';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { captureIframeAsPdf } from '@/lib/pdf-utils';

interface MonthViewProps {
  mes: string;
  año: string;
  onBack: () => void;
  onSelectDay: (diaId: string, fecha: Date, horasEfectivas: number) => void;
  onGeneratePdf: (semanaId: string, semanaName: string, semana?: SemanaLaboralRecord, directDownload?: boolean) => void;
  onViewMonthSummary: (mes: string, año: string) => void;
  horasEfectivasActualizadas?: {
    dias: { [diaId: string]: number };
    semanas: { [semanaId: string]: number };
  };
}

// Interfaz para los datos de horas que queremos mostrar
interface DiaHorasData {
  diaId: string;
  horasEfectivas: number;
}

interface SemanaHorasData {
  semanaId: string;
  horasAprobadas: number;
  horasContratadas: number;
  horasEfectivas: number;
}

export function MonthView({ 
  mes, 
  año, 
  onBack, 
  onSelectDay, 
  onGeneratePdf,
  onViewMonthSummary,
  horasEfectivasActualizadas = { dias: {}, semanas: {} } 
}: MonthViewProps) {
  // Media query para detectar tamaño móvil (menos de 640px)
  const isMobile = useMediaQuery('(max-width: 639px)');
  const router = useRouter();

  // IMPORTANTE: Siempre declaramos TODOS los hooks aquí, independientemente de si es móvil o desktop
  // Esto evita el error "Rendered fewer hooks than expected"
  const [semanas, setSemanas] = useState<SemanaLaboralRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [horasDias, setHorasDias] = useState<DiaHorasData[]>([]);
  const [horasSemanas, setHorasSemanas] = useState<SemanaHorasData[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState<Set<string>>(new Set());
  
  // Estado para el modal de vista semanal
  const [isWeekViewModalOpen, setIsWeekViewModalOpen] = useState(false);
  const [selectedWeekUrl, setSelectedWeekUrl] = useState<string>('');
  
  // Obtener el storeRecordId del contexto en el nivel superior del componente
  const { storeRecordId } = useSchedule();
  
  // Mantener referencias a los valores previos de horas efectivas por semana
  const prevHorasEfectivasSemanaRef = useRef<{[semanaId: string]: number}>({});
  
  // Mantener referencias a los elementos DOM de las semanas
  const semanasElementRefs = useRef<{[semanaId: string]: HTMLSpanElement | null}>({});
  
  // Función para animar un cambio en las horas efectivas de una semana
  const animateHorasEfectivasChange = (semanaId: string) => {
    const element = semanasElementRefs.current[semanaId];
    if (element) {
      // Añadir clase de animación
      element.classList.add('animate-flash');
      
      // Remover después de la animación
      setTimeout(() => {
        if (element) {
          element.classList.remove('animate-flash');
        }
      }, 600);
    }
  };

  // Cargar semanas del mes
  useEffect(() => {
    async function cargarSemanas() {
      setIsLoading(true);
      setError(null);
      try {
        const semanasData = await obtenerSemanasLaborales(mes, año);
        setSemanas(semanasData);
        
        // Para cada semana cargada, inicializar sus datos de horas
        const nuevasHorasSemanas = semanasData.map(semana => ({
          semanaId: semana.id,
          horasAprobadas: 0, // Inicializar en 0, se actualizará cuando se expanda la semana
          horasContratadas: 0, // Inicializar en 0, se actualizará cuando se expanda la semana
          horasEfectivas: 0 // Inicializar en 0, se actualizará cuando se expanda la semana
        }));
        
        // Si tenemos un storeRecordId, cargar los datos de la tienda para obtener las horas aprobadas
        if (storeRecordId) {
          try {
            const tiendaData = await obtenerDatosTienda(storeRecordId);
            if (tiendaData && tiendaData.fields['Horas Aprobadas']) {
              const horasAprobadas = tiendaData.fields['Horas Aprobadas'] || 0;
              
              // Actualizar las horas aprobadas para todas las semanas
              nuevasHorasSemanas.forEach(semana => {
                semana.horasAprobadas = horasAprobadas;
              });
            }
          } catch (err) {
            console.error('Error al cargar datos de la tienda:', err);
          }
        }
        
        setHorasSemanas(nuevasHorasSemanas);
        
        // Cargar datos de horas para los días (se hará bajo demanda cuando se expanda una semana)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar semanas');
      } finally {
        setIsLoading(false);
      }
    }

    cargarSemanas();
  }, [mes, año, storeRecordId]);

  // Efecto para actualizar los datos de horas cuando hay cambios en los valores actualizados
  useEffect(() => {
    if (!horasEfectivasActualizadas) return;

    console.log("MonthView recibió horasEfectivasActualizadas:", horasEfectivasActualizadas);

    // Actualizar horas de días si hay cambios
    if (Object.keys(horasEfectivasActualizadas.dias).length > 0) {
      setHorasDias(prevHorasDias => {
        const newHorasDias = [...prevHorasDias];
        
        // Actualizar cada día que tenga cambios
        Object.entries(horasEfectivasActualizadas.dias).forEach(([diaId, horasEfectivas]) => {
          const index = newHorasDias.findIndex(d => d.diaId === diaId);
          if (index >= 0) {
            // Actualizar día existente
            newHorasDias[index] = {
              ...newHorasDias[index],
              horasEfectivas
            };
            console.log(`Día actualizado: ${diaId}, horas: ${horasEfectivas}`);
          } else {
            // Añadir nuevo día
            newHorasDias.push({
              diaId,
              horasEfectivas
            });
            console.log(`Nuevo día añadido: ${diaId}, horas: ${horasEfectivas}`);
          }
        });
        
        return newHorasDias;
      });
    }

    // Actualizar horas de semanas si hay cambios
    if (Object.keys(horasEfectivasActualizadas.semanas).length > 0) {
      setHorasSemanas(prevHorasSemanas => {
        const newHorasSemanas = [...prevHorasSemanas];
        
        // Actualizar cada semana que tenga cambios
        Object.entries(horasEfectivasActualizadas.semanas).forEach(([semanaId, horasEfectivas]) => {
          // Ignorar la entrada 'lastUpdated' que es especial
          if (semanaId === 'lastUpdated') return;
          
          const index = newHorasSemanas.findIndex(s => s.semanaId === semanaId);
          if (index >= 0) {
            // Verificar si el valor ha cambiado
            const prevValue = prevHorasEfectivasSemanaRef.current[semanaId] || 0;
            const newValue = horasEfectivas;
            
            // Si el valor ha cambiado, programar una animación
            if (prevValue !== newValue) {
              // Programar la animación para después del render
              setTimeout(() => animateHorasEfectivasChange(semanaId), 50);
              
              // Actualizar el valor de referencia
              prevHorasEfectivasSemanaRef.current[semanaId] = newValue;
            }
            
            // Actualizar semana existente
            newHorasSemanas[index] = {
              ...newHorasSemanas[index],
              horasEfectivas
            };
            console.log(`Semana actualizada: ${semanaId}, horas: ${horasEfectivas}`);
          } else {
            // Si la semana no existe en nuestro estado, pero tenemos sus horas efectivas
            // Podríamos añadirla con valores por defecto para los otros campos
            console.log(`No se encontró la semana ${semanaId} en el estado actual`);
          }
        });
        
        return newHorasSemanas;
      });
    }
  }, [horasEfectivasActualizadas]);

  // Alternar expansión de semana
  const toggleWeekExpansion = async (weekId: string) => {
    // Si vamos a expandir la semana y no tiene datos cargados todavía
    if (!expandedWeeks.has(weekId) && !horasSemanas.find(s => s.semanaId === weekId && (s.horasContratadas > 0 || s.horasEfectivas > 0))) {
      // Marcar la semana como cargando
      setLoadingWeeks(prev => {
        const newSet = new Set(prev);
        newSet.add(weekId);
        return newSet;
      });
      
      // Expandir inmediatamente para mostrar el skeleton
      setExpandedWeeks(prev => {
        const newSet = new Set(prev);
        newSet.add(weekId);
        return newSet;
      });
      
      // Cargar los datos en segundo plano
      await cargarDatosDiasSemana(weekId);
      
      // Quitar el estado de carga
      setLoadingWeeks(prev => {
        const newSet = new Set(prev);
        newSet.delete(weekId);
        return newSet;
      });
    } else {
      // Si ya tiene datos o queremos contraer, simplemente alternar
      setExpandedWeeks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(weekId)) {
          newSet.delete(weekId);
        } else {
          newSet.add(weekId);
        }
        return newSet;
      });
    }
  };

  // Cargar datos de horas para los días de una semana
  const cargarDatosDiasSemana = async (semanaId: string) => {
    try {
      // Encontrar la semana
      const semana = semanas.find(s => s.id === semanaId);
      if (!semana || !semana.fields['Dias Laborales']) return;
      
      // Obtenemos los días de la semana
      const diasIds = semana.fields['Dias Laborales'];
      
      // Verificar que tenemos un storeRecordId
      if (!storeRecordId) {
        console.error('No hay un ID de tienda disponible en el contexto');
        return;
      }
      
      // Obtener datos de la tienda
      const tiendaData = await obtenerDatosTienda(storeRecordId);
      
      if (!tiendaData) return;
      
      // Temp array para almacenar los datos de los días
      const nuevosDatosHorasDias: DiaHorasData[] = [];
      let horasContratadasTotal = 0;
      let horasEfectivasTotal = 0;
      
      // Obtener horas aprobadas de la tienda
      const horasAprobadas = tiendaData.fields['Horas Aprobadas'] || 0;
      
      console.log(`Procesando semana ${semanaId}, con ${diasIds.length} días y HA=${horasAprobadas}`);
      
      // Para cada día, obtener sus actividades y calcular horas
      for (const diaId of diasIds) {
        const actividades = await obtenerActividadesDiarias(storeRecordId, diaId);
        
        // Calcular horas efectivas
        const horasEfectivas = calcularHorasEfectivasDiarias(
          actividades,
          {
            PAIS: tiendaData.fields.PAIS,
            Apertura: tiendaData.fields.Apertura,
            Cierre: tiendaData.fields.Cierre
          }
        );
        
        // Calcular horas contratadas (suma de las horas asignadas como "TRABAJO")
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
          const intervaloPais = tiendaData.fields.PAIS?.toUpperCase() === 'FRANCIA' ? 0.25 : 0.5;
          
          // Sumar las horas de trabajo para esta actividad
          horasContratadas += horasTrabajo * intervaloPais;
        });
        
        console.log(`Día ${diaId}: HE=${horasEfectivas.toFixed(1)}, HC=${horasContratadas.toFixed(1)}`);
        
        // Sumar al total semanal
        horasContratadasTotal += horasContratadas;
        horasEfectivasTotal += horasEfectivas;
        
        // Almacenar datos del día
        nuevosDatosHorasDias.push({
          diaId,
          horasEfectivas
        });
      }
      
      console.log(`Semana ${semanaId} - Totales: HA=${horasAprobadas.toFixed(1)}, HC=${horasContratadasTotal.toFixed(1)}, HE=${horasEfectivasTotal.toFixed(1)}`);
      
      // Actualizar los datos de horas para los días
      setHorasDias(prev => [...prev.filter(d => !diasIds.includes(d.diaId)), ...nuevosDatosHorasDias]);
      
      // Actualizar los datos de la semana, incluyendo las horas aprobadas
      setHorasSemanas(prev => {
        const newHorasSemanas = [...prev];
        const index = newHorasSemanas.findIndex(s => s.semanaId === semanaId);
        
        if (index >= 0) {
          newHorasSemanas[index] = {
            ...newHorasSemanas[index],
            horasContratadas: horasContratadasTotal,
            horasEfectivas: horasEfectivasTotal,
            horasAprobadas: horasAprobadas
          };
        } else {
          // Si por alguna razón no existe, la añadimos
          newHorasSemanas.push({
            semanaId,
            horasContratadas: horasContratadasTotal,
            horasEfectivas: horasEfectivasTotal,
            horasAprobadas: horasAprobadas
          });
        }
        
        return newHorasSemanas;
      });
      
    } catch (err) {
      console.error('Error al cargar datos de horas:', err);
    }
  };

  // Obtener horas efectivas para un día específico, priorizando los valores actualizados
  const getHorasEfectivasDia = (diaId: string): number => {
    // Primero verificar si tenemos un valor actualizado para este día
    if (horasEfectivasActualizadas?.dias[diaId] !== undefined) {
      return horasEfectivasActualizadas.dias[diaId];
    }
    // Si no, usar el valor del estado
    const datoDia = horasDias.find(d => d.diaId === diaId);
    return datoDia?.horasEfectivas || 0;
  };

  // Obtener datos de horas para una semana específica, priorizando los valores actualizados
  const getHorasSemana = (semanaId: string): SemanaHorasData => {
    // Buscar los datos de la semana en el estado
    const datoSemanaActual = horasSemanas.find(s => s.semanaId === semanaId);
    
    // Si no tenemos datos para esta semana, devolver valores por defecto
    if (!datoSemanaActual) {
      return { 
        semanaId, 
        horasAprobadas: 0, 
        horasContratadas: 0, 
        horasEfectivas: 0 
      };
    }
    
    // Si tenemos una actualización para las horas efectivas, usarla manteniendo el resto de propiedades
    if (horasEfectivasActualizadas?.semanas[semanaId] !== undefined) {
      return {
        ...datoSemanaActual,
        horasEfectivas: horasEfectivasActualizadas.semanas[semanaId]
      };
    }
    
    // Si no hay actualizaciones, devolver los datos actuales
    return datoSemanaActual;
  };

  // Componente para el skeleton loader de horas en la semana
  const SkeletonHorasSemana = () => (
    <div className="flex items-center gap-2 mt-1 text-xs animate-pulse">
      <span className="text-blue-700 font-medium">HA: </span>
      <div className="h-4 w-10 bg-gray-200 rounded mr-3"></div>
      
      <span className="text-green-700 font-medium">HC: </span>
      <div className="h-4 w-10 bg-gray-200 rounded mr-3"></div>
      
      <span className="text-red-700 font-medium">HE: </span>
      <div className="h-4 w-10 bg-gray-200 rounded"></div>
    </div>
  );

  // Componente para el skeleton loader de las horas efectivas del día
  const SkeletonHorasEfectivasDia = () => (
    <div className="bg-red-50 p-1 rounded text-xs mt-2 animate-pulse">
      <span className="block text-red-700 font-medium">Horas Efectivas:</span>
      <div className="h-4 w-8 bg-red-100 rounded mx-auto"></div>
    </div>
  );

  // Días de la semana
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Función para obtener el ID de la semana a la que pertenece un día
  const getSemanaIdPorDia = (diaId: string): string | null => {
    for (const semana of semanas) {
      if (semana.fields['Dias Laborales']?.includes(diaId)) {
        return semana.id;
      }
    }
    return null;
  };

  // Gestionar la selección de un día
  const handleSelectDay = (diaId: string, fecha: Date) => {
    // Buscar a qué semana pertenece este día
    const semanaId = getSemanaIdPorDia(diaId);
    let horasEfectivasSemana = 0;
    
    // Obtener las horas efectivas semanales
    if (semanaId) {
      const datosSemana = getHorasSemana(semanaId);
      horasEfectivasSemana = datosSemana.horasEfectivas;
      
      // Guardar la relación entre día y semana para futuras actualizaciones
      window.localStorage.setItem(`dia_semana_${diaId}`, semanaId);
      
      // También guardar la semana actual para referencia rápida
      window.localStorage.setItem('ultima_semana_seleccionada', semanaId);
      
      console.log(`Día ${diaId} pertenece a semana ${semanaId}, horas efectivas: ${horasEfectivasSemana}`);
    } else {
      console.warn(`No se pudo encontrar la semana para el día ${diaId}`);
    }
    
    // Llamar a la función onSelectDay con el ID del día, la fecha y las horas efectivas semanales
    onSelectDay(diaId, fecha, horasEfectivasSemana);
  };

  // Función para abrir el modal con la vista semanal
  const handleOpenWeekViewModal = (weekId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (storeRecordId) {
      // Construir la URL para la vista semanal
      const weekViewUrl = `/semana/${storeRecordId}/${weekId}`;
      setSelectedWeekUrl(weekViewUrl);
      setIsWeekViewModalOpen(true);
    } else {
      console.error('No hay ID de tienda disponible para mostrar la vista semanal');
    }
  };
  
  // Función para cerrar el modal
  const handleCloseWeekViewModal = () => {
    setIsWeekViewModalOpen(false);
  };

  // Si es móvil, usar el componente MonthViewMobile pero después de declarar todos los hooks
  if (isMobile) {
    return (
      <MonthViewMobile
        mes={mes}
        año={año}
        onBack={onBack}
        onSelectDay={onSelectDay}
        onGeneratePdf={onGeneratePdf}
        onViewMonthSummary={onViewMonthSummary}
        horasEfectivasActualizadas={horasEfectivasActualizadas}
      />
    );
  }

  // Sólo continuamos con la lógica de renderizado del componente desktop si no es móvil
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center p-8">
        <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
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
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="outline" size="sm" onClick={onBack} className="text-xs sm:text-sm p-1 sm:p-2">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            Volver
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{mes} {año}</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white text-xs sm:text-sm p-1 sm:p-2"
            onClick={() => onViewMonthSummary(mes, año)}
          >
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <span className="hidden sm:inline">Ver resumen del mes</span>
            <span className="sm:hidden">Resumen</span>
          </Button>
        </div>
      </div>

      {semanas.length === 0 ? (
        <div className="w-full text-center py-8 text-gray-500">
          No hay semanas registradas para {mes} {año}
        </div>
      ) : (
        <div className="w-full space-y-3">
          {semanas.map(week => {
            // Ajustar las fechas para empezar en lunes y terminar en domingo
            let fechaInicio = week.fields['Fecha de Inicio'] ? new Date(week.fields['Fecha de Inicio']) : new Date();
            let fechaFin = week.fields['Fecha de fin'] ? new Date(week.fields['Fecha de fin']) : new Date();
            
            // Si la fecha de inicio es domingo, moverla al lunes siguiente
            if (fechaInicio.getDay() === 0) {
              fechaInicio.setDate(fechaInicio.getDate() + 1);
            }
            
            // Si la fecha fin es sábado, moverla al domingo siguiente
            if (fechaFin.getDay() === 6) {
              fechaFin.setDate(fechaFin.getDate() + 1);
            }

            const isExpanded = expandedWeeks.has(week.id);
            const isLoading = loadingWeeks.has(week.id);
            const horasSemana = getHorasSemana(week.id);

            // Asignar una función de callback para la referencia del elemento
            const setHorasEfectivasRef = (el: HTMLSpanElement | null) => {
              semanasElementRefs.current[week.id] = el;
            };

            return (
              <div key={week.id} className="week-container mb-4">
                <div
                  className="week-header w-full bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => toggleWeekExpansion(week.id)}
                >
                  <div className="w-full p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-grow">
                        <h3 className="text-base sm:text-lg font-medium">{week.fields.Name || `Semana ${week.id}`}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {formatearFecha(fechaInicio)} - {formatearFecha(fechaFin)}
                        </p>
                        
                        {/* Indicadores de Horas de la Semana - Con skeleton loader */}
                        {isLoading ? (
                          <SkeletonHorasSemana />
                        ) : (
                          <div className="flex items-center flex-wrap gap-2 mt-1 text-xs">
                            <span className="text-blue-700 font-medium">HA: </span>
                            <span className="font-bold mr-3">{horasSemana.horasAprobadas.toFixed(1)}</span>
                            
                            <span className="text-green-700 font-medium">HC: </span>
                            <span className="font-bold mr-3">{horasSemana.horasContratadas.toFixed(1)}</span>
                            
                            <span className="text-red-700 font-medium">HE: </span>
                            <span 
                              ref={setHorasEfectivasRef}
                              className="font-bold py-1 px-2 rounded-full transition-colors"
                            >
                              {horasSemana.horasEfectivas.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <Button 
                          variant="primary"
                          size="sm"
                          className="text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-3"
                          onClick={(e) => handleOpenWeekViewModal(week.id, e)}
                        >
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          <span className="hidden sm:inline">Generar PDF</span>
                          <span className="sm:hidden">PDF</span>
                        </Button>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="week-content mt-3 sm:mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                      {diasSemana.map((day, index) => {
                        // Calcular la fecha para este día
                        const fecha = new Date(fechaInicio);
                        fecha.setDate(fechaInicio.getDate() + index);
                        
                        // Determinar si es fin de semana
                        const isWeekend = day === 'Domingo' || day === 'Sábado';
                        
                        // Determinar si es hoy
                        const isToday = new Date().toDateString() === fecha.toDateString();
                        
                        // Buscar el ID del día laboral si existe
                        const diaLaboral = week.fields['Dias Laborales']?.[index];
                        
                        // Obtener horas efectivas para este día
                        const horasEfectivas = diaLaboral ? getHorasEfectivasDia(diaLaboral) : 0;
                        
                        return (
                          <div 
                            key={day}
                            className={`bg-white rounded-lg shadow-sm border ${isToday ? 'border-green-500' : 'border-gray-200'} ${diaLaboral ? 'cursor-pointer hover:border-blue-500' : 'opacity-70'} transition-colors overflow-hidden`}
                            onClick={() => diaLaboral && handleSelectDay(diaLaboral, fecha)}
                          >
                            <div className={`day-header ${isWeekend ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'} ${isToday ? 'bg-green-50 text-green-700' : ''} p-2 sm:p-3 text-center border-b ${isToday ? 'border-green-100' : isWeekend ? 'border-indigo-100' : 'border-blue-100'}`}>
                              <div className="text-sm sm:text-base font-semibold">{day}</div>
                            </div>
                            <div className="p-2 sm:p-3">
                              <div className="text-center">
                                <div className="text-xs sm:text-sm text-gray-600 mb-2">
                                  {fecha.getDate()} de {fecha.toLocaleString('es-ES', { month: 'long' })}
                                </div>
                                
                                {/* Indicador de Horas Efectivas del Día - Con skeleton loader */}
                                {diaLaboral && (
                                  isLoading ? (
                                    <SkeletonHorasEfectivasDia />
                                  ) : (
                                    <div className="bg-red-50 p-1 rounded text-xs mt-2">
                                      <span className="block text-red-700 font-medium">Horas Efectivas:</span>
                                      <span className="font-bold">{horasEfectivas.toFixed(1)}</span>
                                    </div>
                                  )
                                )}
                                
                                {!diaLaboral && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    No disponible
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para mostrar la vista semanal */}
      <Modal
        isOpen={isWeekViewModalOpen}
        onClose={handleCloseWeekViewModal}
        title="Vista Semanal"
        size="full"
        className="p-0 max-h-[95vh]"
      >
        {selectedWeekUrl && (
          <div className="w-full h-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Horario Semanal</h3>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
                    if (iframe) {
                      // Extraer el weekId de la URL para el nombre del archivo
                      const weekId = selectedWeekUrl.split('/').pop();
                      captureIframeAsPdf(iframe, `horario-semanal-${weekId}.pdf`);
                    }
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>
            <iframe 
              src={selectedWeekUrl}
              className="w-full h-full border-none"
              style={{ height: 'calc(95vh - 120px)', minHeight: '700px' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
} 