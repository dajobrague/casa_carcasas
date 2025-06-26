'use client';

import React, { useState, useEffect } from 'react';
import { obtenerDatosTienda, ActividadDiariaRecord, TiendaSupervisorRecord } from '@/lib/airtable';
import { DatosTraficoDia, formatNumber, formatCurrency } from '@/lib/utils';
import { Users, Ticket, Euro, BarChart3 } from 'lucide-react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

type TabType = 'entradas' | 'tickets' | 'euros';

interface TrafficTableProps {
  datosTraficoDia: DatosTraficoDia | null;
  isLoading?: boolean;
  error?: string | null;
  // Agregamos props para calcular Atención y Estimado
  actividades?: ActividadDiariaRecord[];
  storeRecordId?: string;
  fecha?: Date;
}

export function TrafficTable({ 
  datosTraficoDia, 
  isLoading, 
  error,
  actividades = [],
  storeRecordId,
  fecha
}: TrafficTableProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Estado para el tab activo
  const [tabActivo, setTabActivo] = useState<TabType>('entradas');
  
  // Estados para datos de la tienda
  const [atencionDeseada, setAtencionDeseada] = useState<number>(25);
  const [factorCrecimiento, setFactorCrecimiento] = useState<number>(0.05);

  // Cargar parámetros de la tienda
  useEffect(() => {
    async function cargarParametrosTienda() {
      if (!storeRecordId) return;
      
      try {
        const tienda = await obtenerDatosTienda(storeRecordId);
        if (tienda) {
          // Usar las propiedades correctas del tipo TiendaSupervisorRecord
          setAtencionDeseada((tienda.fields['Atención Deseada'] as number) || 25);
          setFactorCrecimiento((tienda.fields['Factor Crecimiento'] as number) || 0.05);
        }
      } catch (error) {
        console.error('Error al cargar parámetros de la tienda:', error);
      }
    }
    
    cargarParametrosTienda();
  }, [storeRecordId]);

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

  // Función para obtener el valor según el tab activo
  const obtenerValorPorTab = (datosHora: any): number => {
    if (typeof datosHora === 'number') {
      // Formato legacy: solo entradas
      return tabActivo === 'entradas' ? datosHora : 0;
    } else if (typeof datosHora === 'object' && datosHora !== null) {
      // Formato nuevo: objeto con entradas, tickets, euros
      return datosHora[tabActivo] || 0;
    }
    return 0;
  };

  // Función para obtener el color de fondo basado en el valor y el tipo de tab
  const obtenerColorFondo = (valor: number, tabType: TabType): string => {
    if (tabType === 'entradas') {
      if (valor >= 0 && valor < 10) return 'bg-blue-50';
      else if (valor >= 10 && valor < 20) return 'bg-blue-100';
      else if (valor >= 20 && valor < 30) return 'bg-green-100';
      else if (valor >= 30 && valor < 40) return 'bg-green-200';
      else if (valor >= 40 && valor < 50) return 'bg-yellow-100';
      else if (valor >= 50 && valor < 60) return 'bg-yellow-200';
      else if (valor >= 60 && valor < 70) return 'bg-orange-100';
      else if (valor >= 70 && valor < 80) return 'bg-orange-200';
      else return 'bg-red-100';
    } else if (tabType === 'tickets') {
      if (valor >= 0 && valor < 5) return 'bg-purple-50';
      else if (valor >= 5 && valor < 10) return 'bg-purple-100';
      else if (valor >= 10 && valor < 15) return 'bg-purple-200';
      else if (valor >= 15 && valor < 20) return 'bg-purple-300';
      else return 'bg-purple-400';
    } else { // euros
      if (valor >= 0 && valor < 100) return 'bg-emerald-50';
      else if (valor >= 100 && valor < 200) return 'bg-emerald-100';
      else if (valor >= 200 && valor < 300) return 'bg-emerald-200';
      else if (valor >= 300 && valor < 400) return 'bg-emerald-300';
      else return 'bg-emerald-400';
    }
  };

  // Función para formatear el valor según el tipo
  const formatearValor = (valor: number, tabType: TabType): string => {
    if (tabType === 'euros') {
      return `€${valor.toFixed(2)}`;
    }
    return valor.toString();
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

  // Componente para mostrar información de intensidad de tráfico dinámica
  const IntensityLegend = () => (
    <div className="flex flex-wrap gap-1 justify-center p-2 bg-gray-50 rounded-lg text-xs">
      {tabActivo === 'entradas' ? (
        <>
          <span className="px-2 py-0.5 bg-blue-50 rounded-full shadow-sm">0-10</span>
          <span className="px-2 py-0.5 bg-blue-100 rounded-full shadow-sm">10-20</span>
          <span className="px-2 py-0.5 bg-green-100 rounded-full shadow-sm">20-30</span>
          <span className="px-2 py-0.5 bg-green-200 rounded-full shadow-sm">30-40</span>
          <span className="px-2 py-0.5 bg-yellow-100 rounded-full shadow-sm">40-50</span>
          <span className="px-2 py-0.5 bg-yellow-200 rounded-full shadow-sm">50-60</span>
          <span className="px-2 py-0.5 bg-orange-100 rounded-full shadow-sm">60-70</span>
          <span className="px-2 py-0.5 bg-orange-200 rounded-full shadow-sm">70-80</span>
          <span className="px-2 py-0.5 bg-red-100 rounded-full shadow-sm">80+</span>
        </>
      ) : tabActivo === 'tickets' ? (
        <>
          <span className="px-2 py-0.5 bg-purple-50 rounded-full shadow-sm">0-5</span>
          <span className="px-2 py-0.5 bg-purple-100 rounded-full shadow-sm">5-10</span>
          <span className="px-2 py-0.5 bg-purple-200 rounded-full shadow-sm">10-15</span>
          <span className="px-2 py-0.5 bg-purple-300 rounded-full shadow-sm">15-20</span>
          <span className="px-2 py-0.5 bg-purple-400 text-white rounded-full shadow-sm">20+</span>
        </>
      ) : (
        <>
          <span className="px-2 py-0.5 bg-emerald-50 rounded-full shadow-sm">€0-100</span>
          <span className="px-2 py-0.5 bg-emerald-100 rounded-full shadow-sm">€100-200</span>
          <span className="px-2 py-0.5 bg-emerald-200 rounded-full shadow-sm">€200-300</span>
          <span className="px-2 py-0.5 bg-emerald-300 rounded-full shadow-sm">€300-400</span>
          <span className="px-2 py-0.5 bg-emerald-400 text-white rounded-full shadow-sm">€400+</span>
        </>
      )}
    </div>
  );

  // Función para obtener la atención deseada (es un valor fijo por día, no se calcula)
  const calcularPersonalTrabajando = (hora: string): number => {
    // La "atención" es directamente el valor de "atención deseada" de los parámetros de la tienda
    if (hora === getHorasOrdenadas(datosTraficoDia?.datosPorDia)?.[0]) {
      console.log('📊 ATENCIÓN DESEADA MOBILE (valor fijo para todas las horas):', atencionDeseada);
    }
    
    return atencionDeseada;
  };

  // Función para calcular personal estimado (recomendado) por hora
  const calcularPersonalEstimado = (hora: string): number => {
    if (!datosTraficoDia || !datosTraficoDia.datosPorDia) return 0;
    
    // Obtener promedio de entradas para esta hora en todos los días
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    let totalEntradas = 0;
    let diasConDatos = 0;
    
    diasSemana.forEach(dia => {
      if (datosTraficoDia.datosPorDia && 
          datosTraficoDia.datosPorDia[dia as keyof typeof datosTraficoDia.datosPorDia] && 
          datosTraficoDia.datosPorDia[dia as keyof typeof datosTraficoDia.datosPorDia][hora]) {
        const datosHora = datosTraficoDia.datosPorDia[dia as keyof typeof datosTraficoDia.datosPorDia][hora];
        // Manejar tanto formato nuevo como legacy
        const entradas = typeof datosHora === 'number' ? datosHora : datosHora.entradas;
        totalEntradas += entradas;
        diasConDatos++;
      }
    });
    
    const promedioEntradas = diasConDatos > 0 ? totalEntradas / diasConDatos : 0;
    
    // Aplicar fórmula: (Entradas * (1 + Crecimiento)) / (Atención Deseada / 2)
    if (promedioEntradas === 0) return 0;
    
    const factor = 1 + factorCrecimiento;
    const divisor = atencionDeseada / 2;
    const estimado = (promedioEntradas * factor) / divisor;
    
    return Math.round(estimado);
  };

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
      {/* Fechas del período o información histórica */}
      {!isLoading && datosTraficoDia && (
        <div className="p-3 bg-gray-50 border-b">
          {(datosTraficoDia.esDatoHistorico || esPromedio4Semanas()) && datosTraficoDia.semanasReferencia ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1">
                  {Array.isArray(datosTraficoDia.semanasReferencia) && datosTraficoDia.semanasReferencia.some(ref => ref.includes('Día exacto:')) ? (
                    <>
                      <BarChart3 className="w-3 h-3 text-purple-600" />
                      <span className="text-xs font-medium">Día Específico:</span>
                    </>
                  ) : Array.isArray(datosTraficoDia.semanasReferencia) && datosTraficoDia.semanasReferencia.some(ref => ref.includes('Días específicos:')) ? (
                    <>
                      <BarChart3 className="w-3 h-3 text-purple-600" />
                      <span className="text-xs font-medium">Días Específicos:</span>
                    </>
                  ) : esPromedio4Semanas() ? (
                    <>
                      <BarChart3 className="w-3 h-3 text-blue-600" />
                      <span className="text-xs font-medium">Promedio 4 Semanas:</span>
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-3 h-3 text-orange-600" />
                      <span className="text-xs font-medium">Promedio Histórico:</span>
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

      {/* Tabs para seleccionar tipo de datos */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setTabActivo('entradas')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              tabActivo === 'entradas'
                ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              <span>Entradas</span>
            </div>
          </button>
          <button
            onClick={() => setTabActivo('tickets')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              tabActivo === 'tickets'
                ? 'bg-purple-500 text-white border-b-2 border-purple-500'
                : 'text-gray-600 hover:text-purple-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Ticket className="w-3 h-3" />
              <span>Tickets</span>
            </div>
          </button>
          <button
            onClick={() => setTabActivo('euros')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              tabActivo === 'euros'
                ? 'bg-emerald-500 text-white border-b-2 border-emerald-500'
                : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Euro className="w-3 h-3" />
              <span>Euros</span>
            </div>
          </button>
        </div>
      </div>
      
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
            Total: {Object.values(datosDia).reduce((sum: number, datosHora: any) => {
              const valor = obtenerValorPorTab(datosHora);
              return sum + valor;
            }, 0)}
          </div>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {horasOrdenadas.map(hora => {
            const datosHora = datosDia[hora];
            const valor = obtenerValorPorTab(datosHora);
            const intensityColor = obtenerColorFondo(valor, tabActivo);
            
            return (
              <div 
                key={hora} 
                className={`${intensityColor} rounded-lg shadow-sm p-2 text-center`}
              >
                <div className="text-xs font-medium text-gray-600">{formatearHora(hora)}</div>
                <div className="text-base font-bold text-gray-800">{formatearValor(valor, tabActivo)}</div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Filas de Atención y Estimado - Solo para entradas */}
      {tabActivo === 'entradas' && (
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="space-y-2">
            {/* Fila de Atención por hora */}
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-xs text-green-600 font-medium mb-2 text-center">Personal Trabajando (Atención)</div>
              <div className="grid grid-cols-4 gap-1">
                {horasOrdenadas.map(hora => {
                  const personalTrabajando = calcularPersonalTrabajando(hora);
                  return (
                    <div key={`atencion-${hora}`} className="text-center">
                      <div className="text-xs text-green-600 font-medium">{formatearHora(hora)}</div>
                      <div className="text-sm font-bold text-green-700 bg-green-100 rounded py-1">{personalTrabajando}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Fila de Estimado por hora */}
            <div className="bg-orange-50 rounded-lg p-2">
              <div className="text-xs text-orange-600 font-medium mb-2 text-center">Personal Recomendado (Estimado)</div>
              <div className="grid grid-cols-4 gap-1">
                {horasOrdenadas.map(hora => {
                  const personalEstimado = calcularPersonalEstimado(hora);
                  return (
                    <div key={`estimado-${hora}`} className="text-center">
                      <div className="text-xs text-orange-600 font-medium">{formatearHora(hora)}</div>
                      <div className="text-sm font-bold text-orange-700 bg-orange-100 rounded py-1">{personalEstimado}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Totales al final */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="grid grid-cols-2 gap-3">
          <div className={`text-center p-2 rounded-lg ${
            tabActivo === 'entradas' ? 'bg-blue-50' :
            tabActivo === 'tickets' ? 'bg-purple-50' :
            'bg-emerald-50'
          }`}>
            <div className={`text-xs font-medium ${
              tabActivo === 'entradas' ? 'text-blue-600' :
              tabActivo === 'tickets' ? 'text-purple-600' :
              'text-emerald-600'
            }`}>Total Mañanas</div>
            <div className={`text-lg font-bold ${
              tabActivo === 'entradas' ? 'text-blue-700' :
              tabActivo === 'tickets' ? 'text-purple-700' :
              'text-emerald-700'
            }`}>
              {(() => {
                if (typeof datosTraficoDia.totalMañana === 'number') {
                  // Formato legacy
                  const valor = tabActivo === 'entradas' ? (datosTraficoDia.totalMañana * 7) : 0;
                  return tabActivo === 'euros' ? formatCurrency(valor) : formatNumber(valor);
                } else {
                  // Formato nuevo
                  const valor = datosTraficoDia.totalMañana[tabActivo] * 7;
                  return tabActivo === 'euros' ? formatCurrency(valor) : formatNumber(valor);
                }
              })()}
            </div>
          </div>
          <div className={`text-center p-2 rounded-lg ${
            tabActivo === 'entradas' ? 'bg-blue-50' :
            tabActivo === 'tickets' ? 'bg-purple-50' :
            'bg-emerald-50'
          }`}>
            <div className={`text-xs font-medium ${
              tabActivo === 'entradas' ? 'text-blue-600' :
              tabActivo === 'tickets' ? 'text-purple-600' :
              'text-emerald-600'
            }`}>Total Tardes</div>
            <div className={`text-lg font-bold ${
              tabActivo === 'entradas' ? 'text-blue-700' :
              tabActivo === 'tickets' ? 'text-purple-700' :
              'text-emerald-700'
            }`}>
              {(() => {
                if (typeof datosTraficoDia.totalTarde === 'number') {
                  // Formato legacy
                  const valor = tabActivo === 'entradas' ? (datosTraficoDia.totalTarde * 7) : 0;
                  return tabActivo === 'euros' ? formatCurrency(valor) : formatNumber(valor);
                } else {
                  // Formato nuevo
                  const valor = datosTraficoDia.totalTarde[tabActivo] * 7;
                  return tabActivo === 'euros' ? formatCurrency(valor) : formatNumber(valor);
                }
              })()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Leyenda de intensidad */}
      <IntensityLegend />
    </div>
  );
} 