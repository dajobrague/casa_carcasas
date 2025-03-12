'use client';

import React, { useState, useEffect } from 'react';
import { YearView } from '@/components/calendar/YearView';
import { MonthView } from '@/components/calendar/MonthView';
import { MonthSummaryView } from '@/components/calendar/MonthSummaryView';
import { DayModal } from '@/components/calendar/DayModal';
import { ScheduleProvider, useSchedule } from '@/context/ScheduleContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { SemanasLaboralesRecord } from '@/lib/airtable';

// Componente principal
function ScheduleManager() {
  const { storeRecordId, setStoreRecordId, isLoading, error } = useSchedule();
  const [view, setView] = useState<'year' | 'month' | 'monthSummary'>('year');
  const [selectedMonth, setSelectedMonth] = useState<{ mes: string; año: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ id: string; fecha: Date; horasEfectivasSemanales: number } | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  
  // Nuevo estado para almacenar las horas efectivas actualizadas
  const [horasEfectivasActualizadas, setHorasEfectivasActualizadas] = useState<{
    dias: { [diaId: string]: number };
    semanas: { [semanaId: string]: number };
  }>({
    dias: {},
    semanas: {}
  });

  // Function to get store ID from URL parameters
  function getStoreRecordIdFromURL(): string | null {
    if (typeof window === 'undefined') return null; // Check if we're in browser environment
    
    // Get the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get('storeId');
    
    if (storeId) {
      console.log('Found store record ID in URL:', storeId);
      return storeId;
    }
    
    console.error('Could not find store record ID in URL parameters');
    return null;
  }

  // Monitorear cambios en las horas efectivas
  useEffect(() => {
    console.log("ScheduleManager - horasEfectivasActualizadas cambió:", horasEfectivasActualizadas);
  }, [horasEfectivasActualizadas]);

  // Efecto para obtener el ID de la tienda desde los parámetros URL
  useEffect(() => {
    // Intentar obtener el ID de la tienda desde la URL
    const urlStoreId = getStoreRecordIdFromURL();
    
    if (urlStoreId) {
      console.log('Usando Store ID de los parámetros URL:', urlStoreId);
      setStoreRecordId(urlStoreId);
    } else {
      console.error('No se pudo encontrar el ID de la tienda en los parámetros URL');
      // No podemos usar setError directamente porque no está expuesto en el contexto
      // La aplicación mostrará un estado de error genérico al no tener storeRecordId
    }
  }, [setStoreRecordId]);

  // Manejar selección de mes
  const handleSelectMonth = (mes: string, año: string) => {
    setSelectedMonth({ mes, año });
    setView('month');
  };

  // Manejar vista de resumen mensual
  const handleViewMonthSummary = (mes: string, año: string) => {
    setSelectedMonth({ mes, año });
    setView('monthSummary');
  };

  // Volver a la vista de año
  const handleBackToYear = () => {
    setView('year');
    setSelectedMonth(null);
  };

  // Volver de la vista de resumen mensual a la vista de mes
  const handleBackToMonth = () => {
    setView('month');
  };

  // Manejar selección de día
  const handleSelectDay = (diaId: string, fecha: Date, horasEfectivasSemanales: number = 0) => {
    // Si hay horas efectivas actualizadas, usarlas
    const lastUpdatedHoras = horasEfectivasActualizadas.semanas['lastUpdated'];
    
    // Si tenemos un valor lastUpdated y es la primera vez que seleccionamos un día
    // después de una actualización, usar ese valor en lugar del proporcionado
    if (lastUpdatedHoras !== undefined && !selectedDay) {
      horasEfectivasSemanales = lastUpdatedHoras;
      
      // Eliminar el valor lastUpdated para no usarlo nuevamente
      const newSemanas = { ...horasEfectivasActualizadas.semanas };
      delete newSemanas['lastUpdated'];
      
      setHorasEfectivasActualizadas({
        ...horasEfectivasActualizadas,
        semanas: newSemanas
      });
    }
    
    setSelectedDay({ id: diaId, fecha, horasEfectivasSemanales });
    setIsDayModalOpen(true);
  };

  // Manejar el cierre del modal con valores actualizados
  const handleDayModalCloseWithUpdates = (diaId: string, horasEfectivasDia: number, horasEfectivasSemanales: number) => {
    // Este método se llama cuando se cierra el modal del día con cambios
    // El flujo de actualización es el siguiente:
    // 1. Guardamos las horas efectivas actualizadas del día
    // 2. Guardamos las horas efectivas actualizadas de la semana
    // 3. La próxima vez que se abra un día, se usarán estos valores actualizados
    
    // 1. Actualizar las horas efectivas del día
    const updatedDias = {
      ...horasEfectivasActualizadas.dias,
      [diaId]: horasEfectivasDia
    };
    
    // 2. Determinar a qué semana pertenece este día
    // Utilizamos el localStorage donde guardamos la relación día-semana
    let semanaId: string | null = window.localStorage.getItem(`dia_semana_${diaId}`);
    
    // 3. Actualizar las horas efectivas de la semana
    const updatedSemanas = {
      ...horasEfectivasActualizadas.semanas
    };
    
    if (semanaId) {
      // Si sabemos a qué semana pertenece el día, actualizamos directamente
      updatedSemanas[semanaId] = horasEfectivasSemanales;
      console.log(`Actualizando horas efectivas para semana ${semanaId}: ${horasEfectivasSemanales}`);
    } else {
      // Si no sabemos la semana, guardamos en lastUpdated como respaldo
      updatedSemanas['lastUpdated'] = horasEfectivasSemanales;
      console.log(`No se pudo identificar la semana para día ${diaId}. Guardando valor en lastUpdated: ${horasEfectivasSemanales}`);
    }
    
    // 4. Actualizar el estado con los nuevos valores
    setHorasEfectivasActualizadas({
      dias: updatedDias,
      semanas: updatedSemanas
    });
    
    // 5. Si tenemos el día seleccionado, actualizar sus horas efectivas
    if (selectedDay && selectedDay.id === diaId) {
      setSelectedDay({
        ...selectedDay,
        horasEfectivasSemanales: horasEfectivasSemanales
      });
    }
    
    // 6. Log para debug
    console.log("Datos actualizados al cerrar el modal:", {
      diaId, 
      horasEfectivasDia, 
      horasEfectivasSemanales,
      semanaAsociada: semanaId
    });
  };

  // Cerrar modal de día
  const handleCloseDayModal = () => {
    setIsDayModalOpen(false);
  };

  // Generar PDF
  const handleGeneratePdf = async (semanaId: string, semanaName: string, semana?: SemanasLaboralesRecord) => {
    try {
      // Verificar que tengamos un ID de tienda válido
      if (!storeRecordId) {
        throw new Error('No hay una tienda seleccionada. Por favor, seleccione una tienda primero.');
      }
      
      // Actualizar estado de carga
      setIsPdfLoading(true);
      
      // Importación dinámica para reducir el tamaño del bundle inicial
      const { generarYMostrarPDFSemana } = await import('@/lib/pdf');
      
      // Utilizar nuestra función completa para generar y mostrar el PDF
      // Usar el objeto semana directamente si está disponible, o el ID en caso contrario
      await generarYMostrarPDFSemana(semana || semanaId, storeRecordId, setIsPdfLoading);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert(`Error al generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setIsPdfLoading(false);
    }
  };

  // Renderizar vista según el estado
  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-600">Cargando...</span>
          </div>
        </div>
      );
    }

    // Si no hay un storeRecordId, mostrar un mensaje específico
    if (!storeRecordId) {
      return (
        <div className="bg-red-50 text-red-600 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-3">No se pudo encontrar el ID de la tienda</h3>
          <p className="mb-4">
            Esta aplicación necesita recibir el ID de la tienda a través del parámetro "storeId" en la URL.
            Por favor, asegúrese de que la URL incluya este parámetro.
          </p>
          <p className="text-sm text-gray-700">
            Ejemplo: <code>https://tu-app.vercel.app/?storeId=recXXXXXXXXXXXXXX</code>
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <h3 className="text-lg font-medium">Error</h3>
          <p>{error}</p>
        </div>
      );
    }

    if (view === 'monthSummary' && selectedMonth) {
      return (
        <MonthSummaryView
          mes={selectedMonth.mes}
          año={selectedMonth.año}
          onBack={handleBackToMonth}
        />
      );
    }

    if (view === 'month' && selectedMonth) {
      return (
        <MonthView
          mes={selectedMonth.mes}
          año={selectedMonth.año}
          onBack={handleBackToYear}
          onSelectDay={handleSelectDay}
          onGeneratePdf={handleGeneratePdf}
          horasEfectivasActualizadas={horasEfectivasActualizadas}
          onViewMonthSummary={handleViewMonthSummary}
        />
      );
    }

    return <YearView onSelectMonth={handleSelectMonth} />;
  };

  return (
    <div className="lcdc-schedule min-h-screen bg-gray-50">
      {/* Header */}
      <div className="lcdc-header bg-white shadow-sm">
        <div className="lcdc-header-container max-w-7xl mx-auto px-4 py-4">
          <div className="lcdc-header-content flex items-center justify-between">
            <div className="lcdc-header-left flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Gestor de Horarios
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lcdc-main max-w-7xl mx-auto px-4 py-8">
        {renderView()}
      </div>

      {/* Modal para el día seleccionado */}
      {selectedDay && (
        <DayModal 
          isOpen={isDayModalOpen} 
          onClose={handleCloseDayModal} 
          diaId={selectedDay.id} 
          fecha={selectedDay.fecha} 
          storeRecordId={storeRecordId} 
          horasEfectivasSemanalesIniciales={selectedDay.horasEfectivasSemanales}
          onCloseWithUpdatedHours={handleDayModalCloseWithUpdates}
        />
      )}
      
      {/* Overlay de carga para generación de PDF */}
      {isPdfLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Generando PDF</h3>
            <p className="text-sm text-gray-500">Esto puede tardar unos momentos...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Página principal con Provider
export default function Home() {
  return (
    <ScheduleProvider>
      <ScheduleManager />
    </ScheduleProvider>
  );
} 