'use client';

import React, { useState, useEffect } from 'react';
import { obtenerDatosTienda, ActividadDiariaRecord, TiendaSupervisorRecord } from '@/lib/airtable';
import { DatosTraficoDia } from '@/lib/utils';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Users, Ticket, Euro, BarChart3 } from 'lucide-react';

interface TrafficTableProps {
  datosTraficoDia: DatosTraficoDia | null;
  isLoading?: boolean;
  error?: string | null;
  actividades?: ActividadDiariaRecord[];
  storeRecordId?: string;
  fecha?: Date;
}

type TabType = 'entradas' | 'tickets' | 'euros';

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
  
  // Estado para el tab activo
  const [tabActivo, setTabActivo] = useState<TabType>('entradas');

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
        const datosHora = datosTraficoDia.datosPorDia[dia as keyof typeof datosTraficoDia.datosPorDia][hora];
        // Manejar tanto formato nuevo como legacy
        const entradas = typeof datosHora === 'number' ? datosHora : datosHora.entradas;
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

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-2 sm:mb-0">Tráfico por Hora</h3>
        {(!isLoading && datosTraficoDia) && (
          <div className="flex flex-wrap items-center gap-2 text-gray-600">
            {datosTraficoDia.esDatoHistorico && datosTraficoDia.semanasReferencia ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium">Promedio Histórico:</span>
                  </div>
                  <span className="text-sm bg-orange-50 px-2 py-1 rounded-full text-orange-700 font-medium">
                    {datosTraficoDia.semanasReferencia}
                  </span>
                </div>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                  Año anterior
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

      {/* Tabs para seleccionar tipo de datos */}
      {!isLoading && !error && datosTraficoDia && (
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setTabActivo('entradas')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tabActivo === 'entradas'
                ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>Entradas</span>
            </div>
          </button>
          <button
            onClick={() => setTabActivo('tickets')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tabActivo === 'tickets'
                ? 'bg-purple-500 text-white border-b-2 border-purple-500'
                : 'text-gray-600 hover:text-purple-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Ticket className="w-4 h-4" />
              <span>Tickets</span>
            </div>
          </button>
          <button
            onClick={() => setTabActivo('euros')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tabActivo === 'euros'
                ? 'bg-emerald-500 text-white border-b-2 border-emerald-500'
                : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Euro className="w-4 h-4" />
              <span>Euros</span>
            </div>
          </button>
        </div>
      )}
      
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
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 w-24">
                    {tabActivo === 'entradas' ? 'Entradas' : tabActivo === 'tickets' ? 'Tickets' : 'Euros'}
                  </th>
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
                        const datosHora = horas[hora];
                        const valor = obtenerValorPorTab(datosHora);
                        const bgColor = obtenerColorFondo(valor, tabActivo);
                        
                        return (
                          <td 
                            key={hora} 
                            className={`px-0 py-2 text-center text-xs font-medium border-b border-gray-200 border-l border-gray-200 ${bgColor}`}
                          >
                            {formatearValor(valor, tabActivo)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Solo mostrar filas de cálculo para entradas */}
              {tabActivo === 'entradas' && (
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
                </tfoot>
              )}
            </table>
          </div>
          
          {/* Totales dinámicos según el tab activo */}
          <div className="bg-gray-50 px-4 py-3 rounded-lg">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600">Total Mañanas:</span>
                <span className={`px-3 py-1 rounded-full font-bold ${
                  tabActivo === 'entradas' ? 'bg-blue-100 text-blue-700' :
                  tabActivo === 'tickets' ? 'bg-purple-100 text-purple-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {(() => {
                    if (typeof datosTraficoDia.totalMañana === 'number') {
                      // Formato legacy
                      return tabActivo === 'entradas' ? (datosTraficoDia.totalMañana * 7) : 0;
                    } else {
                      // Formato nuevo
                      const valor = datosTraficoDia.totalMañana[tabActivo] * 7;
                      return tabActivo === 'euros' ? `€${valor.toFixed(2)}` : valor;
                    }
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600">Total Tardes:</span>
                <span className={`px-3 py-1 rounded-full font-bold ${
                  tabActivo === 'entradas' ? 'bg-blue-100 text-blue-700' :
                  tabActivo === 'tickets' ? 'bg-purple-100 text-purple-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {(() => {
                    if (typeof datosTraficoDia.totalTarde === 'number') {
                      // Formato legacy
                      return tabActivo === 'entradas' ? (datosTraficoDia.totalTarde * 7) : 0;
                    } else {
                      // Formato nuevo
                      const valor = datosTraficoDia.totalTarde[tabActivo] * 7;
                      return tabActivo === 'euros' ? `€${valor.toFixed(2)}` : valor;
                    }
                  })()}
                </span>
              </div>
            </div>
          </div>
          
          {/* Leyenda de colores dinámica */}
          <div className="flex flex-wrap gap-2 justify-center p-3 bg-gray-50 rounded-lg">
            {tabActivo === 'entradas' ? (
              <>
                <span className="px-2 py-1 bg-blue-50 text-xs font-medium text-gray-700 rounded-full shadow-sm">0-10</span>
                <span className="px-2 py-1 bg-blue-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">10-20</span>
                <span className="px-2 py-1 bg-green-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">20-30</span>
                <span className="px-2 py-1 bg-green-200 text-xs font-medium text-gray-700 rounded-full shadow-sm">30-40</span>
                <span className="px-2 py-1 bg-yellow-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">40-50</span>
                <span className="px-2 py-1 bg-yellow-200 text-xs font-medium text-gray-700 rounded-full shadow-sm">50-60</span>
                <span className="px-2 py-1 bg-orange-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">60-70</span>
                <span className="px-2 py-1 bg-orange-200 text-xs font-medium text-gray-700 rounded-full shadow-sm">70-80</span>
                <span className="px-2 py-1 bg-red-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">80+</span>
              </>
            ) : tabActivo === 'tickets' ? (
              <>
                <span className="px-2 py-1 bg-purple-50 text-xs font-medium text-gray-700 rounded-full shadow-sm">0-5</span>
                <span className="px-2 py-1 bg-purple-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">5-10</span>
                <span className="px-2 py-1 bg-purple-200 text-xs font-medium text-gray-700 rounded-full shadow-sm">10-15</span>
                <span className="px-2 py-1 bg-purple-300 text-xs font-medium text-gray-700 rounded-full shadow-sm">15-20</span>
                <span className="px-2 py-1 bg-purple-400 text-xs font-medium text-white rounded-full shadow-sm">20+</span>
              </>
            ) : (
              <>
                <span className="px-2 py-1 bg-emerald-50 text-xs font-medium text-gray-700 rounded-full shadow-sm">€0-100</span>
                <span className="px-2 py-1 bg-emerald-100 text-xs font-medium text-gray-700 rounded-full shadow-sm">€100-200</span>
                <span className="px-2 py-1 bg-emerald-200 text-xs font-medium text-gray-700 rounded-full shadow-sm">€200-300</span>
                <span className="px-2 py-1 bg-emerald-300 text-xs font-medium text-gray-700 rounded-full shadow-sm">€300-400</span>
                <span className="px-2 py-1 bg-emerald-400 text-xs font-medium text-white rounded-full shadow-sm">€400+</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 