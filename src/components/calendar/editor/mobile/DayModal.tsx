'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Option } from '@/components/ui/Select';

// Tipo para las opciones del dropdown
interface DropdownOption {
  value: string;
  label: string;
  color?: string;
}
import { 
  obtenerActividadesDiarias, 
  obtenerDatosTienda, 
  actualizarHorario,
  ActividadDiariaRecord,
  TiendaSupervisorRecord,
  opcionesDropdown
} from '@/lib/airtable';
import { 
  generarColumnasTiempo, 
  calcularHorasEfectivasDiarias,
  getBackgroundColor,
  mostrarNotificacion,
  DatosTraficoDia,
  calcularPersonalEstimado,
  generarDatosTraficoEjemplo
} from '@/lib/utils';
import { obtenerDatosTrafico } from '@/lib/api';
import { HoursIndicators } from './HoursIndicators';
import { ScheduleCard } from './ScheduleCard';
import { TrafficTable } from './TrafficTable';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  diaId: string | null;
  fecha: Date | null;
  storeRecordId: string | null;
  horasEfectivasSemanalesIniciales?: number;
  onCloseWithUpdatedHours?: (diaId: string, horasEfectivasDiarias: number, horasEfectivasSemanales: number) => void;
}

export function DayModal({ 
  isOpen, 
  onClose, 
  diaId, 
  fecha, 
  storeRecordId, 
  horasEfectivasSemanalesIniciales = 0,
  onCloseWithUpdatedHours
}: DayModalProps) {
  const [actividades, setActividades] = useState<ActividadDiariaRecord[]>([]);
  const [tiendaData, setTiendaData] = useState<TiendaSupervisorRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horasEfectivasDiarias, setHorasEfectivasDiarias] = useState(0);
  const [horasEfectivasDiariasIniciales, setHorasEfectivasDiariasIniciales] = useState(0);
  const [horasAprobadasSemanales, setHorasAprobadasSemanales] = useState(0);
  const [horasEfectivasSemanales, setHorasEfectivasSemanales] = useState(0);
  const [columnasTiempo, setColumnasTiempo] = useState<string[]>([]);
  const [datosTraficoDia, setDatosTraficoDia] = useState<DatosTraficoDia | null>(null);
  const [personalEstimado, setPersonalEstimado] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'schedule' | 'traffic'>('schedule');
  const [expandedSections, setExpandedSections] = useState({
    hours: true,
    schedule: true,
    traffic: false
  });

  // Toggles para las secciones
  const toggleSection = (section: keyof typeof expandedSections, e?: React.MouseEvent) => {
    // Si se proporciona un evento, detener la propagación
    if (e) {
      e.stopPropagation();
    }
    
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Inicializar las horas efectivas semanales con el valor heredado
  useEffect(() => {
    if (isOpen && horasEfectivasSemanalesIniciales) {
      setHorasEfectivasSemanales(horasEfectivasSemanalesIniciales);
    }
  }, [isOpen, horasEfectivasSemanalesIniciales]);

  // Cargar datos del día
  useEffect(() => {
    if (isOpen && diaId && storeRecordId) {
      cargarDatosDelDia();
    }
  }, [isOpen, diaId, storeRecordId]);

  // Función para cargar datos del día
  const cargarDatosDelDia = async () => {
    if (!diaId || !storeRecordId) {
      setError('No se proporcionó ID del día o de la tienda');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Obtener datos de la tienda
      const tiendaResponse = await obtenerDatosTienda(storeRecordId);
      if (!tiendaResponse) {
        throw new Error('No se pudo obtener información de la tienda');
      }
      setTiendaData(tiendaResponse);
      const tiendaData = tiendaResponse.fields;

      // Obtener actividades diarias
      const actividadesResponse = await obtenerActividadesDiarias(storeRecordId, diaId);
      if (!actividadesResponse) {
        throw new Error('No se pudieron obtener las actividades diarias');
      }
      
      // Ordenar actividades por nombre (con VACANTE al final)
      const actividadesOrdenadas = [...actividadesResponse].sort((a, b) => {
        const nombreA = (a.fields.Nombre || '').toString().toUpperCase();
        const nombreB = (b.fields.Nombre || '').toString().toUpperCase();
        
        if (nombreA === 'VACANTE') return 1;
        if (nombreB === 'VACANTE') return -1;
        
        return nombreA.localeCompare(nombreB);
      });
      
      setActividades(actividadesOrdenadas);

      // Generar columnas de tiempo basadas en los datos de la tienda
      const columnas = generarColumnasTiempo(
        tiendaData.PAIS,
        tiendaData.Apertura,
        tiendaData.Cierre
      );
      setColumnasTiempo(columnas);

      // Obtener datos de tráfico reales desde la API
      const datosTraficoDiaAPI = await obtenerDatosTrafico(diaId, storeRecordId);
      
      // Si no se pudieron obtener datos de la API, usar datos de ejemplo como fallback
      const datosTraficoDiaFinal = datosTraficoDiaAPI || generarDatosTraficoEjemplo(columnas);
      setDatosTraficoDia(datosTraficoDiaFinal);
      
      // Calcular personal estimado
      const { estimado } = calcularPersonalEstimado(datosTraficoDiaFinal, columnas);
      setPersonalEstimado(estimado);

      // Calcular horas efectivas
      const horasEfectivas = calcularHorasEfectivasDiarias(
        actividadesOrdenadas,
        {
          PAIS: tiendaData.PAIS,
          Apertura: tiendaData.Apertura,
          Cierre: tiendaData.Cierre
        }
      );
      setHorasEfectivasDiarias(horasEfectivas);
      setHorasEfectivasDiariasIniciales(horasEfectivas);
      
      // Obtener horas aprobadas semanales
      setHorasAprobadasSemanales(tiendaData['Horas Aprobadas'] || 0);
      
      // Usar las horas efectivas semanales iniciales si se proporcionaron
      // De lo contrario, intentar calcular correctamente desde la semana
      if (horasEfectivasSemanalesIniciales && horasEfectivasSemanalesIniciales > 0) {

        setHorasEfectivasSemanales(horasEfectivasSemanalesIniciales);
      } else {
        // Intentar obtener la semana de localStorage
        const semanaId = window.localStorage.getItem(`dia_semana_${diaId}`);
        
        if (semanaId && storeRecordId) {
          try {
            const { obtenerHorasEfectivasSemanaPorId } = await import('@/lib/utils');
            const horasSemanalesCalculadas = await obtenerHorasEfectivasSemanaPorId(semanaId, storeRecordId);
            setHorasEfectivasSemanales(horasSemanalesCalculadas);
          } catch (error) {
            console.error('Error al calcular horas efectivas semanales:', error);
            // Usar cálculo de respaldo como último recurso
            const fallbackHoras = horasEfectivas * 5;
            setHorasEfectivasSemanales(fallbackHoras);
          }
        } else {
          // Solo como último respaldo si no hay información de semana
          const fallbackHoras = horasEfectivas * 5;
          setHorasEfectivasSemanales(fallbackHoras);
        }
      }

    } catch (error) {
      console.error('Error al cargar datos del día:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para actualizar el horario
  const handleUpdateHorario = async (actividadId: string, tiempo: string, valor: string) => {
    if (!actividadId || !tiempo) {
      mostrarNotificacion('Faltan datos para actualizar el horario', 'error');
      return;
    }
    
    try {
      const success = await actualizarHorario(actividadId, tiempo, valor);
      
      if (success) {
        // Actualizar el estado local
        setActividades(prev => 
          prev.map(actividad => 
            actividad.id === actividadId 
              ? { ...actividad, fields: { ...actividad.fields, [tiempo]: valor } } 
              : actividad
          )
        );
        
        // Recalcular horas efectivas
        if (tiendaData) {
          const actividadesActualizadas = actividades.map(a => 
            a.id === actividadId 
              ? { ...a, fields: { ...a.fields, [tiempo]: valor } } 
              : a
          );
          
          const horasEfectivas = calcularHorasEfectivasDiarias(
            actividadesActualizadas,
            {
              PAIS: tiendaData.fields.PAIS,
              Apertura: tiendaData.fields.Apertura,
              Cierre: tiendaData.fields.Cierre
            }
          );
          

          
          // Actualizar las horas efectivas diarias
          setHorasEfectivasDiarias(horasEfectivas);
          
          // Actualizar también las horas efectivas semanales de forma más robusta
          // Calculando la diferencia respecto al día original y sumándola al total semanal
          const diferenciaDiaria = horasEfectivas - horasEfectivasDiariasIniciales;
          
          setHorasEfectivasSemanales(prev => {
            // Si tenemos un valor inicial válido, usarlo como base
            const baseValue = horasEfectivasSemanalesIniciales > 0 ? horasEfectivasSemanalesIniciales : prev;
            const nuevoValor = Math.max(0, baseValue + diferenciaDiaria);
            

            
            return nuevoValor;
          });
        }
        
        mostrarNotificacion('Horario actualizado correctamente', 'success');
      } else {
        mostrarNotificacion('Error al actualizar el horario', 'error');
      }
    } catch (err) {
      console.error('Error al actualizar horario:', err);
      mostrarNotificacion('Error al actualizar el horario', 'error');
    }
  };

  // Función para asignar a todo el día
  const handleAsignarATodoElDia = async (actividadId: string, valor: string) => {
    if (!actividadId) {
      mostrarNotificacion('ID de actividad no válido', 'error');
      return;
    }
    
    // Permitir valores vacíos para limpiar toda la fila
    // if (!valor) {
    //   // No hacer nada si no se seleccionó un valor
    //   return;
    // }
    
    if (!columnasTiempo || columnasTiempo.length === 0) {
      mostrarNotificacion('No hay columnas de tiempo definidas', 'error');
      return;
    }
    
    try {
      let allSuccess = true;
      let errores = 0;
      
      // Actualizar cada columna de tiempo
      for (const tiempo of columnasTiempo) {
        try {
          const success = await actualizarHorario(actividadId, tiempo, valor);
          if (!success) {
            allSuccess = false;
            errores++;
          }
        } catch (err) {
          console.error(`Error al actualizar horario para el tiempo ${tiempo}:`, err);
          allSuccess = false;
          errores++;
        }
      }
      
      // Actualizar estado local inmediatamente para mejor UX
      setActividades(prev => 
        prev.map(actividad => {
          if (actividad.id === actividadId) {
            const updatedFields = { ...actividad.fields };
            columnasTiempo.forEach(tiempo => {
              updatedFields[tiempo] = valor;
            });
            return { ...actividad, fields: updatedFields };
          }
          return actividad;
        })
      );
      
      // Recalcular horas efectivas
      if (tiendaData) {
        const actividadesActualizadas = actividades.map(a => {
          if (a.id === actividadId) {
            const updatedFields = { ...a.fields };
            columnasTiempo.forEach(tiempo => {
              updatedFields[tiempo] = valor;
            });
            return { ...a, fields: updatedFields };
          }
          return a;
        });
        
        const horasEfectivas = calcularHorasEfectivasDiarias(
          actividadesActualizadas,
          {
            PAIS: tiendaData.fields.PAIS,
            Apertura: tiendaData.fields.Apertura,
            Cierre: tiendaData.fields.Cierre
          }
        );
        

        
        // Actualizar las horas efectivas diarias
        setHorasEfectivasDiarias(horasEfectivas);
        
        // Actualizar también las horas efectivas semanales de forma más robusta
        const diferenciaDiaria = horasEfectivas - horasEfectivasDiariasIniciales;
        
        setHorasEfectivasSemanales(prev => {
          // Si tenemos un valor inicial válido, usarlo como base
          const baseValue = horasEfectivasSemanalesIniciales > 0 ? horasEfectivasSemanalesIniciales : prev;
          const nuevoValor = Math.max(0, baseValue + diferenciaDiaria);
          

          
          return nuevoValor;
        });
      }
      
      if (allSuccess) {
        mostrarNotificacion('Horario actualizado para todo el día', 'success');
      } else {
        mostrarNotificacion(`Horario parcialmente actualizado. ${errores} errores encontrados.`, 'success');
      }
      
    } catch (err) {
      console.error('Error global al asignar a todo el día:', err);
      mostrarNotificacion('Error al asignar horario para todo el día', 'error');
    }
  };

  // Formatear la fecha para mostrarla en el título
  const formatearFechaParaTitulo = (fecha: Date | null) => {
    if (!fecha) return 'Día sin fecha';
    
    // Formato más compacto para dispositivos móviles en una sola línea
    const opciones: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      day: 'numeric',
      month: 'long'
    };
    
    // Añadir año sólo si no es el año actual
    if (fecha.getFullYear() !== new Date().getFullYear()) {
      opciones.year = 'numeric';
    }
    
    const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);
    // Capitalizar primera letra
    return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  };

  // Función personalizada para cerrar el modal
  const handleClose = () => {
    // Llamar a la función onCloseWithUpdatedHours si existe
    if (onCloseWithUpdatedHours && diaId) {
      onCloseWithUpdatedHours(diaId, horasEfectivasDiarias, horasEfectivasSemanales);
    }
    onClose();
  };

  // Opciones para los dropdowns con formato correcto
  const options: DropdownOption[] = [
    { value: '', label: 'Seleccionar...', color: '#E5E7EB' }, // Opción vacía con etiqueta clara
    ...opcionesDropdown.map(opcion => ({
      value: opcion,
      label: opcion,
      color: opcion === 'TRABAJO' ? '#10B981' : // verde
             opcion === 'VACACIONES' ? '#3B82F6' : // azul
             opcion === 'LIBRE' ? '#EF4444' : // rojo
             opcion === 'BAJA MÉDICA' ? '#8B5CF6' : // púrpura
             opcion === 'FORMACIÓN' ? '#F97316' : // naranja
             opcion === 'LACTANCIA' ? '#EC4899' : // rosa
             '#D1D5DB' // gris por defecto
    }))
  ];

  // Opciones para asignar a todo el día (incluir opción para limpiar)
  const optionsAsignar: DropdownOption[] = [
    { value: '', label: 'Limpiar toda la fila', color: '#F3F4F6' }, // Opción para limpiar
    ...options.filter(opt => opt.value !== 'TRABAJO' && opt.value !== '') // Excluir TRABAJO y la opción vacía duplicada
  ];

  return (
    <div className={`fixed inset-0 z-50 bg-gray-50 flex flex-col`} style={{ display: isOpen ? 'flex' : 'none' }}>
      {/* Header fijo en la parte superior */}
      <div className="bg-white py-3 px-3 border-b border-gray-200 sticky top-0 z-10 shadow-sm flex-shrink-0">
        <div className="flex items-center">
          <button 
            onClick={handleClose}
            className="p-1.5 mr-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h2 className="text-base font-semibold text-gray-800 text-center mx-auto pr-9">
            {formatearFechaParaTitulo(fecha)}
          </h2>
        </div>
      </div>
      
      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 pb-28">
          {/* Sección de Horas */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="flex justify-between items-center p-3 border-b border-gray-100 cursor-pointer" 
              onClick={(e) => toggleSection('hours', e)}
            >
              <h3 className="text-sm font-medium text-gray-800">Indicadores de Horas</h3>
              {expandedSections.hours ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
            
            {expandedSections.hours && (
              <div className="p-3">
                <HoursIndicators
                  horasEfectivasDiarias={horasEfectivasDiarias}
                  horasAprobadasSemanales={horasAprobadasSemanales}
                  horasEfectivasSemanales={horasEfectivasSemanales}
                />
              </div>
            )}
          </div>
          
          {/* Sección de Horarios */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="flex justify-between items-center p-3 border-b border-gray-100 cursor-pointer" 
              onClick={(e) => toggleSection('schedule', e)}
            >
              <h3 className="text-sm font-medium text-gray-800">Horarios del Día</h3>
              {expandedSections.schedule ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
            
            {expandedSections.schedule && (
              <div className="p-3">
                <ScheduleCard
                  actividades={actividades}
                  columnasTiempo={columnasTiempo}
                  options={options}
                  optionsAsignar={optionsAsignar} 
                  isLoading={isLoading}
                  error={error}
                  handleUpdateHorario={handleUpdateHorario}
                  handleAsignarATodoElDia={handleAsignarATodoElDia}
                  tiendaData={tiendaData ? {
                    PAIS: tiendaData.fields.PAIS,
                    Apertura: tiendaData.fields.Apertura,
                    Cierre: tiendaData.fields.Cierre
                  } : undefined}
                />
              </div>
            )}
          </div>
          
          {/* Sección de Tráfico */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div 
              className="flex justify-between items-center p-3 border-b border-gray-100 cursor-pointer" 
              onClick={(e) => toggleSection('traffic', e)}
            >
              <h3 className="text-sm font-medium text-gray-800">Tráfico por Hora</h3>
              {expandedSections.traffic ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
            
            {expandedSections.traffic && (
              <div className="p-3">
                <TrafficTable
                  key={`traffic-mobile-${diaId}-${actividades.length}`}
                  datosTraficoDia={datosTraficoDia}
                  isLoading={isLoading}
                  error={error}
                  actividades={actividades}
                  storeRecordId={storeRecordId || undefined}
                  fecha={fecha || undefined}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 