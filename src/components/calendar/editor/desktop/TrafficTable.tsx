'use client';

import React from 'react';
import { DatosTraficoDia } from '@/lib/utils';

interface TrafficTableProps {
  datosTraficoDia: DatosTraficoDia | null;
  isLoading: boolean;
  error: string | null;
}

export function TrafficTable({ datosTraficoDia, isLoading, error }: TrafficTableProps) {
  // Función para obtener las horas ordenadas
  const getHorasOrdenadas = (datos: any) => {
    if (!datos?.lunes) return [];
    return Object.keys(datos.lunes).sort((a, b) => {
      const horaA = parseInt(a.split(':')[0]);
      const horaB = parseInt(b.split(':')[0]);
      return horaA - horaB;
    });
  };

  // Función para formatear la hora
  const formatearHora = (hora: string) => {
    const horaNum = parseInt(hora.split(':')[0]);
    return `${horaNum.toString().padStart(2, '0')}:00`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-2 sm:mb-0">Tráfico por Hora</h3>
        {datosTraficoDia?.fechaInicio && datosTraficoDia?.fechaFin && (
          <div className="flex flex-wrap items-center gap-2 text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium uppercase">Inicio:</span>
              <span className="text-sm bg-blue-50 px-2 py-1 rounded-full">{datosTraficoDia.fechaInicio}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium uppercase">Fin:</span>
              <span className="text-sm bg-blue-50 px-2 py-1 rounded-full">{datosTraficoDia.fechaFin}</span>
            </div>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="p-4 space-y-4">
          {/* Skeleton loader para la tabla de tráfico */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden table-fixed">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left w-24 border-b border-gray-200">
                    <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  {[...Array(12)].map((_, i) => (
                    <th 
                      key={i} 
                      className="w-14 px-0 py-2 text-center border-b border-gray-200 border-l border-gray-200"
                      style={{ width: '3.5rem' }}
                    >
                      <div className="h-5 w-10 mx-auto bg-gray-200 rounded animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Filas para cada día de la semana */}
                {[...Array(7)].map((_, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
                      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                    {[...Array(12)].map((_, cellIndex) => (
                      <td 
                        key={`cell-${rowIndex}-${cellIndex}`} 
                        className="w-14 border-b border-gray-200 border-l border-gray-200 p-1"
                        style={{ width: '3.5rem' }}
                      >
                        <div className="h-6 w-full bg-gray-200 rounded animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100">
                  <td className="px-3 py-2 border-t border-gray-200 whitespace-nowrap">
                    <div className="h-5 w-28 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td colSpan={6} className="px-2 py-2 text-right border-t border-gray-200">
                    <div className="h-6 w-16 ml-auto bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="px-3 py-2 border-t border-gray-200 whitespace-nowrap">
                    <div className="h-5 w-28 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td colSpan={5} className="px-2 py-2 text-right border-t border-gray-200">
                    <div className="h-6 w-16 ml-auto bg-gray-200 rounded animate-pulse"></div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Skeleton para la leyenda de colores */}
          <div className="flex flex-wrap gap-2 justify-center p-3 bg-gray-50 rounded-lg">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-6 w-12 bg-gray-200 rounded-full animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-center p-6 bg-red-50">
          <div className="text-red-500 text-lg mb-1">Error al cargar los datos</div>
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      ) : !datosTraficoDia || !datosTraficoDia.datosPorDia ? (
        <div className="p-6 text-center">
          <div className="text-gray-400 text-lg">No hay datos de tráfico disponibles para este día.</div>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Tabla de tráfico por hora */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden table-fixed">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 w-24">Entradas</th>
                  {getHorasOrdenadas(datosTraficoDia.datosPorDia).map(hora => (
                    <th 
                      key={hora} 
                      className="w-14 px-0 py-2 text-center text-xs font-semibold text-gray-700 border-b border-gray-200 border-l border-gray-200"
                      style={{ width: '3.5rem' }}
                    >
                      {formatearHora(hora)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Fila para cada día de la semana */}
                {datosTraficoDia?.datosPorDia && Object.entries(datosTraficoDia.datosPorDia).map(([dia, horas], index) => {
                  const diaTitulo = dia.charAt(0).toUpperCase() + dia.slice(1);
                  return (
                    <tr key={dia} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">{diaTitulo}</td>
                      {getHorasOrdenadas(datosTraficoDia.datosPorDia).map(hora => {
                        const valor = horas[hora] || 0;
                        let bgColor = 'bg-blue-50';
                        if (valor >= 0 && valor < 10) bgColor = 'bg-blue-50';
                        else if (valor >= 10 && valor < 20) bgColor = 'bg-blue-100';
                        else if (valor >= 20 && valor < 30) bgColor = 'bg-green-100';
                        else if (valor >= 30 && valor < 40) bgColor = 'bg-green-200';
                        else if (valor >= 40 && valor < 50) bgColor = 'bg-yellow-100';
                        else if (valor >= 50 && valor < 60) bgColor = 'bg-yellow-200';
                        else if (valor >= 60 && valor < 70) bgColor = 'bg-orange-100';
                        else if (valor >= 70 && valor < 80) bgColor = 'bg-orange-200';
                        else if (valor >= 80 && valor < 90) bgColor = 'bg-red-100';
                        else if (valor >= 90) bgColor = 'bg-red-200';
                        
                        return (
                          <td 
                            key={`${dia}-${hora}`} 
                            className="w-14 border-b border-gray-200 border-l border-gray-200 p-1"
                            style={{ width: '3.5rem' }}
                          >
                            <div className={`text-center text-sm font-medium text-gray-700 ${bgColor} rounded py-1 px-0 shadow-sm`}>
                              {valor}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100">
                  <td className="px-3 py-2 text-sm font-semibold text-gray-700 border-t border-gray-200 whitespace-nowrap">TOTAL MAÑANAS:</td>
                  <td colSpan={6} className="px-2 py-2 text-right text-sm font-bold text-gray-700 border-t border-gray-200">
                    <span className="bg-blue-100 px-2 py-1 rounded-full">{datosTraficoDia.totalMañana * 7}</span>
                  </td>
                  <td className="px-3 py-2 text-sm font-semibold text-gray-700 border-t border-gray-200 whitespace-nowrap">TOTAL TARDES:</td>
                  <td colSpan={5} className="px-2 py-2 text-right text-sm font-bold text-gray-700 border-t border-gray-200">
                    <span className="bg-blue-100 px-2 py-1 rounded-full">{datosTraficoDia.totalTarde * 7}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Leyenda de colores */}
          <div className="flex flex-wrap gap-2 justify-center p-3 bg-gray-50 rounded-lg">
            <span className="px-2 py-1 bg-blue-50 text-xs font-medium text-gray-700 rounded-full shadow-sm">0-10</span>
            <span className="px-2 py-1 bg-blue-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">10-20</span>
            <span className="px-2 py-1 bg-green-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">20-30</span>
            <span className="px-2 py-1 bg-green-200 text-xs font-medium text-gray-700 rounded-full shadow-sm">30-40</span>
            <span className="px-2 py-1 bg-yellow-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">40-50</span>
            <span className="px-2 py-1 bg-yellow-200 text-xs font-medium text-gray-700 rounded-full shadow-sm">50-60</span>
            <span className="px-2 py-1 bg-orange-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">60-70</span>
            <span className="px-2 py-1 bg-orange-200 text-xs font-medium text-gray-700 rounded-full shadow-sm">70-80</span>
            <span className="px-2 py-1 bg-red-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">80-90</span>
            <span className="px-2 py-1 bg-red-200 text-xs font-medium text-gray-700 rounded-full shadow-sm">90+</span>
          </div>
        </div>
      )}
    </div>
  );
} 