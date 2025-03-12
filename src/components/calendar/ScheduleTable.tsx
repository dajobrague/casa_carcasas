'use client';

import React, { useState } from 'react';
import { Select, Option } from '@/components/ui/Select';
import { getBackgroundColor } from '@/lib/utils';
import { ActividadDiariaRecord } from '@/lib/airtable';

interface ScheduleTableProps {
  actividades: ActividadDiariaRecord[];
  columnasTiempo: string[];
  options: Option[];
  optionsAsignar: Option[];
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

  // Función para manejar la asignación a todo el día
  const handleAsignacionLocal = async (actividadId: string, valor: string) => {
    if (!valor) return;

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
    setAsignacionesPendientes(prev => ({
      ...prev,
      [actividadId]: valor
    }));

    // Llamar a la función original
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

    // Llamar a la función original
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
        <div className="text-center p-8 bg-red-50">
          <div className="text-red-500 text-lg mb-1">Error al cargar los datos</div>
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      ) : (
        <div className="overflow-x-auto" style={{ maxHeight: '37vh' }}>
          <table className="min-w-full">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-52 border-b border-gray-100">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-28 border-b border-gray-100">Hrs Contrato</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-28 border-b border-gray-100">Hrs +</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-28 border-b border-gray-100">Hrs -</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-32 border-b border-gray-100">DNI</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-64 border-b border-gray-100">Asignar Día</th>
                {columnasTiempo.map(tiempo => (
                  <th key={tiempo} className="w-56 px-3 py-3 text-center border-b border-gray-100">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-semibold text-gray-700">{tiempo}</span>
                      <span className="text-xs text-gray-500">hrs</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {actividades.map((actividad, index) => (
                <tr key={actividad.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <div className="font-medium text-gray-800 truncate">
                      {actividad.fields.Nombre || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100">{actividad.fields['Horas Contrato'] || '-'}</td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <span className="px-2 py-1 rounded-md bg-green-50 text-green-700 text-sm font-medium">
                      {typeof actividad.fields['Horas +'] === 'number' 
                        ? actividad.fields['Horas +'].toFixed(1) 
                        : '0.0'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <span className="px-2 py-1 rounded-md bg-red-50 text-red-700 text-sm font-medium">
                      {typeof actividad.fields['Horas -'] === 'number' 
                        ? actividad.fields['Horas -'].toFixed(1) 
                        : '0.0'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-gray-600">{actividad.fields.DNI || '-'}</td>
                  <td className="px-4 py-4 border-b border-gray-100">
                    <Select
                      options={[
                        { value: '', label: 'Asignar todo' },
                        ...options.filter(opt => opt.value !== '')
                      ]}
                      value={asignacionesPendientes[actividad.id] || ''}
                      onChange={(e) => handleAsignacionLocal(actividad.id, e.target.value)}
                      fullWidth
                      className="shadow-sm text-base h-10 min-w-[200px]"
                    />
                  </td>
                  {columnasTiempo.map(tiempo => (
                    <td key={`${actividad.id}-${tiempo}`} className="px-3 py-4 border-b border-gray-100 border-l border-gray-100">
                      <Select
                        options={options}
                        value={
                          seleccionesLocales[actividad.id]?.[tiempo] !== undefined
                            ? seleccionesLocales[actividad.id][tiempo]
                            : actividad.fields[tiempo] || ''
                        }
                        onChange={(e) => handleUpdateHorarioLocal(actividad.id, tiempo, e.target.value)}
                        estado={
                          seleccionesLocales[actividad.id]?.[tiempo] !== undefined
                            ? seleccionesLocales[actividad.id][tiempo]
                            : actividad.fields[tiempo]
                        }
                        fullWidth
                        className="shadow-sm text-base h-10 min-w-[180px]"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 