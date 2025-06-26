'use client';

import React, { useMemo, useState } from 'react';
import { DatosTraficoDia, formatNumber, formatCurrency } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

type TabType = 'entradas' | 'tickets' | 'euros';

interface TrafficTableDetailedViewProps {
  datosTraficoDia: DatosTraficoDia | null;
  isLoading?: boolean;
  error?: string | null;
}

// Funciones de utilidad (movidas fuera del componente para mejorar rendimiento)
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

// Función para determinar el color de fondo según el valor
const getBgColor = (valor: number) => {
  if (valor >= 0 && valor < 10) return 'bg-blue-50';
  else if (valor >= 10 && valor < 20) return 'bg-blue-100';
  else if (valor >= 20 && valor < 30) return 'bg-green-100';
  else if (valor >= 30 && valor < 40) return 'bg-green-200';
  else if (valor >= 40 && valor < 50) return 'bg-yellow-100';
  else if (valor >= 50 && valor < 60) return 'bg-yellow-200';
  else if (valor >= 60 && valor < 70) return 'bg-orange-100';
  else if (valor >= 70 && valor < 80) return 'bg-orange-200';
  else if (valor >= 80 && valor < 90) return 'bg-red-100';
  else return 'bg-red-200';
};

// Exportar el componente directamente sin usar React.memo
export function TrafficTableDetailedView({ 
  datosTraficoDia, 
  isLoading = false, 
  error = null 
}: TrafficTableDetailedViewProps) {
  const [tabActivo, setTabActivo] = useState<TabType>('entradas');

  // Función para detectar si es una configuración por día específico
  const esConfiguracionPorDia = (): boolean => {
    const referencias = datosTraficoDia?.semanasReferencia;
    if (!referencias) return false;
    
    if (Array.isArray(referencias)) {
      return referencias.some((ref: string) => 
        ref.includes('Días específicos:') || ref.includes('Día exacto:')
      );
    } else {
      return referencias.includes('Días específicos:') || referencias.includes('Día exacto:');
    }
  };

  // Función para detectar si es promedio de 4 semanas (tienda no histórica)
  const esPromedio4Semanas = (): boolean => {
    const referencias = datosTraficoDia?.semanasReferencia;
    if (!referencias) return false;
    
    if (Array.isArray(referencias)) {
      return referencias.some((ref: string) => 
        ref.includes('Promedio últimas 4 semanas')
      );
    } else {
      return referencias.includes('Promedio últimas 4 semanas');
    }
  };

  // Función para extraer las fechas específicas usando el mapping del datosPorDia
  const obtenerFechasEspecificas = (): Record<string, string> => {
    const fechasMap: Record<string, string> = {};
    
    if (!datosTraficoDia?.datosPorDia) return fechasMap;
    
    // Obtener las fechas de referencia del header de la respuesta
    const fechaInicio = datosTraficoDia.fechaInicio;
    const fechaFin = datosTraficoDia.fechaFin;
    
    if (!fechaInicio || !fechaFin) return fechasMap;
    
    // Generar fechas desde fechaInicio hasta fechaFin
    const fechaInicioObj = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);
    const fechasReferencia: string[] = [];
    
    for (let fecha = new Date(fechaInicioObj); fecha <= fechaFinObj; fecha.setDate(fecha.getDate() + 1)) {
      fechasReferencia.push(fecha.toISOString().split('T')[0]);
    }
    
    // Mapear cada día de la semana con su fecha de referencia correspondiente
    const diasSemanaOrdenados = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const diasDisponibles = Object.keys(datosTraficoDia.datosPorDia);
    
    diasDisponibles.forEach((dia, index) => {
      if (index < fechasReferencia.length) {
        const fechaReferencia = fechasReferencia[index];
        // Formatear fecha para mostrar día/mes con indicación del año anterior
        const fechaObj = new Date(fechaReferencia);
        const diaNum = fechaObj.getDate().toString().padStart(2, '0');
        const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaObj.getFullYear();
        fechasMap[dia] = `${diaNum}/${mes}/${año}`;
      }
    });
    
    return fechasMap;
  };

  // Skeleton loader para la tabla de tráfico
  const renderSkeletonContent = () => (
    <div className="p-4 space-y-4">
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
  );

  // Mensaje de error
  const renderError = () => (
    <div className="text-center p-6 bg-red-50">
      <div className="text-red-500 text-lg mb-1">Error al cargar los datos</div>
      <div className="text-red-400 text-sm">{error}</div>
    </div>
  );

  // Mensaje de no hay datos
  const renderNoData = () => (
    <div className="p-6 text-center">
      <div className="text-gray-400 text-lg">No hay datos de tráfico disponibles para este día.</div>
    </div>
  );

  // Contenido principal
  const renderTrafficTable = () => {
    if (!datosTraficoDia || !datosTraficoDia.datosPorDia) {
      return renderNoData();
    }

    return (
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
                const fechasEspecificas = obtenerFechasEspecificas();
                const fechaEspecifica = fechasEspecificas[dia];
                const esPorDia = esConfiguracionPorDia();
                
                return (
                  <tr key={dia} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
                      {esPorDia && fechaEspecifica ? (
                        <div className="flex flex-col">
                          <span>{diaTitulo}</span>
                          <span className="text-xs text-purple-600 font-normal">{fechaEspecifica}</span>
                        </div>
                      ) : (
                        diaTitulo
                      )}
                    </td>
                    {getHorasOrdenadas(datosTraficoDia.datosPorDia).map(hora => {
                      // Asegurarnos de que horas[hora] es un número
                      const valor = typeof horas[hora] === 'number' ? horas[hora] : 0;
                      const bgColor = getBgColor(valor);
                      
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
                  <span className="bg-blue-100 px-2 py-1 rounded-full">
                    {formatNumber(typeof datosTraficoDia.totalMañana === 'number' 
                      ? datosTraficoDia.totalMañana * 7 
                      : datosTraficoDia.totalMañana.entradas * 7)}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm font-semibold text-gray-700 border-t border-gray-200 whitespace-nowrap">TOTAL TARDES:</td>
                <td colSpan={5} className="px-2 py-2 text-right text-sm font-bold text-gray-700 border-t border-gray-200">
                  <span className="bg-blue-100 px-2 py-1 rounded-full">
                    {formatNumber(typeof datosTraficoDia.totalTarde === 'number' 
                      ? datosTraficoDia.totalTarde * 7 
                      : datosTraficoDia.totalTarde.entradas * 7)}
                  </span>
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
    );
  };

  // Memoizar el contenido para evitar recálculos innecesarios
  const content = useMemo(() => {
    if (isLoading) return renderSkeletonContent();
    if (error) return renderError();
    return renderTrafficTable();
  }, [isLoading, error, datosTraficoDia]);

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-gray-100">
        {(!isLoading && datosTraficoDia) && (
          <div className="flex flex-wrap items-center gap-3 text-gray-600">
            {(datosTraficoDia.esDatoHistorico || esPromedio4Semanas()) && datosTraficoDia.semanasReferencia ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.isArray(datosTraficoDia.semanasReferencia) && datosTraficoDia.semanasReferencia.some(ref => ref.includes('Día exacto:')) ? (
                      <>
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium uppercase text-purple-600">Día Específico:</span>
                      </>
                    ) : Array.isArray(datosTraficoDia.semanasReferencia) && datosTraficoDia.semanasReferencia.some(ref => ref.includes('Días específicos:')) ? (
                      <>
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium uppercase text-purple-600">Días Específicos:</span>
                      </>
                    ) : esPromedio4Semanas() ? (
                      <>
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium uppercase text-blue-600">Promedio 4 Semanas:</span>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium uppercase text-orange-600">Promedio Histórico:</span>
                      </>
                    )}
                  </div>
                  {!esConfiguracionPorDia() && !esPromedio4Semanas() && (
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                      Array.isArray(datosTraficoDia.semanasReferencia) && datosTraficoDia.semanasReferencia.some(ref => ref.includes('Día exacto:') || ref.includes('Días específicos:'))
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}>
                      {Array.isArray(datosTraficoDia.semanasReferencia) ? datosTraficoDia.semanasReferencia.join(', ') : datosTraficoDia.semanasReferencia}
                    </span>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  Array.isArray(datosTraficoDia.semanasReferencia) && datosTraficoDia.semanasReferencia.some(ref => ref.includes('Día exacto:') || ref.includes('Días específicos:'))
                    ? 'bg-purple-100 text-purple-800'
                    : esPromedio4Semanas()
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {Array.isArray(datosTraficoDia.semanasReferencia) && datosTraficoDia.semanasReferencia.some(ref => ref.includes('Día exacto:') || ref.includes('Días específicos:'))
                    ? 'Comparable por día'
                    : esPromedio4Semanas()
                    ? 'Últimas 4 semanas'
                    : 'Año anterior'
                  }
                </span>
              </>
            ) : (
              datosTraficoDia.fechaInicio && datosTraficoDia.fechaFin && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium uppercase">Inicio:</span>
                    <span className="text-sm bg-blue-50 px-2 py-1 rounded-full">{datosTraficoDia.fechaInicio}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium uppercase">Fin:</span>
                    <span className="text-sm bg-blue-50 px-2 py-1 rounded-full">{datosTraficoDia.fechaFin}</span>
                  </div>
                </>
              )
            )}
          </div>
        )}
      </div>
      
      {content}
    </div>
  );
} 