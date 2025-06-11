'use client';

import React, { useState, useEffect } from 'react';
import { obtenerDatosTienda, ActividadDiariaRecord, TiendaSupervisorRecord } from '@/lib/airtable';
import { DatosTraficoDia } from '@/lib/utils';
import { SkeletonTable } from '@/components/ui/Skeleton';

interface TrafficTableProps {
  datosTraficoDia: DatosTraficoDia | null;
  isLoading?: boolean;
  error?: string | null;
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

  // Función para obtener la atención deseada (es un valor fijo por día, no se calcula)
  const calcularPersonalTrabajando = (hora: string): number => {
    return atencionDeseada;
  };

  // Función para calcular personal estimado (recomendado) por hora
  const calcularPersonalEstimado = (hora: string): number => {
    if (!datosTraficoDia || !datosTraficoDia.datosPorDia) {
      return 0;
    }
    
    // Obtener promedio de entradas para esta hora en todos los días
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    let totalEntradas = 0;
    let diasConDatos = 0;
    
    diasSemana.forEach(dia => {
      if (datosTraficoDia.datosPorDia && 
          datosTraficoDia.datosPorDia[dia as keyof typeof datosTraficoDia.datosPorDia] && 
          datosTraficoDia.datosPorDia[dia as keyof typeof datosTraficoDia.datosPorDia][hora]) {
        const entradas = datosTraficoDia.datosPorDia[dia as keyof typeof datosTraficoDia.datosPorDia][hora];
        totalEntradas += entradas;
        diasConDatos++;
      }
    });
    
    const promedioEntradas = diasConDatos > 0 ? totalEntradas / diasConDatos : 0;
    
    // Aplicar fórmula: (Entradas * (1 + Crecimiento)) / (Atención Deseada / 2)
    if (promedioEntradas === 0) {
      return 0;
    }
    
    const factor = 1 + factorCrecimiento;
    const divisor = atencionDeseada / 2;
    const estimado = (promedioEntradas * factor) / divisor;
    
    return Math.round(estimado);
  };

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
        {(!isLoading && datosTraficoDia?.fechaInicio && datosTraficoDia?.fechaFin) && (
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
          {/* Usar el componente SkeletonTable para mostrar un esqueleto de tabla durante la carga */}
          <SkeletonTable rows={7} columns={12} />
          
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
              {/* Fila de Atención (Personal Trabajando) */}
              <tr className="bg-green-50">
                <td className="px-3 py-2 text-sm font-semibold text-green-700 border-t border-gray-200 whitespace-nowrap">ATENCIÓN:</td>
                {getHorasOrdenadas(datosTraficoDia.datosPorDia).map(hora => {
                  const personalTrabajando = calcularPersonalTrabajando(hora);
                  return (
                    <td 
                      key={`atencion-${hora}`} 
                      className="w-14 border-t border-gray-200 border-l border-gray-200 p-1"
                      style={{ width: '3.5rem' }}
                    >
                      <div className="text-center text-sm font-medium text-green-700 bg-green-100 rounded py-1 px-0 shadow-sm">
                        {personalTrabajando}
                      </div>
                    </td>
                  );
                })}
              </tr>
              
              {/* Fila de Estimado (Personal Recomendado) */}
              <tr className="bg-orange-50">
                <td className="px-3 py-2 text-sm font-semibold text-orange-700 border-t border-gray-200 whitespace-nowrap">ESTIMADO:</td>
                {getHorasOrdenadas(datosTraficoDia.datosPorDia).map(hora => {
                  const personalEstimado = calcularPersonalEstimado(hora);
                  return (
                    <td 
                      key={`estimado-${hora}`} 
                      className="w-14 border-t border-gray-200 border-l border-gray-200 p-1"
                      style={{ width: '3.5rem' }}
                    >
                      <div className="text-center text-sm font-medium text-orange-700 bg-orange-100 rounded py-1 px-0 shadow-sm">
                        {personalEstimado}
                      </div>
                    </td>
                  );
                })}
              </tr>
              
              {/* Fila de totales al final */}
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