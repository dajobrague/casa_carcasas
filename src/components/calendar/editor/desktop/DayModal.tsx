'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Option } from '@/components/ui/Select';
import { useAuth } from '@/context/AuthContext';

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
import { ScheduleTable } from './ScheduleTable';
import { TrafficTable } from './TrafficTable';
import { DayModal as DayModalMobile } from '../mobile/DayModal';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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
  // Obtener datos de la tienda para el debug
  const { esHistorica } = useAuth();
  
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

  // Detectar si es dispositivo móvil
  const isMobile = useMediaQuery('(max-width: 768px)');

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
        // Recargar los datos completos después de la actualización
        if (diaId && storeRecordId) {
          try {
            const actividadesActualizadas = await obtenerActividadesDiarias(storeRecordId, diaId);
            if (actividadesActualizadas) {
              // Ordenar actividades por nombre (con VACANTE al final)
              const actividadesOrdenadas = [...actividadesActualizadas].sort((a, b) => {
                const nombreA = (a.fields.Nombre || '').toString().toUpperCase();
                const nombreB = (b.fields.Nombre || '').toString().toUpperCase();
                
                if (nombreA === 'VACANTE') return 1;
                if (nombreB === 'VACANTE') return -1;
                
                return nombreA.localeCompare(nombreB);
              });
              
              setActividades(actividadesOrdenadas);
              
              // Recalcular horas efectivas con los datos actualizados
              if (tiendaData) {
                const horasEfectivas = calcularHorasEfectivasDiarias(
                  actividadesOrdenadas,
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
            }
          } catch (reloadError) {
            console.error('Error al recargar actividades:', reloadError);
            // Continuar con la actualización local como fallback
            setActividades(prev => 
              prev.map(actividad => 
                actividad.id === actividadId 
                  ? { ...actividad, fields: { ...actividad.fields, [tiempo]: valor } } 
                  : actividad
              )
            );
          }
        } else {
          // Actualizar el estado local como fallback si no podemos recargar
          setActividades(prev => 
            prev.map(actividad => 
              actividad.id === actividadId 
                ? { ...actividad, fields: { ...actividad.fields, [tiempo]: valor } } 
                : actividad
            )
          );
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
            // Si hay demasiados errores, detener el proceso
            if (errores > 3) {
              break;
            }
          }
        } catch (error) {
          allSuccess = false;
          errores++;
          console.error(`Error al actualizar horario para ${tiempo}:`, error);
          // Si hay demasiados errores, detener el proceso
          if (errores > 3) {
            break;
          }
        }
      }
      
      // Recargar los datos completos después de la actualización
      if (allSuccess && diaId && storeRecordId) {
        try {
          const actividadesActualizadas = await obtenerActividadesDiarias(storeRecordId, diaId);
          if (actividadesActualizadas) {
            // Ordenar actividades por nombre (con VACANTE al final)
            const actividadesOrdenadas = [...actividadesActualizadas].sort((a, b) => {
              const nombreA = (a.fields.Nombre || '').toString().toUpperCase();
              const nombreB = (b.fields.Nombre || '').toString().toUpperCase();
              
              if (nombreA === 'VACANTE') return 1;
              if (nombreB === 'VACANTE') return -1;
              
              return nombreA.localeCompare(nombreB);
            });
            
            setActividades(actividadesOrdenadas);
            
            // Recalcular horas efectivas con los datos actualizados
            if (tiendaData) {
              const horasEfectivas = calcularHorasEfectivasDiarias(
                actividadesOrdenadas,
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
          }
        } catch (reloadError) {
          console.error('Error al recargar actividades después de asignar a todo el día:', reloadError);
          // Continuar con la actualización local como fallback
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
        }
      } else {
        // Actualizar el estado local como fallback si hay errores o no podemos recargar
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
      }
      
      if (allSuccess) {
        mostrarNotificacion('Horarios actualizados correctamente', 'success');
      } else if (errores > 3) {
        mostrarNotificacion(`Se detuvieron las actualizaciones después de ${errores} errores`, 'error');
      } else {
        mostrarNotificacion('Error al actualizar algunos horarios', 'error');
      }
    } catch (err) {
      console.error('Error general al actualizar los horarios:', err);
      mostrarNotificacion('Error al actualizar los horarios', 'error');
    }
  };

  // Opciones para el dropdown
  const options: DropdownOption[] = [
    { value: '', label: '', color: undefined }, // Opción vacía
    ...opcionesDropdown.map(opcion => ({
      value: opcion,
      label: opcion,
      color: opcion === 'TRABAJO' ? 'green' : 
             opcion === 'VACACIONES' ? 'blue' : 
             opcion === 'LIBRE' ? 'red' : 
             opcion === 'BAJA MÉDICA' ? 'purple' : 
             opcion === 'FORMACIÓN' ? 'orange' : 
             opcion === 'LACTANCIA' ? 'pink' : undefined
    }))
  ];

  // Opciones para asignar a todo el día (incluir opción para limpiar y excluir TRABAJO)
  const optionsAsignar: DropdownOption[] = [
    { value: '', label: 'Limpiar toda la fila', color: '#F3F4F6' }, // Opción para limpiar
    ...options.filter(op => op.value !== 'TRABAJO' && op.value !== '') // Excluir TRABAJO y la opción vacía duplicada
  ];

  // Formatear fecha para el título
  const formatearFechaParaTitulo = (fecha: Date | null) => {
    if (!fecha) return '';
    
    const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
    const dia = fecha.getDate();
    const mes = fecha.toLocaleDateString('es-ES', { month: 'long' });
    
    const fechaBase = `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)} - ${dia} de ${mes}`;
    const debugHistorica = esHistorica !== null ? ` | Tienda Histórica: ${esHistorica ? 'true' : 'false'}` : '';
    
    return `${fechaBase}${debugHistorica}`;
  };

  // Manejar el cierre del modal y actualizar las horas efectivas
  const handleClose = () => {
    if (onCloseWithUpdatedHours && diaId) {
      // Usar las horas efectivas semanales actuales que ya hemos mantenido actualizadas
      // en lugar de recalcularlas
      const horasEfectivasSemanalesActualizadas = horasEfectivasSemanales;
      

      
      // Llamamos al callback con los valores actualizados
      onCloseWithUpdatedHours(diaId, horasEfectivasDiarias, horasEfectivasSemanalesActualizadas);
    }
    
    // Llamamos al callback original de cierre
    onClose();
  };

  // Si es móvil, renderizar el componente móvil
  if (isMobile) {
    return (
      <DayModalMobile 
        isOpen={isOpen}
        onClose={onClose}
        diaId={diaId}
        fecha={fecha}
        storeRecordId={storeRecordId}
        horasEfectivasSemanalesIniciales={horasEfectivasSemanalesIniciales}
        onCloseWithUpdatedHours={onCloseWithUpdatedHours}
      />
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title={formatearFechaParaTitulo(fecha)}
      size="full"
      className="max-h-[95vh] max-w-[95vw] w-full mx-auto overflow-hidden flex flex-col"
    >
      <div className="space-y-3 w-full mx-auto overflow-y-auto p-3 pt-2 flex-grow">
        {/* Indicadores de Horas */}
        <HoursIndicators 
          horasEfectivasDiarias={horasEfectivasDiarias}
          horasAprobadasSemanales={horasAprobadasSemanales}
          horasEfectivasSemanales={horasEfectivasSemanales}
        />

        {/* Tabla de Horarios */}
        <ScheduleTable 
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

        {/* Tabla de Tráfico */}
        <TrafficTable 
          key={`traffic-${diaId}-${actividades.length}`}
          datosTraficoDia={datosTraficoDia}
          isLoading={isLoading}
          error={error}
          actividades={actividades}
          storeRecordId={storeRecordId || undefined}
          fecha={fecha || undefined}
        />
      </div>
    </Modal>
  );
} 