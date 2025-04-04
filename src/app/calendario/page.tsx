'use client';

import React, { useState } from 'react';
import { MonthView } from '@/components/calendar/MonthView';

interface YearViewProps {
  onSelectMonth: (mes: string, año: string) => void;
}

// Componente provisional YearView (hasta que encontremos el real)
function SimpleYearView({ onSelectMonth }: YearViewProps) {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold mb-4">Seleccione un Mes</h1>
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(mes => (
          <button
            key={mes}
            onClick={() => onSelectMonth(mes, '2023')}
            className="p-4 bg-blue-100 hover:bg-blue-200 rounded-lg"
          >
            {mes}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CalendarioPage() {
  const [view, setView] = useState<'year' | 'month'>('year');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Manejar la selección de un mes
  const handleSelectMonth = (mesSeleccionado: string, añoSeleccionado: string) => {
    // Capitalizar la primera letra del mes seleccionado
    const mesCapitalizado = mesSeleccionado.charAt(0).toUpperCase() + mesSeleccionado.slice(1).toLowerCase();
    setSelectedMonth(mesCapitalizado);
    setSelectedYear(añoSeleccionado);
    setView('month');
  };

  // Volver a la vista de año
  const handleBackToYear = () => {
    setView('year');
  };

  // Métodos dummy para satisfacer los props de MonthView
  const handleSelectDay = () => {};
  const handleGeneratePdf = () => {};
  const handleViewMonthSummary = () => {};

  return (
    <div className="container mx-auto px-4 py-8">
      {view === 'year' ? (
        <SimpleYearView onSelectMonth={handleSelectMonth} />
      ) : (
        <MonthView 
          mes={selectedMonth} 
          año={selectedYear} 
          onBack={handleBackToYear}
          onSelectDay={handleSelectDay}
          onGeneratePdf={handleGeneratePdf}
          onViewMonthSummary={handleViewMonthSummary}
        />
      )}
    </div>
  );
} 