'use client';

import React from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { capitalizarPrimeraLetra } from '@/lib/airtable';
import { Button } from '@/components/ui/Button';
import { Calendar } from 'lucide-react';

interface YearViewProps {
  onSelectMonth: (month: string, year: string) => void;
}

export function YearView({ onSelectMonth }: YearViewProps) {
  const { 
    currentYear, 
    setCurrentYear, 
    availableYears, 
    semanasLaborales,
    mesesDisponibles,
    isLoading
  } = useSchedule();

  // Obtener meses únicos del año actual
  const mesesDelAño = React.useMemo(() => {
    // Filtrar los meses por el año actual
    const mesesDelAñoActual = mesesDisponibles.filter(mesCompleto => {
      const partes = mesCompleto.split(' ');
      const año = partes[partes.length - 1];
      return año === currentYear;
    });

    // Si no hay meses disponibles, devolver array vacío
    if (mesesDelAñoActual.length === 0) {
      return [];
    }

    // Función para convertir nombre de mes a número para ordenamiento
    function obtenerNumeroMes(nombreMes: string): number {
      const meses: Record<string, number> = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
        'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
        'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
      };
      // Extraer solo el nombre del mes sin el año
      const partesMes = nombreMes.toLowerCase().split(' ');
      const soloMes = partesMes[0];
      return meses[soloMes] ?? -1;
    }

    // Ordenar meses
    const mesesOrdenados = [...mesesDelAñoActual].sort((a, b) => {
      const mesNumA = obtenerNumeroMes(a || '');
      const mesNumB = obtenerNumeroMes(b || '');
      return mesNumA - mesNumB;
    });

    const mesActual = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();

    return mesesOrdenados.map(mes => {
      // Formatear el nombre del mes correctamente
      const partes = mes.split(' ');
      const nombreMes = partes[0];
      const año = partes[partes.length - 1];
      
      // Capitalizar solo la primera letra del mes
      const nombreCapitalizado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
      const nombreFormateado = `${nombreCapitalizado} ${año}`;
      
      return {
        name: nombreFormateado,
        isCurrent: nombreMes.toLowerCase() === mesActual
      };
    });
  }, [currentYear, mesesDisponibles]);

  // Cambiar al año anterior
  const handlePrevYear = () => {
    const currentIndex = availableYears.indexOf(currentYear);
    if (currentIndex > 0) {
      setCurrentYear(availableYears[currentIndex - 1]);
    }
  };

  // Cambiar al año siguiente
  const handleNextYear = () => {
    const currentIndex = availableYears.indexOf(currentYear);
    if (currentIndex < availableYears.length - 1) {
      setCurrentYear(availableYears[currentIndex + 1]);
    }
  };

  if (isLoading) {
    return (
      <div className="col-span-full flex items-center justify-center gap-2 text-gray-500 p-8">
        <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Solo un selector de año con diseño responsivo */}
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <div className="flex items-center gap-1 md:gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handlePrevYear}
            disabled={availableYears.indexOf(currentYear) === 0}
            className="p-1 md:p-2"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">{currentYear}</h1>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleNextYear}
            disabled={availableYears.indexOf(currentYear) === availableYears.length - 1}
            className="p-1 md:p-2"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {mesesDelAño.length > 0 ? (
          mesesDelAño.map((month) => (
            <div 
              key={month.name}
              className="relative p-4 md:p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 transition-colors text-left cursor-pointer"
              onClick={() => {
                // Formato ahora es correcto: "nombreMes año"
                const partes = month.name.split(' ');
                const mes = partes[0];
                const año = partes[1];
                console.log(`Seleccionando mes: ${mes}, año: ${año}`);
                onSelectMonth(mes, año);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base md:text-lg font-medium">{month.name}</h3>
                </div>
                <Calendar className={`w-4 h-4 md:w-5 md:h-5 ${month.isCurrent ? 'text-green-500' : 'text-gray-400'}`} />
              </div>
              {month.isCurrent && (
                <div className="absolute top-2 right-2 md:top-3 md:right-3">
                  <span className="absolute hidden group-hover:block bg-green-100 text-green-800 text-xs px-2 py-1 rounded right-0 top-6 whitespace-nowrap">
                    Mes actual
                  </span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 py-4">
            No hay meses disponibles para el año {currentYear}
          </div>
        )}
      </div>
    </div>
  );
}
