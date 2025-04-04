'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface MesSelectorProps {
  className?: string;
  tiendaId: string;
  onSelectMes: (mes: string) => void;
  mesSeleccionado: string;
}

export default function MesSelector({ 
  className = '', 
  tiendaId, 
  onSelectMes, 
  mesSeleccionado 
}: MesSelectorProps) {
  const [mesActualIndex, setMesActualIndex] = useState<number>(12); // Índice del mes actual (12 después de los 12 meses anteriores)

  // Generar meses estáticamente (últimos 12 meses, mes actual, próximos 12 meses)
  const meses = useMemo(() => {
    const mesActual = new Date();
    const listaMeses = [];
    
    // Nombres de los meses en español
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    // Agregar últimos 12 meses
    for (let i = 12; i > 0; i--) {
      const fecha = new Date(mesActual);
      fecha.setMonth(mesActual.getMonth() - i);
      const nombreMes = nombresMeses[fecha.getMonth()];
      const año = fecha.getFullYear();
      listaMeses.push(`${nombreMes} ${año}`);
    }
    
    // Agregar mes actual
    const mesActualNombre = nombresMeses[mesActual.getMonth()];
    const añoActual = mesActual.getFullYear();
    const mesActualTexto = `${mesActualNombre} ${añoActual}`;
    listaMeses.push(mesActualTexto);
    
    // Agregar próximos 12 meses
    for (let i = 1; i <= 12; i++) {
      const fecha = new Date(mesActual);
      fecha.setMonth(mesActual.getMonth() + i);
      const nombreMes = nombresMeses[fecha.getMonth()];
      const año = fecha.getFullYear();
      listaMeses.push(`${nombreMes} ${año}`);
    }
    
    return listaMeses;
  }, []);

  // Seleccionar el mes actual por defecto si no hay mes seleccionado
  useEffect(() => {
    if (meses.length > 0 && !mesSeleccionado) {
      onSelectMes(meses[mesActualIndex]);
    } else if (mesSeleccionado) {
      // Si ya hay un mes seleccionado, actualizar el índice
      const index = meses.indexOf(mesSeleccionado);
      if (index >= 0) {
        setMesActualIndex(index);
      }
    }
  }, [meses, mesActualIndex, onSelectMes, mesSeleccionado]);

  // Ir al mes anterior
  const irAlMesAnterior = () => {
    if (mesActualIndex > 0) {
      const nuevoIndex = mesActualIndex - 1;
      setMesActualIndex(nuevoIndex);
      onSelectMes(meses[nuevoIndex]);
    }
  };

  // Ir al mes siguiente
  const irAlMesSiguiente = () => {
    if (mesActualIndex < meses.length - 1) {
      const nuevoIndex = mesActualIndex + 1;
      setMesActualIndex(nuevoIndex);
      onSelectMes(meses[nuevoIndex]);
    }
  };

  return (
    <div className={`flex items-center justify-center bg-white p-4 mb-6 rounded-lg shadow-sm ${className}`}>
      <button
        type="button"
        onClick={irAlMesAnterior}
        disabled={mesActualIndex === 0}
        className={`p-2 rounded-full ${mesActualIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500 hover:bg-blue-50'}`}
        aria-label="Mes anterior"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      
      <div className="mx-6 text-lg font-medium text-gray-800 w-[180px] text-center">
        {meses[mesActualIndex]}
      </div>
      
      <button
        type="button"
        onClick={irAlMesSiguiente}
        disabled={mesActualIndex === meses.length - 1}
        className={`p-2 rounded-full ${mesActualIndex === meses.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-blue-500 hover:bg-blue-50'}`}
        aria-label="Mes siguiente"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
} 