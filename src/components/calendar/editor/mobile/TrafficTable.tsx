'use client';

import React, { useState, useEffect } from 'react';
import { obtenerDatosTienda, ActividadDiariaRecord, TiendaSupervisorRecord } from '@/lib/airtable';
import { DatosTraficoDia } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

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
        totalEntradas += datosTraficoDia.datosPorDia[dia as keyof typeof datosTraficoDia.datosPorDia][hora];
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
      {/* Fechas del período */}
      {datosTraficoDia?.fechaInicio && datosTraficoDia?.fechaFin && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg shadow-sm">
          <div className="flex items-center">
            <span className="text-xs font-medium uppercase text-gray-600">Inicio:</span>
            <span className="text-xs bg-blue-50 px-2 py-0.5 rounded-full ml-1">{datosTraficoDia.fechaInicio}</span>
          </div>
          <div className="flex items-center">
            <span className="text-xs font-medium uppercase text-gray-600">Fin:</span>
            <span className="text-xs bg-blue-50 px-2 py-0.5 rounded-full ml-1">{datosTraficoDia.fechaFin}</span>
          </div>
        </div>
      )}
      
      {/* Selector de día */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="mb-2 text-sm font-medium text-gray-700">Seleccionar día:</div>
        <div className="flex overflow-x-auto pb-2 gap-1 hide-scrollbar">
          {diasDisponibles.map(dia => (
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
              {diasSemana[dia as keyof typeof diasSemana] || dia}
            </button>
          ))}
        </div>
      </div>
      
      {/* Datos de tráfico para el día seleccionado */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="mb-2 flex justify-between items-center">
          <h4 className="text-sm font-medium text-gray-700">
            Tráfico para {diasSemana[diaActual as keyof typeof diasSemana] || diaActual}:
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
      
      {/* Filas de Atención y Estimado */}
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
      
      {/* Totales al final */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 font-medium">Total Mañanas</div>
            <div className="text-lg font-bold text-blue-700">{datosTraficoDia.totalMañana * 7}</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 font-medium">Total Tardes</div>
            <div className="text-lg font-bold text-blue-700">{datosTraficoDia.totalTarde * 7}</div>
          </div>
        </div>
      </div>
      
      {/* Leyenda de intensidad */}
      <IntensityLegend />
    </div>
  );
} 