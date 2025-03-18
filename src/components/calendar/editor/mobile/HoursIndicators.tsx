'use client';

import React, { useEffect, useRef } from 'react';

interface HoursIndicatorsProps {
  horasEfectivasDiarias: number;
  horasAprobadasSemanales: number;
  horasEfectivasSemanales: number;
}

export function HoursIndicators({
  horasEfectivasDiarias,
  horasAprobadasSemanales,
  horasEfectivasSemanales
}: HoursIndicatorsProps) {
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
    <div className="flex flex-col space-y-2 px-3 py-2 bg-white rounded-lg shadow-sm">
      {/* Horas Efectivas Diarias */}
      <div className="flex items-center justify-between bg-red-50 rounded-lg p-2 shadow-sm">
        <span className="text-xs text-red-600 font-medium">HE Diarias:</span>
        <div 
          ref={horasEfectivasDiariasElementRef}
          className="text-base font-bold text-red-700 ml-2 transition-colors bg-white px-2 py-1 rounded-full"
        >
          {typeof horasEfectivasDiarias === 'number' ? horasEfectivasDiarias.toFixed(1) : '0.0'}
        </div>
      </div>
      
      {/* Horas Aprobadas Semanales */}
      <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2 shadow-sm">
        <span className="text-xs text-blue-600 font-medium">HA Semanales:</span>
        <div className="text-base font-bold text-blue-700 ml-2 bg-white px-2 py-1 rounded-full">
          {typeof horasAprobadasSemanales === 'number' ? horasAprobadasSemanales.toFixed(1) : '0.0'}
        </div>
      </div>
      
      {/* Horas Efectivas Semanales */}
      <div className="flex items-center justify-between bg-green-50 rounded-lg p-2 shadow-sm">
        <span className="text-xs text-green-600 font-medium">HE Semanales:</span>
        <div 
          ref={horasEfectivasSemanalesElementRef}
          className="text-base font-bold text-green-700 ml-2 transition-colors bg-white px-2 py-1 rounded-full"
        >
          {typeof horasEfectivasSemanales === 'number' ? horasEfectivasSemanales.toFixed(1) : '0.0'}
        </div>
      </div>
    </div>
  );
} 