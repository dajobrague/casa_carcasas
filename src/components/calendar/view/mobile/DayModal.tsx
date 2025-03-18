'use client';

import React, { useState, useEffect } from 'react';
import { Option } from '@/components/ui/Select';
import { 
  obtenerActividadesDiarias, 
  obtenerDatosTienda, 
  ActividadDiariaRecord,
  TiendaSupervisorRecord,
  opcionesDropdown
} from '@/lib/airtable';
import { 
  generarColumnasTiempo, 
  calcularHorasEfectivasDiarias,
  getBackgroundColor,
  DatosTraficoDia,
  calcularPersonalEstimado,
  generarDatosTraficoEjemplo
} from '@/lib/utils';
import { obtenerDatosTrafico } from '@/lib/api';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { HoursIndicatorsView } from './HoursIndicators';
import { ScheduleCardView } from './ScheduleCard';
import { TrafficTableView } from './TrafficTable';

interface DayViewProps {
  isOpen: boolean;
  onClose: () => void;
  diaId: string | null;
  fecha: Date | null;
  storeRecordId: string | null;
  horasEfectivasSemanalesIniciales: number;
}

export function DayViewMobile({ 
  isOpen, 
  onClose, 
  diaId,
  fecha,
  storeRecordId,
  horasEfectivasSemanalesIniciales
}: DayViewProps) {
  // Estados del modal
  const [expandedSections, setExpandedSections] = useState({
    hours: true,
    schedule: true,
    traffic: false,
  });
  
  // Estados para datos
  const [actividades, setActividades] = useState<ActividadDiariaRecord[]>([]);
  const [tiendaData, setTiendaData] = useState<TiendaSupervisorRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnasTiempo, setColumnasTiempo] = useState<string[]>([]);
  const [horasEfectivasDiarias, setHorasEfectivasDiarias] = useState(0);
  const [horasEfectivasSemanales, setHorasEfectivasSemanales] = useState(horasEfectivasSemanalesIniciales || 0);
  const [horasAprobadasSemanales, setHorasAprobadasSemanales] = useState(0);
  
  // Estados para datos de tráfico con lazy loading
  const [datosTraficoDia, setDatosTraficoDia] = useState<DatosTraficoDia | null>(null);
  const [traficoLoading, setTraficoLoading] = useState(false);
  const [traficoError, setTraficoError] = useState<string | null>(null);
  const [traficoYaCargado, setTraficoYaCargado] = useState(false);

  // Función para formatear la fecha
  const formatearFecha = (fecha: Date | null): string => {
    if (!fecha) return 'Día seleccionado';
    return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  // Función para cambiar el estado de expansión de las secciones
  const toggleSection = (section: keyof typeof expandedSections, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    const nuevoEstado = !expandedSections[section];
    
    setExpandedSections(prev => ({
      ...prev,
      [section]: nuevoEstado
    }));
    
    // Si se está expandiendo la sección de tráfico y aún no se han cargado los datos
    if (section === 'traffic' && nuevoEstado && !traficoYaCargado) {
      cargarDatosTrafico();
    }
  };

  // Función para cargar datos de tráfico (separada para lazy loading)
  const cargarDatosTrafico = async () => {
    if (!diaId || !storeRecordId || !columnasTiempo.length) return;
    
    setTraficoLoading(true);
    setTraficoError(null);
    
    try {
      console.log('Cargando datos de tráfico para el día:', diaId);
      const datosTraficoDiaAPI = await obtenerDatosTrafico(
        diaId as string, 
        storeRecordId as string
      );
      const datosTraficoDiaFinal = datosTraficoDiaAPI || generarDatosTraficoEjemplo(columnasTiempo);
      setDatosTraficoDia(datosTraficoDiaFinal);
    } catch (error) {
      console.error('Error al cargar datos de tráfico:', error);
      setDatosTraficoDia(generarDatosTraficoEjemplo(columnasTiempo));
      setTraficoError('No se pudieron cargar los datos de tráfico reales. Mostrando datos simulados.');
    } finally {
      setTraficoLoading(false);
      setTraficoYaCargado(true);
    }
  };
  
  // Efecto para cargar datos
  useEffect(() => {
    if (isOpen && diaId && storeRecordId) {
      async function cargarDatos() {
        setIsLoading(true);
        setError(null);
        
        try {
          // Cargar datos de tienda
          const datosTienda = await obtenerDatosTienda(storeRecordId as string);
          setTiendaData(datosTienda);
          
          // Cargar actividades diarias y ordenarlas
          const actividadesDiarias = await obtenerActividadesDiarias(storeRecordId as string, diaId as string);
          // Ordenar actividades por nombre (con VACANTE al final)
          const actividadesOrdenadas = [...actividadesDiarias].sort((a, b) => {
            const nombreA = (a.fields.Nombre || a.fields.Name || '').toString().toUpperCase();
            const nombreB = (b.fields.Nombre || b.fields.Name || '').toString().toUpperCase();
            
            if (nombreA === 'VACANTE') return 1;
            if (nombreB === 'VACANTE') return -1;
            
            return nombreA.localeCompare(nombreB);
          });
          setActividades(actividadesOrdenadas);
          
          // Inicializar HE semanales con el valor proporcionado
          setHorasEfectivasSemanales(horasEfectivasSemanalesIniciales || 0);
          
          // Generar columnas de tiempo
          let columnas: string[] = [];
          if (datosTienda?.fields.PAIS && datosTienda.fields.Apertura && datosTienda.fields.Cierre) {
            columnas = generarColumnasTiempo(
              datosTienda.fields.PAIS,
              datosTienda.fields.Apertura,
              datosTienda.fields.Cierre
            );
            setColumnasTiempo(columnas);
          }
          
          // Calcular horas efectivas diarias
          const horasEfectivas = calcularHorasEfectivasDiarias(
            actividadesOrdenadas,
            {
              PAIS: datosTienda?.fields.PAIS || '',
              Apertura: datosTienda?.fields.Apertura || '',
              Cierre: datosTienda?.fields.Cierre || ''
            }
          );
          setHorasEfectivasDiarias(horasEfectivas);
          
          // Establecer horas aprobadas semanales
          if (datosTienda?.fields['Horas Aprobadas']) {
            setHorasAprobadasSemanales(datosTienda.fields['Horas Aprobadas']);
          }
          
        } catch (err) {
          console.error('Error al cargar datos:', err);
          setError('Error al cargar los datos. Por favor, inténtelo de nuevo.');
        } finally {
          setIsLoading(false);
        }
      }
      
      cargarDatos();
    }
  }, [isOpen, diaId, storeRecordId, horasEfectivasSemanalesIniciales]);

  // Función personalizada para cerrar el modal
  const handleClose = () => {
    onClose();
  };

  // Opciones para los dropdowns con formato correcto
  const options: Option[] = [
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
             '#9CA3AF' // gris por defecto
    }))
  ];
  
  // Opciones para asignar (todo excepto vacío)
  const optionsAsignar: Option[] = options.filter(opt => opt.value !== '');

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
            {fecha ? fecha.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long'
            }) : 'Día seleccionado'}
          </h2>
        </div>
      </div>
      
      {/* Contenido con scroll */}
      <div className="overflow-auto flex-grow p-3 space-y-3">
        {isLoading ? (
          // Esqueleto de carga
          <div className="animate-pulse space-y-3">
            <div className="h-28 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-40 bg-gray-200 rounded-lg"></div>
          </div>
        ) : error ? (
          // Mensaje de error
          <div className="bg-red-50 text-red-500 p-4 rounded-lg text-center">
            <p className="font-medium">Error al cargar los datos</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : (
          // Contenido principal
          <>
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
                  <HoursIndicatorsView
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
                <div className="px-3 pb-3">
                  {/* ScheduleCard es el componente que muestra las actividades asignadas */}
                  <ScheduleCardView
                    actividades={actividades}
                    columnasTiempo={columnasTiempo}
                    options={options}
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
                <div className="flex items-center">
                  {!traficoYaCargado && !expandedSections.traffic && (
                    <span className="text-xs text-gray-500 mr-2 italic">Toque para cargar</span>
                  )}
                  {expandedSections.traffic ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              
              {expandedSections.traffic && (
                <div className="p-3">
                  {traficoLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      <p className="text-sm text-gray-500">Cargando datos de tráfico...</p>
                    </div>
                  ) : (
                    /* TrafficTable es el componente que muestra los datos de tráfico */
                    <TrafficTableView
                      datosTraficoDia={datosTraficoDia}
                      isLoading={traficoLoading}
                      error={traficoError}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 