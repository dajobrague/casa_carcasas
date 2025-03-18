'use client';

import React, { useEffect, useRef } from 'react';

interface HoursIndicatorsViewDesktopProps {
  horasEfectivasDiarias: number;
  horasAprobadasSemanales: number;
  horasEfectivasSemanales: number;
}

// Exportar el componente directamente sin usar React.memo
export function HoursIndicatorsViewDesktop({
  horasEfectivasDiarias,
  horasAprobadasSemanales,
  horasEfectivasSemanales
}: HoursIndicatorsViewDesktopProps) {
  // Referencias para rastrear los valores anteriores y aplicar animación
  const prevHorasEfectivasDiariasRef = useRef<number>(horasEfectivasDiarias);
  const prevHorasEfectivasSemanalesRef = useRef<number>(horasEfectivasSemanales);
  
  // Referencias a los elementos DOM
  const horasEfectivasDiariasElementRef = useRef<HTMLDivElement>(null);
  const horasEfectivasSemanalesElementRef = useRef<HTMLDivElement>(null);
  
  // Efecto para animar cambios en las horas
  useEffect(() => {
    // Comprobar si las horas efectivas diarias han cambiado
    if (horasEfectivasDiarias !== prevHorasEfectivasDiariasRef.current && horasEfectivasDiariasElementRef.current) {
      // Añadir y quitar clase para animar
      horasEfectivasDiariasElementRef.current.classList.add('animate-flash');
      setTimeout(() => {
        if (horasEfectivasDiariasElementRef.current) {
          horasEfectivasDiariasElementRef.current.classList.remove('animate-flash');
        }
      }, 600);
      
      // Actualizar la referencia
      prevHorasEfectivasDiariasRef.current = horasEfectivasDiarias;
    }
    
    // Comprobar si las horas efectivas semanales han cambiado
    if (horasEfectivasSemanales !== prevHorasEfectivasSemanalesRef.current && horasEfectivasSemanalesElementRef.current) {
      // Añadir y quitar clase para animar
      horasEfectivasSemanalesElementRef.current.classList.add('animate-flash');
      setTimeout(() => {
        if (horasEfectivasSemanalesElementRef.current) {
          horasEfectivasSemanalesElementRef.current.classList.remove('animate-flash');
        }
      }, 600);
      
      // Actualizar la referencia
      prevHorasEfectivasSemanalesRef.current = horasEfectivasSemanales;
    }
  }, [horasEfectivasDiarias, horasEfectivasSemanales]);
  
  return (
    <div className="grid grid-cols-3 gap-4 px-4 py-3 -mt-1 bg-white rounded-lg shadow-sm">
      <div className="text-center py-1 px-3 bg-red-50 rounded-md shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-red-600 font-medium">Horas Efectivas Diarias:</div>
          <div 
            ref={horasEfectivasDiariasElementRef}
            className="text-lg font-bold text-gray-800 ml-2 transition-colors"
          >
            {typeof horasEfectivasDiarias === 'number' ? horasEfectivasDiarias.toFixed(1) : '0.0'}
          </div>
        </div>
      </div>
      <div className="text-center py-1 px-3 bg-blue-50 rounded-md shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-blue-600 font-medium">Horas Aprobadas Semanales:</div>
          <div className="text-lg font-bold text-gray-800 ml-2">
            {typeof horasAprobadasSemanales === 'number' ? horasAprobadasSemanales.toFixed(1) : '0.0'}
          </div>
        </div>
      </div>
      <div className="text-center py-1 px-3 bg-green-50 rounded-md shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-green-600 font-medium">Horas Efectivas Semanales:</div>
          <div 
            ref={horasEfectivasSemanalesElementRef}
            className="text-lg font-bold text-gray-800 ml-2 transition-colors"
          >
            {typeof horasEfectivasSemanales === 'number' ? horasEfectivasSemanales.toFixed(1) : '0.0'}
          </div>
        </div>
      </div>
    </div>
  );
} 