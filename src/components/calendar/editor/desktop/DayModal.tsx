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
import { 
  obtenerTraficoHistorico, 
  obtenerTraficoNoHistorico, 
  obtenerDiaSemana 
} from '@/lib/historical-traffic';
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
  const [isLoading, setIsLoading] = useState(false); // Modal se abre inmediatamente
  const [error, setError] = useState<string | null>(null);
  const [horasEfectivasDiarias, setHorasEfectivasDiarias] = useState(0);
  const [horasEfectivasDiariasIniciales, setHorasEfectivasDiariasIniciales] = useState(0);
  const [horasAprobadasSemanales, setHorasAprobadasSemanales] = useState(0);
  const [horasEfectivasSemanales, setHorasEfectivasSemanales] = useState(0);
  const [columnasTiempo, setColumnasTiempo] = useState<string[]>([]);
  const [datosTraficoDia, setDatosTraficoDia] = useState<DatosTraficoDia | null>(null);
  const [personalEstimado, setPersonalEstimado] = useState<number[]>([]);
  const [datosYaCargados, setDatosYaCargados] = useState(false);
  const [cargandoTrafico, setCargandoTrafico] = useState(false);

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
    if (isOpen && diaId && storeRecordId && !datosYaCargados) {
      // El modal se abre inmediatamente, datos se cargan en paralelo
      cargarDatosDelDia();
    }
  }, [isOpen, diaId, storeRecordId, datosYaCargados]);

  // Función para cargar datos del día
  const cargarDatosDelDia = async () => {
    if (!diaId || !storeRecordId) {
      setError('No se proporcionó ID del día o de la tienda');
      setIsLoading(false);
      return;
    }

    try {
      // NO cambiar setIsLoading(true) aquí - el modal ya debe estar visible
      // setIsLoading(true);
      setError(null);

      // CARGAR TODOS LOS DATOS EN PARALELO PARA MÁXIMA VELOCIDAD
      console.log(`🚀 Iniciando carga totalmente paralela de datos...`);
      const parallelStartTime = Date.now();
      
      const [tiendaResponse, actividadesResponse, diaResponse] = await Promise.all([
        obtenerDatosTienda(storeRecordId),
        obtenerActividadesDiarias(storeRecordId, diaId),
        fetch(`/api/airtable?action=obtenerDiaLaboralPorId&diaId=${diaId}`).then(res => res.json())
      ]);
      
      console.log(`⚡ TODOS los datos base obtenidos en ${Date.now() - parallelStartTime}ms`);
      
      if (!tiendaResponse) {
        throw new Error('No se pudo obtener información de la tienda');
      }
      setTiendaData(tiendaResponse);
      const tiendaData = tiendaResponse.fields;

      if (!actividadesResponse) {
        throw new Error('No se pudieron obtener las actividades diarias');
      }
      
      if (!diaResponse) {
        throw new Error('No se pudo obtener información del día laboral');
      }
      
      // Obtener fecha del día desde la respuesta o usar la prop como fallback
      const fechaFromDiaResponse = diaResponse.fields?.Fecha;
      let fechaDelDia = fechaFromDiaResponse ? new Date(fechaFromDiaResponse) : null;
      
      // Fallback: usar la fecha prop si no se pudo obtener de la respuesta
      if (!fechaDelDia && fecha) {
        console.log(`⚠️ FALLBACK: Usando fecha prop como respaldo`);
        fechaDelDia = fecha;
      }
      
      console.log(`🔍 DEBUG - Respuesta del día:`, {
        diaResponseFields: diaResponse.fields,
        fechaFromDiaResponse,
        fechaProp: fecha,
        fechaDelDiaFinal: fechaDelDia,
        fechaDelDiaString: fechaDelDia ? fechaDelDia.toISOString().split('T')[0] : 'null'
      });
      
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

      // OBTENER DATOS DE TRÁFICO CON LÓGICA HISTÓRICA ACTUALIZADA
      let datosTraficoDiaFinal: DatosTraficoDia | null = null;
      
      console.log(`🔍 Estado de tienda histórica:`, {
        esHistorica,
        tiendaId: storeRecordId,
        diaId,
        fecha: fechaDelDia ? fechaDelDia.toISOString().split('T')[0] : 'null',
        tiendaData: tiendaResponse?.fields ? {
          Name: tiendaResponse.fields.Name,
          'Tienda Histórica?': tiendaResponse.fields['Tienda Histórica?'],
          'Semanas Históricas': tiendaResponse.fields['Semanas Históricas']
        } : 'null'
      });
      
      console.log(`🔍 DECISIÓN: ¿Usar lógica histórica?`, {
        esHistorica,
        tieneFecha: !!fechaDelDia,
        condicion: esHistorica && fechaDelDia,
        siguientePaso: esHistorica && fechaDelDia ? 'HISTÓRICA' : 'ESTÁNDAR'
      });
      
      // Verificación adicional: si la tienda no está marcada como histórica pero tiene configuración JSON
      let esHistoricaReal = esHistorica;
      if (!esHistorica && tiendaResponse?.fields['Semanas Históricas']) {
        console.log(`⚠️ OVERRIDE: Tienda ${storeRecordId} no está marcada como histórica pero tiene configuración de semanas históricas`);
        console.log(`📋 Configuración encontrada:`, tiendaResponse.fields['Semanas Históricas']);
        console.log(`🔧 FORZANDO esHistorica = true para usar configuración JSON`);
        esHistoricaReal = true;
      }
      
      try {
        // Mostrar estado de carga para datos históricos
        const startTime = Date.now();
        if (esHistoricaReal && fechaDelDia) {
          console.log(`⏳ Iniciando carga de datos históricos...`);
        }
        
        // Si es una tienda histórica, usar la lógica histórica con formato JSON
        if (esHistoricaReal && fechaDelDia) {
          setCargandoTrafico(true);
          const fechaStr = fechaDelDia.toISOString().split('T')[0];
          const { obtenerFormatoSemana } = await import('@/lib/airtable');
          const semanaObjetivo = obtenerFormatoSemana(fechaDelDia);
          
          console.log(`🏛️ Tienda histórica detectada, procesando semana: ${semanaObjetivo}`);
                    console.log(`📅 Detalles - Fecha: ${fechaStr}, Día de semana: ${fechaDelDia.toLocaleDateString('es-ES', { weekday: 'long' })}`);          
          
          // Usar la función actualizada con lógica histórica JSON
          const { obtenerDatosTraficoConLogicaHistorica } = await import('@/lib/api');
          console.log(`🔄 Llamando a obtenerDatosTraficoConLogicaHistorica con:`, {
            diaId,
            storeRecordId,
            esHistorica: true,
            fechaStr,
            semanaObjetivo
          });
          
          const resultado = await obtenerDatosTraficoConLogicaHistorica(
            diaId,
            storeRecordId,
            true, // esHistorica
            fechaStr,
            semanaObjetivo
          );
          
          // Convertir TraficoHistoricoAggregado a DatosTraficoDia si es necesario
          if (resultado && 'esDatoHistorico' in resultado && resultado.esDatoHistorico) {
            // Es TraficoHistoricoAggregado, convertir a DatosTraficoDia
            const historicoData = resultado as import('@/lib/historical-traffic').TraficoHistoricoAggregado;
            
            // Convertir la estructura de datosPorDia para que sea compatible
            const datosPorDiaConvertidos = {
              lunes: historicoData.datosPorDia['lunes'] || {},
              martes: historicoData.datosPorDia['martes'] || {},
              miercoles: historicoData.datosPorDia['miercoles'] || {},
              jueves: historicoData.datosPorDia['jueves'] || {},
              viernes: historicoData.datosPorDia['viernes'] || {},
              sabado: historicoData.datosPorDia['sabado'] || {},
              domingo: historicoData.datosPorDia['domingo'] || {}
            };
            
            datosTraficoDiaFinal = {
              horas: historicoData.horas,
              totalMañana: historicoData.totalMañana,
              totalTarde: historicoData.totalTarde,
              datosPorDia: datosPorDiaConvertidos,
              fechaInicio: historicoData.fechaInicio,
              fechaFin: historicoData.fechaFin,
              esDatoHistorico: true,
              semanasReferencia: historicoData.semanasReferencia.join(', ')
            };
            
            console.log(`✅ Datos históricos obtenidos para semana ${semanaObjetivo} en ${Date.now() - startTime}ms:`, {
              semanasReferencia: historicoData.semanasReferencia,
              fechaInicio: historicoData.fechaInicio,
              fechaFin: historicoData.fechaFin
            });
          } else if (resultado) {
            // Es DatosTraficoDia normal, asegurarse de que es el tipo correcto
            datosTraficoDiaFinal = resultado as DatosTraficoDia;
            console.log(`📊 Datos estándar obtenidos para semana ${semanaObjetivo}`);
          } else {
            console.log(`📊 No se encontró configuración histórica específica para semana ${semanaObjetivo}`);
            datosTraficoDiaFinal = null;
          }
        }
        
        // Si no se obtuvieron datos históricos, usar la lógica normal
        if (!datosTraficoDiaFinal) {
          console.log('📊 Usando lógica estándar de tráfico');
      const datosTraficoDiaAPI = await obtenerDatosTrafico(diaId, storeRecordId);
          datosTraficoDiaFinal = datosTraficoDiaAPI || generarDatosTraficoEjemplo(columnas);
        }
        
      } catch (error) {
        console.error('Error al procesar datos de tráfico:', error);
        datosTraficoDiaFinal = generarDatosTraficoEjemplo(columnas);
      }
      
      setDatosTraficoDia(datosTraficoDiaFinal);
      setCargandoTrafico(false);
      
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

      // Marcar datos como cargados exitosamente
      setDatosYaCargados(true);

    } catch (error) {
      console.error('Error al cargar datos del día:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setDatosYaCargados(false); // Permitir reintento en caso de error
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
    
    if (!columnasTiempo || columnasTiempo.length === 0) {
      mostrarNotificacion('No hay columnas de tiempo definidas', 'error');
      return;
    }
    
    try {
      // 🚀 OPTIMIZACIÓN: Actualizar UI inmediatamente para feedback instantáneo
      
      // Actualizar estado local inmediatamente
      const actividadesActualizadasLocal = actividades.map(actividad => {
        if (actividad.id === actividadId) {
          const updatedFields = { ...actividad.fields };
          columnasTiempo.forEach(tiempo => {
            updatedFields[tiempo] = valor;
          });
          return { ...actividad, fields: updatedFields };
        }
        return actividad;
      });
      
      // Actualizar las actividades inmediatamente
      setActividades(actividadesActualizadasLocal);
      
      // Recalcular horas efectivas inmediatamente con los datos locales
      if (tiendaData) {
        const horasEfectivasInmediatas = calcularHorasEfectivasDiarias(
          actividadesActualizadasLocal,
          {
            PAIS: tiendaData.fields.PAIS,
            Apertura: tiendaData.fields.Apertura,
            Cierre: tiendaData.fields.Cierre
          }
        );
        
        // Log solo en desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log('⚡ Horas efectivas actualizadas:', horasEfectivasInmediatas);
        }
        
        // Actualizar las horas efectivas diarias inmediatamente
        setHorasEfectivasDiarias(horasEfectivasInmediatas);
        
        // Actualizar las horas efectivas semanales inmediatamente
        const diferenciaDiariaInmediata = horasEfectivasInmediatas - horasEfectivasDiariasIniciales;
        
        setHorasEfectivasSemanales(prev => {
          const baseValue = horasEfectivasSemanalesIniciales > 0 ? horasEfectivasSemanalesIniciales : prev;
          const nuevoValor = Math.max(0, baseValue + diferenciaDiariaInmediata);
          
          // Log solo en desarrollo
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚡ Horas semanales: ${baseValue} + ${diferenciaDiariaInmediata} = ${nuevoValor}`);
          }
          
          return nuevoValor;
        });
      }
      
      // 🔄 Hacer las actualizaciones API en background (sin bloquear UI)
      
      // Crear todas las promesas de actualización
      const updatePromises = columnasTiempo.map(tiempo => 
        actualizarHorario(actividadId, tiempo, valor).catch(error => {
          console.error(`Error al actualizar horario para ${tiempo}:`, error);
          return false;
        })
      );
      
      // Ejecutar todas las actualizaciones en paralelo (no secuencial)
      Promise.all(updatePromises).then(results => {
        const errores = results.filter(result => !result).length;
        const allSuccess = errores === 0;
        
        if (allSuccess) {
          mostrarNotificacion('Horarios actualizados correctamente', 'success');
        } else if (errores > 3) {
          mostrarNotificacion(`Se completaron las actualizaciones con ${errores} errores`, 'error');
        } else {
          mostrarNotificacion('Error al actualizar algunos horarios', 'error');
        }
        
        // Opcional: Recargar datos desde servidor para confirmar sincronización
        // (pero no bloquear la UI para esto)
      if (allSuccess && diaId && storeRecordId) {
          obtenerActividadesDiarias(storeRecordId, diaId).then(actividadesServidor => {
            if (actividadesServidor) {
              // Solo actualizar si hay diferencias significativas
              const actividadesOrdenadas = [...actividadesServidor].sort((a, b) => {
              const nombreA = (a.fields.Nombre || '').toString().toUpperCase();
              const nombreB = (b.fields.Nombre || '').toString().toUpperCase();
              
              if (nombreA === 'VACANTE') return 1;
              if (nombreB === 'VACANTE') return -1;
              
              return nombreA.localeCompare(nombreB);
            });
            
              // Solo actualizar si realmente cambió algo (sincronización final)
              const hayDiferencias = JSON.stringify(actividades) !== JSON.stringify(actividadesOrdenadas);
              if (hayDiferencias) {
            setActividades(actividadesOrdenadas);
              }
            }
          }).catch(error => {
            console.error('Error al sincronizar con servidor:', error);
          });
        }
      });
      
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
    
    // Limpiar estado para evitar conflictos en próximas aperturas
    setDatosYaCargados(false);
    
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
          isLoading={cargandoTrafico}
          error={error}
          actividades={actividades}
          storeRecordId={storeRecordId || undefined}
          fecha={fecha || undefined}
        />
        
        {/* Debug temporal - solo durante desarrollo */}
        {datosTraficoDia && process.env.NODE_ENV === 'development' && (() => {
          console.log('📊 TrafficTable datos:', {
            hasHoras: !!datosTraficoDia.horas,
            hasDatosPorDia: !!datosTraficoDia.datosPorDia,
            fechas: `${datosTraficoDia.fechaInicio} - ${datosTraficoDia.fechaFin}`
          });
          return null;
        })()}
      </div>
    </Modal>
  );
} 