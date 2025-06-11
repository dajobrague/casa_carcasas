'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Download, FileText, AlertCircle, ArrowLeft } from "lucide-react";
import { ImportStatus } from "./ImportProgress";

interface ImportResultsSemanalProps {
  results: ImportStatus;
  selectedSemanaNombre: string;
  onBackToStart: () => void;
}

export default function ImportResultsSemanal({ 
  results, 
  selectedSemanaNombre, 
  onBackToStart 
}: ImportResultsSemanalProps) {
  // Generar un informe CSV con los resultados
  const handleDownloadReport = () => {
    // Cabecera del CSV
    let csvContent = "Tipo,Cantidad\n";
    csvContent += `Registros creados,${results.created}\n`;
    csvContent += `Registros actualizados,${results.updated}\n`;
    csvContent += `Registros sin cambios,${results.skipped}\n`;
    csvContent += `Total procesado,${results.total}\n\n`;
    
    // Añadir errores si los hay
    if (results.errors.length > 0) {
      csvContent += "Errores:\n";
      results.errors.forEach(error => {
        csvContent += `"${error.replace(/"/g, '""')}"\n`; // Escapar comillas
      });
    }
    
    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('download', `resultados_importacion_${selectedSemanaNombre.replace(/\s+/g, '_')}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <CheckCircle className="text-green-500 mr-2 h-6 w-6" />
          Importación Completada
        </h2>
        <Button
          variant="outline"
          onClick={onBackToStart}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Inicio
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Resultados de la Importación</CardTitle>
          <CardDescription>
            Resumen de resultados para la semana {selectedSemanaNombre}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="text-sm font-medium text-green-600">Creados</div>
                <div className="text-3xl font-bold text-green-700 mt-1">{results.created}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="text-sm font-medium text-blue-600">Actualizados</div>
                <div className="text-3xl font-bold text-blue-700 mt-1">{results.updated}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-sm font-medium text-gray-600">Sin Cambios</div>
                <div className="text-3xl font-bold text-gray-700 mt-1">{results.skipped}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                <div className="text-sm font-medium text-purple-600">Total</div>
                <div className="text-3xl font-bold text-purple-700 mt-1">{results.total}</div>
              </div>
            </div>
            
            {results.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Se encontraron errores durante la importación</AlertTitle>
                <AlertDescription>
                  <div className="max-h-40 overflow-y-auto mt-2">
                    <ul className="list-disc ml-5 space-y-1">
                      {results.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-sm text-blue-800">
              <div className="flex">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                <div>
                  <p className="font-medium">Información de Importación:</p>
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    <li>Los datos han sido importados correctamente para la semana <strong>{selectedSemanaNombre}</strong>.</li>
                    <li>Los registros con el mismo número de tienda fueron actualizados en lugar de crear duplicados.</li>
                    <li>Los registros sin cambios respecto a los existentes fueron omitidos para evitar operaciones innecesarias.</li>
                    <li>Puede descargar un reporte detallado usando el botón "Descargar Reporte".</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={handleDownloadReport}
                className="flex items-center"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar Reporte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 