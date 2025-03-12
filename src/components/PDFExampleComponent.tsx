import React from 'react';
import { PdfButton } from './ui/PdfButton';

interface PDFExampleComponentProps {
  semanaActualId?: string;
  tiendaId?: string;
}

/**
 * Componente de ejemplo para mostrar cómo utilizar el botón de generación de PDF
 */
export function PDFExampleComponent({ 
  semanaActualId, 
  tiendaId 
}: PDFExampleComponentProps) {
  // Si no hay semana o tienda seleccionada, mostrar mensaje
  if (!semanaActualId || !tiendaId) {
    return (
      <div className="bg-blue-50 p-4 rounded-md">
        <p className="text-blue-800 text-sm">
          Selecciona una semana y una tienda para generar el PDF de horarios.
        </p>
      </div>
    );
  }

  return (
    <div className="my-4">
      <h3 className="text-lg font-medium mb-3">Generación de PDF</h3>
      
      <div className="flex items-center space-x-4">
        <PdfButton 
          semanaId={semanaActualId} 
          storeId={tiendaId}
          label="Generar PDF semanal"
          variant="primary"
          size="md"
        />
        
        <div className="text-sm text-gray-600">
          Genera un PDF con los horarios completos de la semana seleccionada.
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium mb-2">Información del PDF</h4>
        <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
          <li>Incluye todos los días de la semana</li>
          <li>Muestra tabla de horarios para cada empleado</li>
          <li>Incluye métricas ESTIMADO y ATENCIÓN para cada hora</li>
          <li>Contiene información de la tienda</li>
        </ul>
      </div>
    </div>
  );
} 