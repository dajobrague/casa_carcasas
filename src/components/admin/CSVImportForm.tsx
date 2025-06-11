'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileUp, Check, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';

interface CSVImportFormProps {
  onDataLoaded: (data: any[], headers: string[]) => void;
}

export default function CSVImportForm({ onDataLoaded }: CSVImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Validar que sea un archivo CSV
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('El archivo seleccionado no es un CSV válido');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
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
        
        // Extraer los encabezados del CSV
        const headers = results.meta.fields || [];
        
        // Pasar los datos y encabezados al componente padre
        onDataLoaded(results.data, headers);
      },
      error: (error) => {
        setIsLoading(false);
        setError(`Error al procesar el archivo: ${error.message}`);
      }
    });
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
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Formato esperado: CSV con columnas para Número de tienda, TIENDA, Horas Aprobadas, Crecimiento, Atención Deseada
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
          <h3 className="font-medium mb-2">Instrucciones:</h3>
          <ol className="list-decimal ml-5 space-y-1 text-sm">
            <li>Prepare un archivo CSV con los datos de las tiendas.</li>
            <li>Asegúrese de que al menos contenga las columnas para número de tienda y nombre.</li>
            <li>Los campos adicionales como Horas Aprobadas, Crecimiento y Atención Deseada son opcionales.</li>
            <li>Cargue el archivo utilizando el botón de arriba.</li>
            <li>En el siguiente paso podrá mapear las columnas del CSV con los campos de Airtable.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
} 