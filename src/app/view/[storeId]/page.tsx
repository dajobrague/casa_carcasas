'use client';

import React, { useState, useEffect } from 'react';
import { YearView, MonthView, MonthSummaryView, MonthViewMobile } from '@/components/calendar';
import { DayViewMobile, DayViewDesktop, ViewHeader } from '@/components/calendar/view';
import { ScheduleProvider, useSchedule } from '@/context/ScheduleContext';
import { SemanaLaboralRecord } from '@/lib/airtable';
import { useParams, useRouter } from 'next/navigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileText } from 'lucide-react';
import { captureIframeAsPdf } from '@/lib/pdf-utils';

// Componente principal de la vista
function ScheduleViewer() {
  const { storeRecordId, setStoreRecordId, isLoading, error, storeName, storeNumber } = useSchedule();
  const [view, setView] = useState<'year' | 'month' | 'monthSummary'>('year');
  const [selectedMonth, setSelectedMonth] = useState<{ mes: string; año: string } | null>(null);
  const router = useRouter();
  
  // Estado para el modal del día
  const [selectedDay, setSelectedDay] = useState<{
    diaId: string;
    fecha: Date;
    horasEfectivas: number;
  } | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  
  // Estado para el modal de vista semanal
  const [isWeekViewModalOpen, setIsWeekViewModalOpen] = useState(false);
  const [selectedWeekUrl, setSelectedWeekUrl] = useState<string>('');
  
  // Media query para detectar tamaño móvil (menos de 640px)
  const isMobile = useMediaQuery('(max-width: 639px)');
  
  // Obtener el storeId desde los parámetros de la ruta
  const params = useParams<{ storeId: string }>();
  
  // Establecer el storeId cuando se monte el componente
  useEffect(() => {
    if (params && params.storeId) {
      setStoreRecordId(params.storeId);
    }
  }, [params, setStoreRecordId]);

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

  // Actualizar la función para abrir el modal con iframe de la vista semanal
  const handleGeneratePdf = (semanaId: string, semanaName: string, semana?: SemanaLaboralRecord) => {
    if (storeRecordId) {
      // Construir la URL para la vista semanal
      const weekViewUrl = `/semana/${storeRecordId}/${semanaId}`;
      setSelectedWeekUrl(weekViewUrl);
      setIsWeekViewModalOpen(true);
    } else {
      console.error('No hay ID de tienda disponible para mostrar la vista semanal');
    }
  };
  
  // Función para cerrar el modal de vista semanal
  const handleCloseWeekViewModal = () => {
    setIsWeekViewModalOpen(false);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ViewHeader storeName={storeName} storeNumber={storeNumber} />
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          {/* Modal para mostrar la vista semanal */}
          <Modal
            isOpen={isWeekViewModalOpen}
            onClose={handleCloseWeekViewModal}
            title="Vista Semanal"
            size="full"
            className="p-0 max-h-[95vh]"
          >
            {selectedWeekUrl && (
              <div className="w-full h-full overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Horario Semanal</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const iframe = document.querySelector('iframe') as HTMLIFrameElement;
                        if (iframe) {
                          // Extraer el weekId de la URL para el nombre del archivo
                          const weekId = selectedWeekUrl.split('/').pop();
                          captureIframeAsPdf(iframe, `horario-semanal-${weekId}.pdf`);
                        }
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Descargar PDF
                    </Button>
                  </div>
                </div>
                <iframe 
                  src={selectedWeekUrl}
                  className="w-full h-full border-none"
                  style={{ height: 'calc(95vh - 120px)', minHeight: '700px' }}
                />
              </div>
            )}
          </Modal>
        </div>
      </main>
      <footer className="bg-white shadow-inner py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Casa de las Carcasas. Todos los derechos reservados.
          </div>
        </div>
      </footer>
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