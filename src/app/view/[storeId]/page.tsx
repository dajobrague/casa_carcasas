'use client';

import React, { useState, useEffect } from 'react';
import { YearView, MonthView, MonthSummaryView, MonthViewMobile } from '@/components/calendar';
import { DayViewMobile, DayViewDesktop } from '@/components/calendar/view';
import { ScheduleProvider, useSchedule } from '@/context/ScheduleContext';
import { SemanasLaboralesRecord } from '@/lib/airtable';
import { useParams } from 'next/navigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Componente principal de la vista
function ScheduleViewer() {
  const { storeRecordId, setStoreRecordId, isLoading, error } = useSchedule();
  const [view, setView] = useState<'year' | 'month' | 'monthSummary'>('year');
  const [selectedMonth, setSelectedMonth] = useState<{ mes: string; año: string } | null>(null);
  
  // Estado para el modal del día
  const [selectedDay, setSelectedDay] = useState<{
    diaId: string;
    fecha: Date;
    horasEfectivas: number;
  } | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  
  // Media query para detectar tamaño móvil (menos de 640px)
  const isMobile = useMediaQuery('(max-width: 639px)');
  
  // Obtener el storeId desde los parámetros de la ruta
  const params = useParams<{ storeId: string }>();
  
  // Establecer el storeId cuando se monte el componente
  useEffect(() => {
    if (params.storeId) {
      setStoreRecordId(params.storeId);
    }
  }, [params.storeId, setStoreRecordId]);

  // Gestionar la navegación entre vistas
  const handleSelectMonth = (mes: string, año: string) => {
    setSelectedMonth({ mes, año });
    setView('month');
  };

  const handleBack = () => {
    if (view === 'month' || view === 'monthSummary') {
      setView('year');
    }
  };

  const handleViewMonthSummary = (mes: string, año: string) => {
    setSelectedMonth({ mes, año });
    setView('monthSummary');
  };

  // Placeholder function for generating PDF - not implemented in view-only mode
  const handleGeneratePdf = (semanaId: string, semanaName: string, semana?: SemanasLaboralesRecord) => {
    console.log('PDF generation not available in view-only mode');
  };

  // Actualizar la función handleSelectDay para abrir el modal
  const handleSelectDay = (diaId: string, fecha: Date, horasEfectivas: number) => {
    setSelectedDay({ diaId, fecha, horasEfectivas });
    setIsDayModalOpen(true);
  };

  // Función para cerrar el modal del día
  const handleCloseDayModal = () => {
    setIsDayModalOpen(false);
  };

  // Mostrar mensaje de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 max-w-md mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Cargando datos</h2>
          <p className="text-gray-500">Por favor espere mientras cargamos la información de la tienda...</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje de error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 max-w-md mx-auto bg-red-50 rounded-lg shadow">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error al cargar datos</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600 text-sm">Por favor, intente nuevamente más tarde o contacte al administrador.</p>
        </div>
      </div>
    );
  }

  // Renderizar la vista seleccionada
  return (
    <div className="container mx-auto px-4 py-8">
      {view === 'year' && (
        <YearView onSelectMonth={handleSelectMonth} />
      )}

      {view === 'month' && selectedMonth && (
        isMobile ? (
          <MonthViewMobile
            mes={selectedMonth.mes}
            año={selectedMonth.año}
            onBack={handleBack}
            onSelectDay={handleSelectDay}
            onGeneratePdf={handleGeneratePdf}
            onViewMonthSummary={handleViewMonthSummary}
          />
        ) : (
          <MonthView
            mes={selectedMonth.mes}
            año={selectedMonth.año}
            onBack={handleBack}
            onSelectDay={handleSelectDay}
            onGeneratePdf={handleGeneratePdf}
            onViewMonthSummary={handleViewMonthSummary}
          />
        )
      )}

      {view === 'monthSummary' && selectedMonth && (
        <MonthSummaryView
          mes={selectedMonth.mes}
          año={selectedMonth.año}
          onBack={handleBack}
        />
      )}

      {/* Añadir el componente del modal del día - versión móvil o desktop según el tamaño de pantalla */}
      {isDayModalOpen && selectedDay && (
        isMobile ? (
          <DayViewMobile
            isOpen={isDayModalOpen}
            onClose={handleCloseDayModal}
            diaId={selectedDay.diaId}
            fecha={selectedDay.fecha}
            storeRecordId={storeRecordId}
            horasEfectivasSemanalesIniciales={selectedDay.horasEfectivas}
          />
        ) : (
          <DayViewDesktop
            isOpen={isDayModalOpen}
            onClose={handleCloseDayModal}
            diaId={selectedDay.diaId}
            fecha={selectedDay.fecha}
            storeRecordId={storeRecordId}
            horasEfectivasSemanalesIniciales={selectedDay.horasEfectivas}
          />
        )
      )}
    </div>
  );
}

// Envolver con el proveedor de contexto
export default function ScheduleViewerPage() {
  return (
    <ScheduleProvider>
      <ScheduleViewer />
    </ScheduleProvider>
  );
} 