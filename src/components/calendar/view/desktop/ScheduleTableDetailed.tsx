'use client';

import React, { useMemo } from 'react';
import { Option } from '@/components/ui/Select';
import { getBackgroundColor } from '@/lib/utils';
import { ActividadDiariaRecord } from '@/lib/airtable';
import { 
  Briefcase, 
  Plane, 
  Home, 
  Stethoscope, 
  GraduationCap, 
  Baby, 
  HelpCircle 
} from 'lucide-react';

interface ScheduleTableDetailedViewProps {
  actividades: ActividadDiariaRecord[];
  columnasTiempo: string[];
  options: Option[];
  isLoading?: boolean;
  error?: string | null;
}

// Función para renderizar el icono apropiado según el valor (fuera del componente para evitar recrearla)
const renderIcon = (valor: string) => {
  switch(valor) {
    case 'TRABAJO':
      return <Briefcase className="w-4 h-4 mx-auto text-green-700" />;
    case 'VACACIONES':
      return <Plane className="w-4 h-4 mx-auto text-blue-700" />;
    case 'LIBRE':
      return <Home className="w-4 h-4 mx-auto text-red-700" />;
    case 'BAJA MÉDICA':
      return <Stethoscope className="w-4 h-4 mx-auto text-purple-700" />;
    case 'FORMACIÓN':
      return <GraduationCap className="w-4 h-4 mx-auto text-orange-700" />;
    case 'LACTANCIA':
      return <Baby className="w-4 h-4 mx-auto text-pink-700" />;
    default:
      // Si no hay valor (está vacío), considerarlo como LIBRE
      return valor ? <span className="text-xs">{valor}</span> : <Home className="w-4 h-4 mx-auto text-red-700" />;
  }
};

// Exportar el componente directamente sin usar React.memo
export function ScheduleTableDetailedView({
  actividades,
  columnasTiempo,
  options,
  isLoading = false,
  error = null
}: ScheduleTableDetailedViewProps) {
  
  // Componente de esqueleto para carga
  const renderSkeletonContent = () => (
    <div className="animate-pulse">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left w-52 border-b border-gray-100">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            </th>
            <th className="px-4 py-3 text-left w-32 border-b border-gray-100">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
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
  );

  // Mensaje de error
  const renderError = () => (
    <div className="text-center p-8 bg-red-50">
      <div className="text-red-500 text-lg mb-1">Error al cargar los datos</div>
      <div className="text-red-400 text-sm">{error}</div>
    </div>
  );

  // Mensaje de no hay actividades
  const renderNoActividades = () => (
    <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-gray-500 font-medium">No hay actividades asignadas para este día</div>
      <p className="text-gray-400 text-sm mt-1">Las actividades diarias no están disponibles o no se han asignado.</p>
    </div>
  );

  // Contenido principal
  const renderTablaHorarios = () => {
    // Si no hay actividades, mostrar mensaje
    if (actividades.length === 0) {
      return renderNoActividades();
    }

    return (
      <div className="overflow-x-auto" style={{ maxHeight: '37vh' }}>
        <table className="min-w-full">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-52 border-b border-gray-100">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-32 border-b border-gray-100">DNI</th>
              {columnasTiempo.map(tiempo => (
                <th key={tiempo} className="w-16 px-1 py-3 text-center border-b border-gray-100">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-gray-700">{tiempo}</span>
                    <span className="text-xs text-gray-500">hrs</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actividades.map((actividad, index) => {
              const isEven = index % 2 === 0;

              return (
                <tr key={actividad.id} className={`${isEven ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <div className="font-medium text-gray-800 truncate">
                      {actividad.fields.Nombre || actividad.fields.Name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-gray-600">{actividad.fields.DNI || '-'}</td>
                  {columnasTiempo.map(tiempo => {
                    const valor = actividad.fields[tiempo] || '';
                    const bgColor = getBackgroundColor(valor);
                    
                    return (
                      <td 
                        key={`${actividad.id}-${tiempo}`} 
                        className={`px-1 py-3 border-b border-gray-100 border-l border-gray-100 ${bgColor} text-center`}
                      >
                        <div className="py-1 rounded-md">
                          {renderIcon(valor)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Contenido final a renderizar
  const tableContent = useMemo(() => {
    if (isLoading) return renderSkeletonContent();
    if (error) return renderError();
    return renderTablaHorarios();
  }, [isLoading, error, actividades, columnasTiempo]);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">Horarios del Día</h3>
      </div>
      
      {/* Leyenda de iconos */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3 justify-start items-center">
          <span className="text-xs font-medium text-gray-600">Leyenda:</span>
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-green-700" />
            <span className="text-xs text-gray-700">Trabajo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Home className="w-4 h-4 text-red-700" />
            <span className="text-xs text-gray-700">Libre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Plane className="w-4 h-4 text-blue-700" />
            <span className="text-xs text-gray-700">Vacaciones</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-purple-700" />
            <span className="text-xs text-gray-700">Baja Médica</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-orange-700" />
            <span className="text-xs text-gray-700">Formación</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Baby className="w-4 h-4 text-pink-700" />
            <span className="text-xs text-gray-700">Lactancia</span>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {tableContent}
      </div>
    </div>
  );
} 