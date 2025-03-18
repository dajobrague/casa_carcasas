'use client';

import React, { useState } from 'react';
import { Option } from '@/components/ui/Select';
import { getBackgroundColor } from '@/lib/utils';
import { ActividadDiariaRecord } from '@/lib/airtable';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ScheduleCardViewProps {
  actividades: ActividadDiariaRecord[];
  columnasTiempo: string[];
  options: Option[];
}

export function ScheduleCardView({
  actividades,
  columnasTiempo,
  options
}: ScheduleCardViewProps) {
  // Estado para manejar qué tarjetas están expandidas
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Función para alternar la expansión de una tarjeta
  const toggleCardExpansion = (actividadId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [actividadId]: !prev[actividadId]
    }));
  };

  // Componente de esqueleto para carga
  const SkeletonLoader = () => (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-3">
          <div className="flex justify-between mb-2">
            <div className="h-5 bg-gray-200 rounded w-1/3"></div>
            <div className="h-5 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="space-y-2">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Si no hay actividades, mostrar mensaje
  if (actividades.length === 0) {
    return (
      <div className="text-center p-4 bg-white rounded-lg shadow-sm">
        <div className="text-gray-400 mb-2">No hay actividades asignadas para este día</div>
      </div>
    );
  }

  // Función para obtener un valor legible para una hora
  const getDisplayValue = (valor: string | undefined | null) => {
    if (!valor) return 'Sin asignar';
    return valor;
  };

  // Renderizar tarjetas para cada actividad
  return (
    <div className="space-y-3">
      {actividades.map(actividad => {
        const isExpanded = !!expandedCards[actividad.id];
        
        // Obtener empleado y DNI
        const nombreEmpleado = actividad.fields.Nombre || actividad.fields.Name || 'N/A';
        const dniEmpleado = actividad.fields.DNI || '-';
        
        return (
          <div key={actividad.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            {/* Cabecera de la tarjeta */}
            <div 
              className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleCardExpansion(actividad.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-sm">{nombreEmpleado}</h3>
                  <p className="text-xs text-gray-500">{dniEmpleado}</p>
                </div>
                <div className="flex items-center">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Contenido expandible */}
            {isExpanded && (
              <div className="border-t border-gray-100 p-3">
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Asignación por hora:</div>
                </div>
                
                <div className="space-y-2">
                  {columnasTiempo.map(tiempo => {
                    const valor = actividad.fields[tiempo];
                    const backgroundColor = getBackgroundColor(valor as string);
                    
                    return (
                      <div key={tiempo} className="flex items-center justify-between">
                        <div className="text-xs font-medium w-16">{tiempo}</div>
                        <div className={`text-xs font-medium py-1 px-2 rounded ${backgroundColor} flex-grow text-center`}>
                          {getDisplayValue(valor)}
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
  );
} 