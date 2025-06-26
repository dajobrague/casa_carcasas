'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Option } from '@/components/ui/Select';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  obtenerActividadesDiarias, 
  obtenerDatosTienda, 
  ActividadDiariaRecord,
  TiendaSupervisorRecord,
  opcionesDropdown
} from '@/lib/airtable';
import { 
  generarColumnasTiempo, 
  calcularHorasEfectivasDiarias,
  getBackgroundColor,
  DatosTraficoDia,
  calcularPersonalEstimado,
  generarDatosTraficoEjemplo
} from '@/lib/utils';
import { obtenerDatosTrafico, obtenerDatosTraficoConLogicaHistorica } from '@/lib/api';
import { obtenerSemanasHistoricas } from '@/lib/airtable';
import { obtenerDiaSemana } from '@/lib/historical-traffic';
import { 
  HoursIndicatorsViewDesktop,
  ScheduleTableDetailedView,
  TrafficTableDetailedView
} from '@/components/calendar/view';
import logger from '@/lib/logger';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';

// Tipo para las opciones del dropdown
interface DropdownOption {
  value: string;
  label: string;
  color?: string;
}

interface DayViewDesktopProps {
  isOpen: boolean;
  onClose: () => void;
  diaId: string | null;
  fecha: Date | null;
  storeRecordId: string | null;
  horasEfectivasSemanalesIniciales: number;
}

export function DayViewDesktop({ 
  isOpen, 
  onClose, 
  diaId,
  fecha,
  storeRecordId,
  horasEfectivasSemanalesIniciales
}: DayViewDesktopProps) {
  // Obtener datos de la tienda para el debug
  const { esHistorica } = useAuth();
  
  // Estados para datos
  const [actividades, setActividades] = useState<ActividadDiariaRecord[]>([]);
  const [tiendaData, setTiendaData] = useState<TiendaSupervisorRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columnasTiempo, setColumnasTiempo] = useState<string[]>([]);
  const [horasEfectivasDiarias, setHorasEfectivasDiarias] = useState(0);
  const [horasEfectivasSemanales, setHorasEfectivasSemanales] = useState(horasEfectivasSemanalesIniciales || 0);
  const [horasAprobadasSemanales, setHorasAprobadasSemanales] = useState(0);
  
  // Estados para datos de tráfico con lazy loading
  const [datosTraficoDia, setDatosTraficoDia] = useState<DatosTraficoDia | null>(null);
  const [traficoLoading, setTraficoLoading] = useState(false);
  const [traficoError, setTraficoError] = useState<string | null>(null);
  const [traficoExpandido, setTraficoExpandido] = useState(false);
  const [traficoYaCargado, setTraficoYaCargado] = useState(false);

  // Función para formatear la fecha en el título del modal
  const formatearFechaParaTitulo = (fecha: Date | null) => {
    if (!fecha) return 'Día seleccionado';
    
    const fechaBase = fecha.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
    const debugHistorica = esHistorica !== null ? ` | Tienda Histórica: ${esHistorica ? 'true' : 'false'}` : '';
    
    return `${fechaBase}${debugHistorica}`;
  };

  // Función para cargar datos principales (sin datos de tráfico)
  const cargarDatosPrincipales = useCallback(async () => {
    if (!diaId || !storeRecordId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Cargar datos de tienda
      const datosTienda = await obtenerDatosTienda(storeRecordId);
      setTiendaData(datosTienda);
      
      // Cargar actividades diarias y ordenarlas
      const actividadesDiarias = await obtenerActividadesDiarias(storeRecordId, diaId);
      // Ordenar actividades por nombre (con VACANTE al final)
      const actividadesOrdenadas = [...actividadesDiarias].sort((a, b) => {
        const nombreA = (a.fields.Nombre || a.fields.Name || '').toString().toUpperCase();
        const nombreB = (b.fields.Nombre || b.fields.Name || '').toString().toUpperCase();
        
        if (nombreA === 'VACANTE') return 1;
        if (nombreB === 'VACANTE') return -1;
        
        return nombreA.localeCompare(nombreB);
      });
      setActividades(actividadesOrdenadas);
      
      // Inicializar HE semanales con el valor proporcionado
      setHorasEfectivasSemanales(horasEfectivasSemanalesIniciales || 0);
      
      // Generar columnas de tiempo
      let columnas: string[] = [];
      if (datosTienda?.fields.PAIS && datosTienda.fields.Apertura && datosTienda.fields.Cierre) {
        columnas = generarColumnasTiempo(
          datosTienda.fields.PAIS,
          datosTienda.fields.Apertura,
          datosTienda.fields.Cierre
        );
        setColumnasTiempo(columnas);
      }
      
      // Calcular horas efectivas diarias
      const horasEfectivas = calcularHorasEfectivasDiarias(
        actividadesOrdenadas,
        {
          PAIS: datosTienda?.fields.PAIS || '',
          Apertura: datosTienda?.fields.Apertura || '',
          Cierre: datosTienda?.fields.Cierre || ''
        }
      );
      setHorasEfectivasDiarias(horasEfectivas);
      
      // Establecer horas aprobadas semanales
      if (datosTienda?.fields['Horas Aprobadas']) {
        setHorasAprobadasSemanales(datosTienda.fields['Horas Aprobadas']);
      }
      
    } catch (err) {
      logger.error('Error al cargar datos principales:', err);
      setError('Error al cargar los datos. Por favor, inténtelo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [diaId, storeRecordId, horasEfectivasSemanalesIniciales]);

  // Función auxiliar para intentar obtener datos de tráfico histórico
  const intentarCargarTraficoHistorico = useCallback(async (): Promise<any> => {
    logger.log(`🔍 Debug histórico - diaId: ${diaId}, storeRecordId: ${storeRecordId}, fecha: ${fecha}, esHistorica: ${esHistorica}`);
    
    if (!diaId || !storeRecordId || !fecha || esHistorica !== true) {
      logger.log(`❌ Condiciones no cumplidas para lógica histórica`);
      return null;
    }
    
    try {
      logger.log('🏛️ Detectada tienda histórica, verificando configuración...');
      
      // Determinar la fecha del día
      const fechaStr = fecha.toISOString().split('T')[0];
      const diaSemana = obtenerDiaSemana(fechaStr);
      
      // Calcular la semana objetivo basado en la fecha
      const { obtenerFormatoSemana } = await import('@/lib/airtable');
      const semanaObjetivo = obtenerFormatoSemana(fecha);
      
      logger.log(`📅 Procesando fecha: ${fechaStr} (${diaSemana}), semana objetivo: ${semanaObjetivo}`);
      
      // Usar la función con lógica histórica incluyendo semana objetivo
      const resultado = await obtenerDatosTraficoConLogicaHistorica(
        diaId as string,
        storeRecordId as string,
        true, // Es histórica
        fechaStr,
        semanaObjetivo // Pasar la semana objetivo
      );
      
      if (resultado && 'esDatoHistorico' in resultado && resultado.esDatoHistorico) {
        logger.log(`✅ Datos de tráfico histórico obtenidos exitosamente para semana ${semanaObjetivo}`);
        return resultado;
      } else {
        logger.log(`📊 No se obtuvieron datos históricos para semana ${semanaObjetivo}, usando fallback`);
        return null;
      }
      
    } catch (error) {
      logger.error('❌ Error al intentar cargar tráfico histórico:', error);
      return null;
    }
  }, [diaId, storeRecordId, fecha, esHistorica]);

  // Función para cargar datos de tráfico (separada para lazy loading)
  const cargarDatosTrafico = useCallback(async () => {
    if (!diaId || !storeRecordId || !columnasTiempo.length) return;
    
    setTraficoLoading(true);
    setTraficoError(null);
    
    try {
      logger.log('Iniciando obtención de datos de tráfico para el día:', diaId);
      
      // ADDON: Intentar primero con lógica histórica si es aplicable
      let datosTraficoDiaAPI = await intentarCargarTraficoHistorico();
      
      // Si no se obtuvieron datos históricos, usar lógica estándar (comportamiento original)
      if (!datosTraficoDiaAPI) {
        logger.log('📊 Usando lógica estándar de tráfico');
        datosTraficoDiaAPI = await obtenerDatosTrafico(
          diaId as string, 
          storeRecordId as string
        );
      }
      
      const datosTraficoDiaFinal = datosTraficoDiaAPI || generarDatosTraficoEjemplo(columnasTiempo);
      setDatosTraficoDia(datosTraficoDiaFinal);
      
    } catch (error) {
      logger.error('Error al cargar datos de tráfico:', error);
      setDatosTraficoDia(generarDatosTraficoEjemplo(columnasTiempo));
      setTraficoError('No se pudieron cargar los datos de tráfico reales. Mostrando datos simulados.');
    } finally {
      setTraficoLoading(false);
      setTraficoYaCargado(true);
    }
  }, [diaId, storeRecordId, columnasTiempo, intentarCargarTraficoHistorico]);

  // Función para alternar la sección de tráfico
  const toggleTrafico = useCallback(() => {
    const nuevoEstado = !traficoExpandido;
    setTraficoExpandido(nuevoEstado);
    
    // Cargar datos de tráfico si se está expandiendo y no se han cargado aún
    if (nuevoEstado && !traficoYaCargado) {
      cargarDatosTrafico();
    }
  }, [traficoExpandido, traficoYaCargado, cargarDatosTrafico]);

  // Cargar datos principales cuando se abre el modal
  useEffect(() => {
    if (isOpen && diaId && storeRecordId) {
      cargarDatosPrincipales();
    }
  }, [isOpen, diaId, storeRecordId, cargarDatosPrincipales]);

  // Opciones para los dropdowns con formato correcto
  const options: DropdownOption[] = [
    { value: '', label: 'Seleccionar...', color: '#E5E7EB' }, // Opción vacía con etiqueta clara
    ...opcionesDropdown.map(opcion => ({
      value: opcion,
      label: opcion,
      color: opcion === 'TRABAJO' ? '#10B981' : // verde
             opcion === 'VACACIONES' ? '#3B82F6' : // azul
             opcion === 'LIBRE' ? '#EF4444' : // rojo
             opcion === 'BAJA MÉDICA' ? '#8B5CF6' : // púrpura
             opcion === 'FORMACIÓN' ? '#F97316' : // naranja
             opcion === 'LACTANCIA' ? '#EC4899' : // rosa
             '#9CA3AF' // gris por defecto
    }))
  ];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={formatearFechaParaTitulo(fecha)}
      size="full"
      className="max-h-[95vh] max-w-[95vw] w-full mx-auto overflow-hidden flex flex-col"
    >
      <div className="space-y-3 w-full mx-auto overflow-y-auto p-3 pt-2 flex-grow">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg text-center">
            <p className="font-medium">Error al cargar los datos</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : (
          <>
            {/* Indicadores de Horas */}
            <HoursIndicatorsViewDesktop
              horasEfectivasDiarias={horasEfectivasDiarias}
              horasAprobadasSemanales={horasAprobadasSemanales}
              horasEfectivasSemanales={horasEfectivasSemanales}
            />

            {/* Tabla de Horarios con vista detallada */}
            <ScheduleTableDetailedView
              actividades={actividades}
              columnasTiempo={columnasTiempo}
              options={options}
              isLoading={isLoading}
              error={error}
            />

            {/* Tabla de Tráfico con vista detallada y lazy loading */}
            <div className="bg-white rounded-xl shadow-sm">
              <div 
                className="flex justify-between items-center p-4 border-b border-gray-100 cursor-pointer"
                onClick={toggleTrafico}
              >
                <h3 className="text-xl font-semibold text-gray-800">Tráfico por Hora</h3>
                <div className="flex items-center">
                  {!traficoYaCargado && !traficoExpandido && (
                    <span className="text-sm text-gray-500 mr-2">Clic para cargar datos</span>
                  )}
                  {traficoExpandido ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>
              
              {traficoExpandido && (
                <TrafficTableDetailedView
                  datosTraficoDia={datosTraficoDia}
                  isLoading={traficoLoading}
                  error={traficoError}
                />
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
} 