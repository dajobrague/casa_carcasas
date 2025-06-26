'use client';

import React, { useState } from 'react';
import { DatosTraficoDia, formatNumber, formatCurrency } from '@/lib/utils';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

interface TrafficTableViewProps {
  datosTraficoDia: DatosTraficoDia | null;
  isLoading: boolean;
  error: string | null;
}

export function TrafficTableView({ datosTraficoDia, isLoading, error }: TrafficTableViewProps) {
  const [selectedDay, setSelectedDay] = useState<string>('lunes');
  
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
  
  // Nombres de días en español
  const diasSemana = {
    'lunes': 'Lunes',
    'martes': 'Martes',
    'miercoles': 'Miércoles',
    'jueves': 'Jueves',
    'viernes': 'Viernes',
    'sabado': 'Sábado',
    'domingo': 'Domingo'
  };
  
  // Función para obtener el color de fondo según la cantidad de entradas
  const getIntensityColor = (valor: number) => {
    if (valor < 10) return 'bg-blue-50';
    if (valor < 20) return 'bg-blue-100';
    if (valor < 30) return 'bg-green-100';
    if (valor < 40) return 'bg-green-200';
    if (valor < 50) return 'bg-yellow-100';
    if (valor < 60) return 'bg-yellow-200';
    if (valor < 70) return 'bg-orange-100';
    if (valor < 80) return 'bg-orange-200';
    if (valor < 90) return 'bg-red-100';
    return 'bg-red-200';
  };

  // Componente para mostrar información de intensidad de tráfico
  const IntensityLegend = () => (
    <div className="flex flex-wrap gap-1 justify-center p-2 bg-gray-50 rounded-lg text-xs">
      <span className="px-2 py-0.5 bg-blue-50 rounded-full shadow-sm">0-10</span>
      <span className="px-2 py-0.5 bg-blue-100 rounded-full shadow-sm">10-20</span>
      <span className="px-2 py-0.5 bg-green-100 rounded-full shadow-sm">20-30</span>
      <span className="px-2 py-0.5 bg-green-200 rounded-full shadow-sm">30-40</span>
      <span className="px-2 py-0.5 bg-yellow-100 rounded-full shadow-sm">40-50</span>
      <span className="px-2 py-0.5 bg-yellow-200 rounded-full shadow-sm">50-60</span>
      <span className="px-2 py-0.5 bg-orange-100 rounded-full shadow-sm">60-70</span>
      <span className="px-2 py-0.5 bg-orange-200 rounded-full shadow-sm">70-80</span>
      <span className="px-2 py-0.5 bg-red-100 rounded-full shadow-sm">80-90</span>
      <span className="px-2 py-0.5 bg-red-200 rounded-full shadow-sm">90+</span>
    </div>
  );

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

  // Si hay error, mostrar mensaje
  if (error) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg shadow-sm">
        <div className="text-red-500 text-base mb-1">Error al cargar los datos</div>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  // Si está cargando, mostrar esqueleto
  if (isLoading) {
    return (
      <div className="space-y-3">
        {/* Esqueleto para fechas */}
        <div className="flex items-center gap-2 p-3 bg-white rounded-lg shadow-sm">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        {/* Esqueleto para selector de día */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <Skeleton className="h-5 w-40 mb-3" />
          <div className="flex gap-1 overflow-x-auto pb-2">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
        
        {/* Esqueleto para horas - Usar SkeletonCard */}
        <SkeletonCard />
        
        {/* Esqueleto para totales */}
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
        
        {/* Esqueleto para la leyenda */}
        <div className="p-3 bg-white rounded-lg shadow-sm">
          <div className="flex flex-wrap gap-1 justify-center">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-10 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Si no hay datos, mostrar mensaje
  if (!datosTraficoDia || !datosTraficoDia.datosPorDia) {
    return (
      <div className="p-4 text-center bg-white rounded-lg shadow-sm">
        <div className="text-gray-400 text-base">No hay datos de tráfico disponibles para este día.</div>
      </div>
    );
  }

  // Obtener horas ordenadas una vez
  const horasOrdenadas = getHorasOrdenadas(datosTraficoDia.datosPorDia);

  // Obtener días disponibles
  const diasDisponibles = Object.keys(datosTraficoDia.datosPorDia);

  // Si no hay día seleccionado, seleccionar el primero
  const diaActual = selectedDay || diasDisponibles[0];

  // Datos para el día actual - Aserción de tipo para evitar error de TypeScript
  const datosDia = (datosTraficoDia.datosPorDia as any)[diaActual] || {};

  return (
    <div className="space-y-3">
      {/* Información del período - Histórico o Normal */}
      {datosTraficoDia && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg shadow-sm">
          {/* Mostrar información histórica si aplica */}
          {!isLoading && datosTraficoDia && (
            <div className="p-3 bg-gray-50">
              {(datosTraficoDia.esDatoHistorico || esPromedio4Semanas()) && datosTraficoDia.semanasReferencia ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      {Array.isArray(datosTraficoDia.semanasReferencia) && datosTraficoDia.semanasReferencia.some(ref => ref.includes('Día exacto:')) ? (
                        <>
                          <BarChart3 className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-medium uppercase text-purple-600">Día Específico:</span>
                        </>
                      ) : Array.isArray(datosTraficoDia.semanasReferencia) && datosTraficoDia.semanasReferencia.some(ref => ref.includes('Días específicos:')) ? (
                        <>
                          <BarChart3 className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-medium uppercase text-purple-600">Días Específicos:</span>
                        </>
                      ) : esPromedio4Semanas() ? (
                        <>
                          <BarChart3 className="w-3 h-3 text-blue-600" />
                          <span className="text-xs font-medium uppercase text-blue-600">Promedio 4 Semanas:</span>
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-3 h-3 text-orange-600" />
                          <span className="text-xs font-medium uppercase text-orange-600">Promedio Histórico:</span>
                        </>
                      )}
                    </div>
                  </div>
                  {!esConfiguracionPorDia() && !esPromedio4Semanas() && (
                    <div className={`text-xs px-2 py-1 rounded-full font-medium inline-block mb-2 ${
                      Array.isArray(datosTraficoDia.semanasReferencia) && datosTraficoDia.semanasReferencia.some(ref => ref.includes('Día exacto:') || ref.includes('Días específicos:'))
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}>
                      {Array.isArray(datosTraficoDia.semanasReferencia) ? datosTraficoDia.semanasReferencia.join(', ') : datosTraficoDia.semanasReferencia}
                    </div>
                  )}
                  <div className={`text-xs px-2 py-1 rounded-full font-medium inline-block ${
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
                  </div>
                </>
              ) : (
                datosTraficoDia.fechaInicio && datosTraficoDia.fechaFin && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase">Inicio:</span>
                      <span className="text-xs bg-blue-50 px-2 py-1 rounded-full">{datosTraficoDia.fechaInicio}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase">Fin:</span>
                      <span className="text-xs bg-blue-50 px-2 py-1 rounded-full">{datosTraficoDia.fechaFin}</span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Selector de día */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="mb-2 text-sm font-medium text-gray-700">Seleccionar día:</div>
        <div className="flex overflow-x-auto pb-2 gap-1 hide-scrollbar">
          {diasDisponibles.map(dia => {
            const fechasEspecificas = obtenerFechasEspecificas();
            const fechaEspecifica = fechasEspecificas[dia];
            const esPorDia = esConfiguracionPorDia();
            const nombreDia = diasSemana[dia as keyof typeof diasSemana] || dia;
            
            return (
              <button
                key={dia}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedDay(dia);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  diaActual === dia 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {esPorDia && fechaEspecifica ? (
                  <div className="flex flex-col items-center">
                    <span>{nombreDia}</span>
                    <span className="text-xs text-purple-600">{fechaEspecifica}</span>
                  </div>
                ) : (
                  nombreDia
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Datos de tráfico para el día seleccionado */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="mb-2 flex justify-between items-center">
          <h4 className="text-sm font-medium text-gray-700">
            {(() => {
              const fechasEspecificas = obtenerFechasEspecificas();
              const fechaEspecifica = fechasEspecificas[diaActual];
              const esPorDia = esConfiguracionPorDia();
              const nombreDia = diasSemana[diaActual as keyof typeof diasSemana] || diaActual;
              
              return esPorDia && fechaEspecifica 
                ? `${nombreDia} (${fechaEspecifica})`
                : `Tráfico para ${nombreDia}:`;
            })()}
          </h4>
          <div className="text-xs bg-blue-100 px-2 py-0.5 rounded-full">
            Total: {Object.values(datosDia).reduce((sum: number, valor: any) => sum + (valor || 0), 0)}
          </div>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {horasOrdenadas.map(hora => {
            const valor = datosDia[hora] || 0;
            const intensityColor = getIntensityColor(valor);
            
            return (
              <div 
                key={hora} 
                className={`${intensityColor} rounded-lg shadow-sm p-2 text-center`}
              >
                <div className="text-xs font-medium text-gray-600">{formatearHora(hora)}</div>
                <div className="text-base font-bold text-gray-800">{valor}</div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Totales */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 font-medium">Total Mañanas</div>
            <div className="text-lg font-bold text-blue-700">
              {formatNumber(typeof datosTraficoDia.totalMañana === 'number' 
                ? datosTraficoDia.totalMañana * 7 
                : datosTraficoDia.totalMañana.entradas * 7)}
            </div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 font-medium">Total Tardes</div>
            <div className="text-lg font-bold text-blue-700">
              {formatNumber(typeof datosTraficoDia.totalTarde === 'number' 
                ? datosTraficoDia.totalTarde * 7 
                : datosTraficoDia.totalTarde.entradas * 7)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Leyenda de intensidad */}
      <IntensityLegend />
    </div>
  );
} 