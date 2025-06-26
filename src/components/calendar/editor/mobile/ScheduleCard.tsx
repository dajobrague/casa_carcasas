'use client';

import React, { useState } from 'react';
import { Select, Option } from '@/components/ui/Select';
import { getBackgroundColor, calcularHorasPlusEmpleado, extraerValorNumerico } from '@/lib/utils';
import { ActividadDiariaRecord } from '@/lib/airtable';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Tipo para las opciones del dropdown
interface DropdownOption {
  value: string;
  label: string;
  color?: string;
}

interface ScheduleCardProps {
  actividades: ActividadDiariaRecord[];
  columnasTiempo: string[];
  options: DropdownOption[];
  optionsAsignar: DropdownOption[];
  isLoading: boolean;
  error: string | null;
  handleUpdateHorario: (actividadId: string, tiempo: string, valor: string) => Promise<void>;
  handleAsignarATodoElDia: (actividadId: string, valor: string) => Promise<void>;
  tiendaData?: { PAIS?: string; Apertura?: string; Cierre?: string };
}

export function ScheduleCard({
  actividades,
  columnasTiempo,
  options,
  optionsAsignar,
  isLoading,
  error,
  handleUpdateHorario,
  handleAsignarATodoElDia,
  tiendaData
}: ScheduleCardProps) {
  // Estado local para manejar las selecciones inmediatas
  const [seleccionesLocales, setSeleccionesLocales] = useState<Record<string, Record<string, string>>>({});
  const [asignacionesPendientes, setAsignacionesPendientes] = useState<Record<string, string>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [isLeyendaExpanded, setIsLeyendaExpanded] = useState(false); // Para controlar la leyenda

  // Manejar expansión/contracción de tarjetas
  const toggleCardExpansion = (actividadId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [actividadId]: !prev[actividadId]
    }));
  };

  // Función para manejar la asignación a todo el día
  const handleAsignacionLocal = async (actividadId: string, valor: string) => {
    // Permitir valores vacíos para limpiar toda la fila
    console.log(`🧹 LIMPIEZA MASIVA MÓVIL: Empleado ${actividadId}, Valor: "${valor}"`);

    // Actualizar estado local inmediatamente
    const nuevasSelecciones = { ...seleccionesLocales };
    if (!nuevasSelecciones[actividadId]) {
      nuevasSelecciones[actividadId] = {};
    }
    columnasTiempo.forEach(tiempo => {
      nuevasSelecciones[actividadId][tiempo] = valor;
    });
    setSeleccionesLocales(nuevasSelecciones);
    
    // Actualizar el estado de asignación pendiente
    setAsignacionesPendientes(prev => {
      const updated = { ...prev };
      if (valor === '') {
        // Si es limpieza masiva, remover de pendientes
        delete updated[actividadId];
      } else {
        updated[actividadId] = valor;
      }
      return updated;
    });

    console.log(`📊 Estado local móvil actualizado para ${actividadId}:`, nuevasSelecciones[actividadId]);

    // Llamar a la función original
    await handleAsignarATodoElDia(actividadId, valor);
    
    // Forzar un re-render después de la limpieza para asegurar que los cálculos se actualicen
    if (valor === '') {
      console.log(`🔄 Forzando re-render móvil después de limpieza masiva para ${actividadId}`);
    }
  };

  // Función para manejar la actualización de horario individual
  const handleUpdateHorarioLocal = async (actividadId: string, tiempo: string, valor: string) => {
    // Actualizar estado local inmediatamente
    const nuevasSelecciones = { ...seleccionesLocales };
    if (!nuevasSelecciones[actividadId]) {
      nuevasSelecciones[actividadId] = {};
    }
    nuevasSelecciones[actividadId][tiempo] = valor;
    setSeleccionesLocales(nuevasSelecciones);

    // Llamar a la función original
    await handleUpdateHorario(actividadId, tiempo, valor);
  };

  // Componente del esqueleto de carga
  const SkeletonLoader = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(index => (
        <div key={index} className="bg-white rounded-lg shadow-sm p-3 animate-pulse">
          <div className="flex justify-between items-center mb-3">
            <div className="h-5 w-32 bg-gray-200 rounded"></div>
            <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-10 w-full bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );

  // Mensaje de error
  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg shadow-sm">
        <div className="text-red-500 text-lg mb-1">Error al cargar los datos</div>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  // Pantalla de carga
  if (isLoading) {
    return <SkeletonLoader />;
  }

  // Verificar que las opciones tengan el formato correcto
  console.log('Options format check:', {
    options: options.slice(0, 3), // Mostrar primeras 3 opciones para debug
    optionsAsignar: optionsAsignar.slice(0, 3)
  });

  return (
    <div className="space-y-3">
      {/* Leyenda de opciones - Versión compacta para móvil */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div 
          className="flex items-center justify-between p-2 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation(); // Evitar que el clic se propague
            setIsLeyendaExpanded(!isLeyendaExpanded);
          }}
        >
          <div className="flex items-center">
            <span className="text-xs font-medium text-gray-800">Estados disponibles</span>
            <span className="ml-2 inline-flex items-center justify-center bg-gray-100 text-gray-600 text-xs font-bold rounded-full h-4 min-w-[1rem] px-1">
              {options.filter(option => option.value).length}
            </span>
          </div>
          <div className="bg-gray-50 p-1 rounded-full">
            {isLeyendaExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            )}
          </div>
        </div>
        
        {isLeyendaExpanded && (
          <div className="p-2 bg-gray-50 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {options.filter(option => option.value).map(option => (
                <span key={option.value} className="flex items-center text-xs">
                  <span 
                    className="w-2 h-2 rounded-full mr-1 flex-shrink-0"
                    style={{ backgroundColor: option.color || '#D1D5DB' }}
                  ></span>
                  <span className="truncate text-gray-800">{option.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas de actividades */}
      {actividades.map(actividad => {
        const isExpanded = !!expandedCards[actividad.id];
        
        return (
          <div key={actividad.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Cabecera de la tarjeta */}
            <div 
              className="p-3 border-b border-gray-100 flex justify-between items-center cursor-pointer bg-gray-50"
              onClick={(e) => {
                e.stopPropagation(); // Evitar que el clic se propague hacia arriba
                toggleCardExpansion(actividad.id);
              }}
            >
              <div>
                <div className="font-medium text-gray-800">
                  {actividad.fields.Nombre || 'N/A'}
                </div>
                <div className="text-xs text-gray-500">
                  DNI: {actividad.fields.DNI || '-'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {(() => {
                    // Leer H+ y H- directamente de Airtable
                    const horasPlus = extraerValorNumerico(actividad.fields['Horas +']);
                    const horasMinus = extraerValorNumerico(actividad.fields['Horas -']);
                    
                    return (
                      <>
                        {horasPlus > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                            +{horasPlus.toFixed(1)}h
                          </span>
                        )}
                        {horasMinus > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-xs font-medium">
                            -{horasMinus.toFixed(1)}h
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div 
                  className="bg-white rounded-full p-1.5 border border-gray-200 z-10"
                  onClick={(e) => {
                    e.stopPropagation(); // Evitar que el clic se propague
                    toggleCardExpansion(actividad.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Contenido expandible */}
            {isExpanded && (
              <div className="p-3">
                {/* Asignar a todo el día - Rediseñado para mejorar UX */}
                <div className="mb-5 p-3 bg-blue-50 rounded-lg border border-blue-100 relative z-10">
                  <div className="flex items-center mb-2">
                    <div className="bg-blue-100 rounded-full p-1 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-blue-800">Asignar a todo el día</span>
                  </div>
                  <p className="text-xs text-blue-700 mb-2">
                    Selecciona un estado para aplicarlo a <span className="font-bold">todas las horas</span> de forma simultánea.
                  </p>
                  <Select
                    options={[
                      { value: '', label: 'Seleccionar un estado...', color: '#E5E7EB' },
                      ...optionsAsignar
                    ]}
                    value={asignacionesPendientes[actividad.id] || ''}
                    onChange={(valor) => {
                      handleAsignacionLocal(actividad.id, valor);
                    }}
                    className="w-full shadow-sm text-sm h-10 font-medium bg-white border-blue-200"
                  />
                </div>
                
                {/* Título de horarios por hora */}
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 mr-1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Horarios por hora</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Configura el estado para cada franja horaria de forma individual.
                </p>
                
                {/* Horarios por hora */}
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {columnasTiempo.map(tiempo => (
                    <div key={`${actividad.id}-${tiempo}`} className="flex items-center bg-gray-50 rounded-md p-1.5">
                      <div className="w-14 text-xs font-medium text-gray-700 pl-1">{tiempo}</div>
                      <div className="flex-1">
                        <Select
                          options={options}
                          value={
                            seleccionesLocales[actividad.id]?.[tiempo] !== undefined
                              ? seleccionesLocales[actividad.id][tiempo]
                              : actividad.fields[tiempo] || ''
                          }
                          onChange={(valor) => {
                            handleUpdateHorarioLocal(actividad.id, tiempo, valor);
                          }}
                          className="w-full shadow-sm text-sm h-9 text-gray-800 font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
} 