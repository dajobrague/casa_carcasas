'use client';

import React, { useState } from 'react';
import { Select, Option } from '@/components/ui/Select';
import { getBackgroundColor, getOptionClasses } from '@/lib/utils';
import { ActividadDiariaRecord } from '@/lib/airtable';

interface OptionType {
  value: string;
  label: string;
  disabled?: boolean;
  color?: string;
}

interface ScheduleTableProps {
  actividades: ActividadDiariaRecord[];
  columnasTiempo: string[];
  options: OptionType[];
  optionsAsignar: OptionType[];
  isLoading: boolean;
  error: string | null;
  handleUpdateHorario: (actividadId: string, tiempo: string, valor: string) => Promise<void>;
  handleAsignarATodoElDia: (actividadId: string, valor: string) => Promise<void>;
}

export function ScheduleTable({
  actividades,
  columnasTiempo,
  options,
  optionsAsignar,
  isLoading,
  error,
  handleUpdateHorario,
  handleAsignarATodoElDia
}: ScheduleTableProps) {
  // Estado local para manejar las selecciones inmediatas
  const [seleccionesLocales, setSeleccionesLocales] = useState<Record<string, Record<string, string>>>({});
  const [asignacionesPendientes, setAsignacionesPendientes] = useState<Record<string, string>>({});
  // Referencia para prevenir loops de eventos de scroll
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Manejador de scroll que evita loops infinitos
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, sourceId: string, targetId: string) => {
    if (isScrolling) return;
    
    setIsScrolling(true);
    
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollTop = e.currentTarget.scrollTop;
    }
    
    // Limpiar cualquier timeout previo
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    // Desbloquear la sincronización después de un breve periodo
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 50);
  };

  // Función para manejar la asignación a todo el día
  const handleAsignacionLocal = async (actividadId: string, valor: string) => {
    if (!valor) return;

    // Actualizar estado local inmediatamente
    const nuevasSelecciones = { ...seleccionesLocales };
    if (!nuevasSelecciones[actividadId]) {
      nuevasSelecciones[actividadId] = {};
    }
    
    // Para cada columna de tiempo, actualizamos
    columnasTiempo.forEach(tiempo => {
      nuevasSelecciones[actividadId][tiempo] = valor;
    });
    
    setSeleccionesLocales(nuevasSelecciones);
    
    // Actualizar el estado de asignación pendiente
    setAsignacionesPendientes(prev => ({
      ...prev,
      [actividadId]: valor
    }));

    // Llamar a la función original que se conecta con el API
    await handleAsignarATodoElDia(actividadId, valor);
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

    // Llamar a la función original que se conecta con el API
    await handleUpdateHorario(actividadId, tiempo, valor);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-2 sm:mb-0">Horarios del Día</h3>
        <div className="flex gap-2 flex-wrap justify-start sm:justify-end">
          {options.filter(option => option.value).map(option => (
            <span key={option.value} className="flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-full shadow-sm">
              <span className={`w-3 h-3 rounded-full ${getBackgroundColor(option.value)} border border-${option.color}-200`}></span>
              <span className="text-sm font-medium text-gray-700">{option.label}</span>
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4">
          {/* Skeleton loader para la tabla de horarios */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white">
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left w-52 border-b border-gray-100">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 text-left w-28 border-b border-gray-100">
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 text-left w-28 border-b border-gray-100">
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 text-left w-28 border-b border-gray-100">
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 text-left w-32 border-b border-gray-100">
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  <th className="px-4 py-3 text-left w-64 border-b border-gray-100">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  {[...Array(8)].map((_, i) => (
                    <th key={i} className="w-56 px-3 py-3 text-center border-b border-gray-100">
                      <div className="h-6 w-16 mx-auto bg-gray-200 rounded animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_, employeeIndex) => (
                  <tr key={employeeIndex} className={employeeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="h-8 w-36 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="h-7 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="h-7 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    <td className="px-4 py-4 border-b border-gray-100">
                      <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    {[...Array(8)].map((_, hourIndex) => (
                      <td key={hourIndex} className="px-3 py-4 border-b border-gray-100 border-l border-gray-100">
                        <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : error ? (
        <div className="error-container text-center p-8 bg-red-50">
          <div className="text-red-500 text-lg mb-1">Error al cargar los datos</div>
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      ) : (
        <div className="flex" style={{ maxWidth: '100%', overflow: 'hidden' }}>
          {/* Tabla con columnas fijas (izquierda) */}
          <div className="flex-none" style={{ width: '676px' }}>
            <div 
              className="overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300" 
              style={{ 
                maxHeight: '37vh',
                height: actividades.length <= 5 ? 'auto' : '37vh'
              }}
              id="fixed-table-container"
              onScroll={(e) => handleScroll(e, "fixed-table-container", "scrollable-table-container")}
            >
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-white z-30">
                  <tr className="bg-gray-50 h-[46px]" style={{ height: '46px', minHeight: '46px' }}>
                    <th style={{ 
                      width: '210px',
                      borderRight: '2px solid #e5e7eb'
                    }} className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100 h-12">
                      <div className="flex flex-col justify-center h-full">
                        <span>Nombre</span>
                      </div>
                    </th>
                    <th style={{ 
                      width: '112px',
                      borderRight: '2px solid #e5e7eb'
                    }} className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100 h-12">
                      <div className="flex flex-col justify-center h-full">
                        <span>Horas Contrato</span>
                      </div>
                    </th>
                    <th style={{ 
                      width: '112px',
                      borderRight: '2px solid #e5e7eb'
                    }} className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100 h-12">
                      <div className="flex flex-col justify-center h-full">
                        <span>Horas +</span>
                      </div>
                    </th>
                    <th style={{ 
                      width: '112px',
                      borderRight: '2px solid #e5e7eb'
                    }} className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100 h-12">
                      <div className="flex flex-col justify-center h-full">
                        <span>Horas -</span>
                      </div>
                    </th>
                    <th style={{ 
                      width: '130px',
                      borderRight: '3px solid #d1d5db'
                    }} className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100 h-12">
                      <div className="flex flex-col justify-center h-full">
                        <span>DNI</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {actividades.map((actividad, index) => {
                    const rowBgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    return (
                      <tr key={`fixed-${actividad.id}`} className={`${rowBgColor} hover:bg-blue-50 transition-colors duration-150 h-[62px]`} style={{ height: '62px', minHeight: '62px' }}>
                        <td style={{ 
                          width: '210px',
                          borderRight: '2px solid #e5e7eb'
                        }} className="px-4 py-3 border-b border-gray-100 align-middle">
                          <div className="font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis max-w-[190px]">
                            {actividad.fields.Nombre || 'N/A'}
                          </div>
                        </td>
                        <td style={{ 
                          width: '112px',
                          borderRight: '2px solid #e5e7eb'
                        }} className="px-4 py-3 border-b border-gray-100 align-middle">
                          {actividad.fields['Horas de Contrato'] || actividad.fields['Horas Contrato'] || '-'}
                        </td>
                        <td style={{ 
                          width: '112px',
                          borderRight: '2px solid #e5e7eb'
                        }} className="px-4 py-3 border-b border-gray-100 align-middle">
                          <span className="px-2 py-1 rounded-md bg-green-50 text-green-700 text-sm font-medium">
                            {(() => {
                              // Leer directamente del campo sin cálculos
                              let horasPlus = null;
                              if (typeof actividad.fields['Horas +'] === 'number') {
                                horasPlus = actividad.fields['Horas +'];
                              } else if (typeof actividad.fields['Horas+'] === 'number') {
                                horasPlus = actividad.fields['Horas+'];
                              } else if (typeof actividad.fields['Horas Plus'] === 'number') {
                                horasPlus = actividad.fields['Horas Plus'];
                              } else {
                                // Intentar parsear como string
                                const strValue = 
                                  actividad.fields['Horas +'] || 
                                  actividad.fields['Horas+'] || 
                                  actividad.fields['Horas Plus'];
                                if (strValue) {
                                  horasPlus = parseFloat(String(strValue));
                                }
                              }
                              
                              // Mostrar el valor formateado o valor por defecto
                              return (horasPlus != null && !isNaN(horasPlus)) 
                                ? horasPlus.toFixed(1) 
                                : '0.0';
                            })()}
                          </span>
                        </td>
                        <td style={{ 
                          width: '112px',
                          borderRight: '2px solid #e5e7eb'
                        }} className="px-4 py-3 border-b border-gray-100 align-middle">
                          <span className="px-2 py-1 rounded-md bg-red-50 text-red-700 text-sm font-medium">
                            {(() => {
                              // Leer directamente del campo sin cálculos
                              let horasMinus = null;
                              if (typeof actividad.fields['Horas -'] === 'number') {
                                horasMinus = actividad.fields['Horas -'];
                              } else if (typeof actividad.fields['Horas-'] === 'number') {
                                horasMinus = actividad.fields['Horas-'];
                              } else if (typeof actividad.fields['Horas Minus'] === 'number') {
                                horasMinus = actividad.fields['Horas Minus'];
                              } else {
                                // Intentar parsear como string
                                const strValue = 
                                  actividad.fields['Horas -'] || 
                                  actividad.fields['Horas-'] || 
                                  actividad.fields['Horas Minus'];
                                if (strValue) {
                                  horasMinus = parseFloat(String(strValue));
                                }
                              }
                              
                              // Mostrar el valor formateado o valor por defecto
                              return (horasMinus != null && !isNaN(horasMinus)) 
                                ? horasMinus.toFixed(1) 
                                : '0.0';
                            })()}
                          </span>
                        </td>
                        <td style={{ 
                          width: '130px',
                          borderRight: '3px solid #d1d5db'
                        }} className="px-4 py-3 border-b border-gray-100 align-middle">
                          <div className="truncate max-w-[110px]">
                            {actividad.fields.DNI || '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla con columnas desplazables (derecha) */}
          <div className="flex-none" style={{ 
            boxShadow: '-8px 0 8px -4px rgba(0, 0, 0, 0.1)',
            maxWidth: 'calc(100% - 676px)',
            width: 'calc(100% - 676px)'
          }}>
            <div 
              className="overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300" 
              style={{ 
                maxHeight: '37vh',
                height: actividades.length <= 5 ? 'auto' : '37vh',
                msOverflowStyle: 'none',  /* IE and Edge */
                scrollbarWidth: 'none',   /* Firefox */
              }}
              id="scrollable-table-container"
              onScroll={(e) => handleScroll(e, "scrollable-table-container", "fixed-table-container")}
            >
              {/* Css para ocultar la barra de desplazamiento horizontal en Chrome/Safari/Opera */}
              <style jsx>{`
                #scrollable-table-container::-webkit-scrollbar-horizontal {
                  display: none;
                }
              `}</style>
              <table className="w-max border-collapse">
                <thead className="sticky top-0 bg-white z-30">
                  <tr className="bg-gray-50 h-[46px]" style={{ height: '46px', minHeight: '46px' }}>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100 min-w-[280px] whitespace-nowrap pl-10 h-12">
                      <div className="flex flex-col justify-center h-full">
                        <span>Asignar Día</span>
                      </div>
                    </th>
                    {columnasTiempo.map(tiempo => (
                      <th key={tiempo} className="w-56 px-3 py-3 text-center border-b border-gray-100 whitespace-nowrap h-12">
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-sm font-semibold text-gray-700">{tiempo}</span>
                          <span className="text-xs text-gray-500">hrs</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actividades.map((actividad, index) => {
                    const rowBgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    return (
                      <tr key={`scrollable-${actividad.id}`} className={`${rowBgColor} hover:bg-blue-50 transition-colors duration-150 h-[62px]`} style={{ height: '62px', minHeight: '62px' }}>
                        <td className="px-4 py-3 border-b border-gray-100 min-w-[280px] pl-10 align-middle">
                          <div className="w-full">
                            <Select
                              options={optionsAsignar}
                              value={asignacionesPendientes[actividad.id] || actividad.fields['Estado Actual'] || ''}
                              onChange={(valor) => handleAsignacionLocal(actividad.id, valor)}
                              placeholder="Seleccionar estado"
                              className="w-full h-10 text-xs"
                            />
                          </div>
                        </td>
                        
                        {columnasTiempo.map(tiempo => (
                          <td key={`${actividad.id}-${tiempo}`} className="px-3 py-3 border-b border-gray-100 border-l border-gray-100 align-middle">
                            <div className="relative min-w-[180px]">
                              <Select
                                options={options}
                                value={
                                  seleccionesLocales[actividad.id]?.[tiempo] !== undefined
                                    ? seleccionesLocales[actividad.id][tiempo]
                                    : actividad.fields[tiempo] || ''
                                }
                                onChange={(valor) => handleUpdateHorarioLocal(actividad.id, tiempo, valor)}
                                className={`h-10 text-xs ${getOptionClasses(
                                  seleccionesLocales[actividad.id]?.[tiempo] !== undefined
                                    ? seleccionesLocales[actividad.id][tiempo]
                                    : actividad.fields[tiempo]
                                )}`}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 