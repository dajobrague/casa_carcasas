// Este archivo contiene la versión móvil del componente MonthView
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { obtenerSemanasLaborales, formatearFecha, SemanaLaboralRecord, obtenerActividadesDiarias, obtenerDatosTienda } from '@/lib/airtable';
import { FileText, ArrowLeft, Calendar } from 'lucide-react';
import { calcularHorasEfectivasDiarias } from '@/lib/utils';
import { useSchedule } from '@/context/ScheduleContext';
import { Modal } from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';
import { captureIframeAsPdf } from '@/lib/pdf-utils';

// Reusamos las mismas interfaces del MonthView original
interface MonthViewMobileProps {
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

export function MonthViewMobile({ 
  mes, 
  año, 
  onBack, 
  onSelectDay, 
  onGeneratePdf,
  onViewMonthSummary,
  horasEfectivasActualizadas = { dias: {}, semanas: {} } 
}: MonthViewMobileProps) {
  // Reusamos los mismos estados y refs del MonthView original
  const { storeRecordId } = useSchedule();
  const router = useRouter();
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);
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
  
  const prevHorasEfectivasSemanaRef = useRef<{[semanaId: string]: number}>({});
  const semanasElementRefs = useRef<{[semanaId: string]: HTMLSpanElement | null}>({});
  
  // Mantenemos la misma función de animación
  const animateHorasEfectivasChange = (semanaId: string) => {
    const element = semanasElementRefs.current[semanaId];
    if (element) {
      element.classList.add('animate-flash');
      setTimeout(() => {
        if (element) {
          element.classList.remove('animate-flash');
        }
      }, 600);
    }
  };

  // Reutilizamos los mismos efectos y funciones del componente original
  useEffect(() => {
    async function cargarSemanas() {
      setIsLoading(true);
      setError(null);
      try {
        const semanasData = await obtenerSemanasLaborales(mes, año);
        setSemanas(semanasData);
        
        const nuevasHorasSemanas = semanasData.map(semana => ({
          semanaId: semana.id,
          horasAprobadas: 0,
          horasContratadas: 0,
          horasEfectivas: 0
        }));
        
        if (storeRecordId) {
          try {
            const tiendaData = await obtenerDatosTienda(storeRecordId);
            if (tiendaData && tiendaData.fields['Horas Aprobadas']) {
              const horasAprobadas = tiendaData.fields['Horas Aprobadas'] || 0;
              
              nuevasHorasSemanas.forEach(semana => {
                semana.horasAprobadas = horasAprobadas;
              });
            }
          } catch (err) {
            console.error('Error al cargar datos de la tienda:', err);
          }
        }
        
        setHorasSemanas(nuevasHorasSemanas);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar semanas');
      } finally {
        setIsLoading(false);
      }
    }

    cargarSemanas();
  }, [mes, año, storeRecordId]);

  // Reutilizamos el efecto para actualizar horas efectivas
  useEffect(() => {
    if (!horasEfectivasActualizadas) return;

    if (Object.keys(horasEfectivasActualizadas.dias).length > 0) {
      setHorasDias(prevHorasDias => {
        const newHorasDias = [...prevHorasDias];
        
        Object.entries(horasEfectivasActualizadas.dias).forEach(([diaId, horasEfectivas]) => {
          const index = newHorasDias.findIndex(d => d.diaId === diaId);
          if (index >= 0) {
            newHorasDias[index] = {
              ...newHorasDias[index],
              horasEfectivas
            };
          } else {
            newHorasDias.push({
              diaId,
              horasEfectivas
            });
          }
        });
        
        return newHorasDias;
      });
    }

    if (Object.keys(horasEfectivasActualizadas.semanas).length > 0) {
      setHorasSemanas(prevHorasSemanas => {
        const newHorasSemanas = [...prevHorasSemanas];
        
        Object.entries(horasEfectivasActualizadas.semanas).forEach(([semanaId, horasEfectivas]) => {
          if (semanaId === 'lastUpdated') return;
          
          const index = newHorasSemanas.findIndex(s => s.semanaId === semanaId);
          if (index >= 0) {
            const prevValue = prevHorasEfectivasSemanaRef.current[semanaId] || 0;
            const newValue = horasEfectivas;
            
            if (prevValue !== newValue) {
              setTimeout(() => animateHorasEfectivasChange(semanaId), 50);
              prevHorasEfectivasSemanaRef.current[semanaId] = newValue;
            }
            
            newHorasSemanas[index] = {
              ...newHorasSemanas[index],
              horasEfectivas
            };
          }
        });
        
        return newHorasSemanas;
      });
    }
  }, [horasEfectivasActualizadas]);

  // Reutilizamos la función para alternar semanas
  const toggleWeekExpansion = async (weekId: string) => {
    if (!expandedWeeks.has(weekId) && !horasSemanas.find(s => s.semanaId === weekId && (s.horasContratadas > 0 || s.horasEfectivas > 0))) {
      setLoadingWeeks(prev => {
        const newSet = new Set(prev);
        newSet.add(weekId);
        return newSet;
      });
      
      setExpandedWeeks(prev => {
        const newSet = new Set(prev);
        newSet.add(weekId);
        return newSet;
      });
      
      await cargarDatosDiasSemana(weekId);
      
      setLoadingWeeks(prev => {
        const newSet = new Set(prev);
        newSet.delete(weekId);
        return newSet;
      });
    } else {
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

  // Reutilizamos la función para cargar datos de días
  const cargarDatosDiasSemana = async (semanaId: string) => {
    try {
      const semana = semanas.find(s => s.id === semanaId);
      if (!semana || !semana.fields['Dias Laborales']) return;
      
      const diasIds = semana.fields['Dias Laborales'];
      
      if (!storeRecordId) {
        console.error('No hay un ID de tienda disponible en el contexto');
        return;
      }
      
      const tiendaData = await obtenerDatosTienda(storeRecordId);
      
      if (!tiendaData) return;
      
      const nuevosDatosHorasDias: DiaHorasData[] = [];
      let horasContratadasTotal = 0;
      let horasEfectivasTotal = 0;
      
      const horasAprobadas = tiendaData.fields['Horas Aprobadas'] || 0;
      
      for (const diaId of diasIds) {
        const actividades = await obtenerActividadesDiarias(storeRecordId, diaId);
        
        const horasEfectivas = calcularHorasEfectivasDiarias(
          actividades,
          {
            PAIS: tiendaData.fields.PAIS,
            Apertura: tiendaData.fields.Apertura,
            Cierre: tiendaData.fields.Cierre
          }
        );
        
        let horasContratadas = 0;
        actividades.forEach(actividad => {
          const horasTrabajo = Object.entries(actividad.fields)
            .filter(([campo, valor]) => 
              /^\d{2}:\d{2}$/.test(campo) && 
              valor === 'TRABAJO'
            ).length;
          
          const intervaloPais = tiendaData.fields.PAIS?.toUpperCase() === 'FRANCIA' ? 0.25 : 0.5;
          
          horasContratadas += horasTrabajo * intervaloPais;
        });
        
        horasContratadasTotal += horasContratadas;
        horasEfectivasTotal += horasEfectivas;
        
        nuevosDatosHorasDias.push({
          diaId,
          horasEfectivas
        });
      }
      
      setHorasDias(prev => [...prev.filter(d => !diasIds.includes(d.diaId)), ...nuevosDatosHorasDias]);
      
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

  // Reutilizamos las funciones para obtener datos
  const getHorasEfectivasDia = (diaId: string): number => {
    if (horasEfectivasActualizadas?.dias[diaId] !== undefined) {
      return horasEfectivasActualizadas.dias[diaId];
    }
    const datoDia = horasDias.find(d => d.diaId === diaId);
    return datoDia?.horasEfectivas || 0;
  };

  const getHorasSemana = (semanaId: string): SemanaHorasData => {
    const datoSemanaActual = horasSemanas.find(s => s.semanaId === semanaId);
    
    if (!datoSemanaActual) {
      return { 
        semanaId, 
        horasAprobadas: 0, 
        horasContratadas: 0, 
        horasEfectivas: 0 
      };
    }
    
    if (horasEfectivasActualizadas?.semanas[semanaId] !== undefined) {
      return {
        ...datoSemanaActual,
        horasEfectivas: horasEfectivasActualizadas.semanas[semanaId]
      };
    }
    
    return datoSemanaActual;
  };

  // Reutilizamos los componentes de skeleton
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

  const SkeletonHorasEfectivasDia = () => (
    <div className="bg-red-50 p-1 rounded text-xs mt-2 animate-pulse">
      <span className="block text-red-700 font-medium">Horas Efectivas:</span>
      <div className="h-4 w-8 bg-red-100 rounded mx-auto"></div>
    </div>
  );

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const getSemanaIdPorDia = (diaId: string): string | null => {
    for (const semana of semanas) {
      if (semana.fields['Dias Laborales']?.includes(diaId)) {
        return semana.id;
      }
    }
    return null;
  };

  const handleSelectDay = (diaId: string, fecha: Date) => {
    const semanaId = getSemanaIdPorDia(diaId);
    let horasEfectivasSemana = 0;
    
    if (semanaId) {
      const datosSemana = getHorasSemana(semanaId);
      horasEfectivasSemana = datosSemana.horasEfectivas;
      
      window.localStorage.setItem(`dia_semana_${diaId}`, semanaId);
      window.localStorage.setItem('ultima_semana_seleccionada', semanaId);
    }
    
    onSelectDay(diaId, fecha, horasEfectivasSemana);
  };

  // Reemplazar la función handleGeneratePdf con handleOpenWeekViewModal
  const handleOpenWeekViewModal = (e: React.MouseEvent, weekId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (storeRecordId) {
      // Construir URL para la vista semanal
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
      {/* Cabecera del mes con diseño responsive y botones más grandes para móvil */}
      <div className="flex items-center mb-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack} 
            className="text-sm p-3 sm:p-2 h-auto flex-grow-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{mes} {año}</h1>
        </div>
      </div>

      {semanas.length === 0 ? (
        <div className="w-full text-center py-8 text-gray-500">
          No hay semanas registradas para {mes} {año}
        </div>
      ) : (
        <div className="w-full space-y-4">
          {[...semanas]
            .sort((a, b) => {
              // Ordenar por fecha de inicio (más tempranas primero)
              const fechaInicioA = a.fields['Fecha de Inicio'] ? new Date(a.fields['Fecha de Inicio']).getTime() : 0;
              const fechaInicioB = b.fields['Fecha de Inicio'] ? new Date(b.fields['Fecha de Inicio']).getTime() : 0;
              return fechaInicioA - fechaInicioB; // Orden ascendente por fecha
            })
            .map(week => {
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

              const setHorasEfectivasRef = (el: HTMLSpanElement | null) => {
                semanasElementRefs.current[week.id] = el;
              };

              return (
                <div key={week.id} className="week-container mb-5">
                  {/* Cabecera de semana con diseño responsive y mejoras para móvil */}
                  <div
                    className="week-header w-full bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 transition-colors cursor-pointer relative"
                    onClick={() => toggleWeekExpansion(week.id)}
                  >
                    <div className="w-full p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <h3 className="text-base sm:text-lg font-medium pr-8">{week.fields.Name}</h3>
                            {/* Flecha para expandir/colapsar reposicionada */}
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="24" 
                              height="24"
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              className={`text-gray-500 transition-transform duration-200 absolute top-4 right-4 ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500">
                            {formatearFecha(fechaInicio)} - {formatearFecha(fechaFin)}
                          </p>
                          
                          {isLoading ? (
                            <SkeletonHorasSemana />
                          ) : (
                            <div className="flex items-center flex-wrap gap-2 mt-2 text-sm">
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
                        {/* Botón PDF actualizado para descarga directa con mensaje modificado */}
                        <div className="w-full">
                          <Button 
                            variant="primary"
                            size="sm"
                            className="text-sm py-3 px-4 w-full sm:w-auto"
                            onClick={(e) => handleOpenWeekViewModal(e, week.id)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Generar PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contenido de la semana (días) mostrados en formato vertical para móvil */}
                  {isExpanded && (
                    <div className="week-content mt-3">
                      {/* En lugar de grid-cols-7, usamos un diseño de lista vertical optimizado para móvil */}
                      <div className="flex flex-col gap-2">
                        {diasSemana.map((day, index) => {
                          const fecha = new Date(fechaInicio);
                          fecha.setDate(fechaInicio.getDate() + index);
                          
                          const isWeekend = day === 'Domingo' || day === 'Sábado';
                          const isToday = new Date().toDateString() === fecha.toDateString();
                          const diaLaboral = week.fields['Dias Laborales']?.[index];
                          const horasEfectivas = diaLaboral ? getHorasEfectivasDia(diaLaboral) : 0;
                          
                          return (
                            <div 
                              key={day}
                              className={`bg-white rounded-lg shadow-sm border ${isToday ? 'border-green-500' : 'border-gray-200'} ${diaLaboral ? 'cursor-pointer hover:border-blue-500 active:bg-blue-50' : 'opacity-70'} transition-colors overflow-hidden`}
                              onClick={() => diaLaboral && handleSelectDay(diaLaboral, fecha)}
                            >
                              {/* Diseño más compacto para tarjetas de día en móvil */}
                              <div className="flex items-center">
                                {/* Indicador de día con diseño más compacto */}
                                <div 
                                  className={`w-20 flex-shrink-0 h-full py-3 px-2 flex flex-col justify-center items-center
                                    ${isWeekend ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'} 
                                    ${isToday ? 'bg-green-50 text-green-700' : ''}
                                    border-r ${isToday ? 'border-green-100' : isWeekend ? 'border-indigo-100' : 'border-blue-100'}`}
                                >
                                  <div className="text-base font-semibold">{day.substring(0, 3)}</div>
                                  <div className="text-sm">
                                    {fecha.getDate()}
                                  </div>
                                </div>
                                
                                {/* Contenido del día con diseño mejorado */}
                                <div className="flex-grow p-3">
                                  <div className="text-xs text-gray-600">
                                    {fecha.getDate()} de {fecha.toLocaleString('es-ES', { month: 'long' })}
                                  </div>
                                  
                                  {diaLaboral ? (
                                    isLoading ? (
                                      <SkeletonHorasEfectivasDia />
                                    ) : (
                                      <div className="mt-1 flex items-center">
                                        <span className="text-red-700 font-medium mr-2">Horas Efectivas:</span>
                                        <span className="bg-red-50 text-red-800 font-bold py-1 px-3 rounded-full">
                                          {horasEfectivas.toFixed(1)}
                                        </span>
                                      </div>
                                    )
                                  ) : (
                                    <div className="text-sm italic text-gray-400 mt-1">
                                      No disponible
                                    </div>
                                  )}
                                </div>

                                {/* Indicador visual para días seleccionables */}
                                {diaLaboral && (
                                  <div className="pr-3">
                                    <svg 
                                      xmlns="http://www.w3.org/2000/svg" 
                                      width="20" 
                                      height="20" 
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                      className="text-gray-400"
                                    >
                                      <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                  </div>
                                )}
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

      {/* Agregar el Modal al final del componente */}
      <Modal
        isOpen={isWeekViewModalOpen}
        onClose={handleCloseWeekViewModal}
        title="Horario Semanal"
        size="full"
        className="p-0 max-h-[95vh]"
        rightContent={
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
        }
      >
        {selectedWeekUrl && (
          <div className="w-full h-full overflow-hidden flex flex-col">
            <iframe 
              src={selectedWeekUrl}
              className="w-full h-full border-none"
              style={{ height: 'calc(95vh - 64px)', minHeight: '500px' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
} 