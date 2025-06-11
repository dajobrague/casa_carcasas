'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileUp, Check, AlertCircle, FileText, Download } from 'lucide-react';
import Papa from 'papaparse';

interface CSVImportFormSemanalProps {
  onDataLoaded: (data: any[], headers: string[]) => void;
  selectedSemanaNombre: string;
}

export default function CSVImportFormSemanal({ onDataLoaded, selectedSemanaNombre }: CSVImportFormSemanalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Validar que sea un archivo CSV
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('El archivo seleccionado no es un CSV válido');
        setFile(null);
        setCsvPreview(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Leer una pequeña muestra del archivo para mostrar una vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        // Mostrar las primeras 3 líneas del CSV como vista previa
        const lines = text.split('\n').slice(0, 3).join('\n');
        setCsvPreview(lines);
      };
      reader.readAsText(selectedFile.slice(0, 1024)); // Leer solo los primeros 1KB
    }
  };

  const handleFileUpload = () => {
    if (!file) {
      setError('Por favor seleccione un archivo CSV');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Usar PapaParse para analizar el CSV
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsLoading(false);
        
        if (results.errors && results.errors.length > 0) {
          setError(`Error al analizar el CSV: ${results.errors[0].message}`);
          return;
        }
        
        if (!results.data || results.data.length === 0) {
          setError('El archivo CSV está vacío o no contiene datos válidos');
          return;
        }
        
        // Validar que el CSV tenga al menos las columnas básicas esperadas
        const headers = results.meta.fields || [];
        const hasTiendaNumero = headers.some(header => 
          header.toLowerCase().includes('n°') || 
          header.toLowerCase().includes('num') || 
          header.toLowerCase().includes('número') || 
          header.toLowerCase().includes('numero')
        );
        
        if (!hasTiendaNumero) {
          setError('El CSV debe contener una columna con el número de tienda (N°, Num, Número, etc.)');
          return;
        }
        
        // Pasar los datos y encabezados al componente padre
        onDataLoaded(results.data, headers);
      },
      error: (error) => {
        setIsLoading(false);
        setError(`Error al procesar el archivo: ${error.message}`);
      }
    });
  };
  
  // Generar un archivo de plantilla CSV para descargar
  const generateTemplateCSV = () => {
    const headers = ["N°", "TIENDA", "Horas Aprobadas", "Crecimiento", "Atencion Deseada"];
    const sampleData = [
      ["1", "Tienda A", "40", "5", "5"],
      ["2", "Tienda B", "38", "3.5", "4"],
      ["3", "Tienda C", "44", "4.2", "6"]
    ];
    
    let csvContent = headers.join(',') + '\n';
    sampleData.forEach(row => {
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `plantilla_datos_semanales_${selectedSemanaNombre.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="grid w-full items-center gap-4">
        <div className="flex flex-col space-y-2">
          <Label htmlFor="csv-file">Seleccionar archivo CSV</Label>
          <div className="flex items-center gap-2">
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateTemplateCSV}
              title="Descargar plantilla CSV"
              className="flex items-center whitespace-nowrap"
            >
              <Download className="mr-2 h-4 w-4" />
              Plantilla
            </Button>
          </div>
          
          {file && (
            <div className="flex items-center text-sm text-green-600">
              <Check size={16} className="mr-1" />
              <span>Archivo seleccionado: {file.name}</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center text-sm text-red-600">
              <AlertCircle size={16} className="mr-1" />
              <span>{error}</span>
            </div>
          )}
          
          {csvPreview && (
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-500 mb-1">Vista previa:</div>
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-24 font-mono border border-gray-200">{csvPreview}</pre>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Datos para <span className="font-medium">{selectedSemanaNombre}</span>
          </p>
        </div>
        
        <Button 
          disabled={!file || isLoading} 
          onClick={handleFileUpload}
          className="flex items-center"
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
              Procesando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Cargar y procesar
            </>
          )}
        </Button>
      </div>
      
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h3 className="font-medium mb-2 flex items-center">
            <FileText className="h-4 w-4 mr-1.5" />
            Instrucciones para la importación semanal:
          </h3>
          <ol className="list-decimal ml-5 space-y-1 text-sm">
            <li>Prepare un archivo CSV con los datos de las tiendas para la semana <strong>{selectedSemanaNombre}</strong>.</li>
            <li>Asegúrese de que contenga al menos la columna <strong>N°</strong> con el número de tienda.</li>
            <li>Incluya las columnas adicionales para importar:</li>
            <ul className="list-disc ml-5 space-y-0.5 text-sm">
              <li><strong>Horas Aprobadas</strong>: Número de horas (ej: 40)</li>
              <li><strong>Crecimiento</strong>: Valor decimal o porcentaje (ej: 5 o 5.2)</li>
              <li><strong>Atencion Deseada</strong>: Valor numérico (ej: 4)</li>
            </ul>
            <li>Puede descargar una plantilla utilizando el botón "Plantilla".</li>
            <li>Si ya existen registros para esta semana, podrá decidir si actualizarlos o ignorarlos.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
} 