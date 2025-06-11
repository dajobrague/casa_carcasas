'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { RefreshCw, FileText, LogOut, ArrowRight, ArrowLeft } from 'lucide-react';
import SemanaSelector from '@/components/admin/SemanaSelector';
import CSVImportFormSemanal from '@/components/admin/CSVImportFormSemanal';
import CSVMappingTableSemanal from '@/components/admin/CSVMappingTableSemanal';
import CSVPreviewAndConfirmation from '@/components/admin/CSVPreviewAndConfirmation';
import ImportProgress, { ImportStatus } from '@/components/admin/ImportProgress';
import ImportResultsSemanal from '@/components/admin/ImportResultsSemanal';

// Este componente será la página principal para el importador CSV semanal
export default function SemanasCSVImportPage() {
  // Estados para gestionar el flujo de la aplicación
  const [step, setStep] = useState<'semana' | 'upload' | 'mapping' | 'preview' | 'importing' | 'results'>('semana');
  
  // Estados para la semana seleccionada
  const [selectedSemanaId, setSelectedSemanaId] = useState<string>('');
  const [selectedSemanaNombre, setSelectedSemanaNombre] = useState<string>('');
  
  // Estados para datos CSV y mapeo
  const [csvData, setCsvData] = useState<Record<string, any>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappedHeaders, setMappedHeaders] = useState<Record<string, string>>({});
  
  // Estados para validación y resultados
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<ImportStatus | null>(null);
  
  // Protección de ruta para administradores
  const { isAdminLoggedIn, loading, adminLogout } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'api' | 'csv' | 'semanal'>('semanal');
  
  useEffect(() => {
    if (!loading && !isAdminLoggedIn) {
      router.push('/admin/login');
    }
  }, [isAdminLoggedIn, loading, router]);

  // Manejar la selección de semana
  const handleSemanaSelected = (semanaId: string, semanaNombre: string) => {
    setSelectedSemanaId(semanaId);
    setSelectedSemanaNombre(semanaNombre);
  };

  // Ir al siguiente paso después de seleccionar la semana
  const goToUploadStep = () => {
    if (!selectedSemanaId) {
      setValidationErrors(['Debes seleccionar una semana para continuar']);
      return;
    }
    
    setValidationErrors([]);
    setStep('upload');
  };
  
  // Manejar la carga de datos del CSV
  const handleCsvDataLoaded = (data: Record<string, any>[], headers: string[]) => {
    setCsvData(data);
    setCsvHeaders(headers);
    
    // Crear un mapeo automático basado en coincidencias de nombres de columnas
    const initialMapping: Record<string, string> = {};
    
    // Mapeo de campos objetivo
    const targetFields = [
      { key: "N°", aliases: ["n°", "num", "número", "numero", "tienda_num", "id"] },
      { key: "TIENDA", aliases: ["tienda", "nombre", "name", "nombre_tienda"] },
      { key: "Horas Aprobadas", aliases: ["horas", "horas_aprobadas", "horas aprobadas"] },
      { key: "Crecimiento", aliases: ["crecimiento", "growth", "incremento", "%", "porcentaje"] },
      { key: "Atencion Deseada", aliases: ["atención", "atencion", "atención deseada", "atencion deseada"] },
    ];
    
    // Intentar mapear automáticamente basado en nombres similares
    headers.forEach(header => {
      const headerLower = header.toLowerCase().trim();
      
      for (const field of targetFields) {
        // Coincidencia exacta con el nombre del campo
        if (field.key.toLowerCase() === headerLower) {
          initialMapping[header] = field.key;
          break;
        }
        
        // Coincidencia con alguno de los alias
        const matchesAlias = field.aliases.some(alias => 
          headerLower === alias || headerLower.includes(alias)
        );
        
        if (matchesAlias) {
          initialMapping[header] = field.key;
          break;
        }
      }
    });
    
    setMappedHeaders(initialMapping);
    
    // Avanzar al paso de mapeo
    setStep('mapping');
  };
  
  // Actualizar el mapeo de campos
  const handleUpdateMapping = (newMapping: Record<string, string>) => {
    setMappedHeaders(newMapping);
  };
  
  // Avanzar al paso de vista previa
  const goToPreviewStep = () => {
    setStep('preview');
  };
  
  // Regresar al paso anterior
  const goToPreviousStep = () => {
    if (step === 'upload') {
      setStep('semana');
    } else if (step === 'mapping') {
      setStep('upload');
    } else if (step === 'preview') {
      setStep('mapping');
    }
  };

  // Iniciar el proceso de importación
  const handleStartImport = async (validatedData: any[]) => {
    try {
      // Mostrar pantalla de carga
      setStep('importing');
      
      // Enviar datos directamente a la API y esperar respuesta
      const response = await fetch('/api/admin/import-datos-semanales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          semanaId: selectedSemanaId,
          data: validatedData,
          mapping: mappedHeaders
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error en la importación: ${response.status}`);
      }
      
      // Obtener resultados directamente
      const result = await response.json();
      
      // Mostrar resultados
      setImportResults(result.results);
      setStep('results');
      
    } catch (error) {
      console.error('Error al importar datos:', error);
      setValidationErrors(['Error al importar datos. Por favor, inténtelo de nuevo.']);
      setStep('preview'); // Volver a la vista previa en caso de error
    }
  };

  // Reiniciar el proceso completo
  const handleBackToStart = () => {
    // Limpiar todos los estados
    setCsvData([]);
    setCsvHeaders([]);
    setMappedHeaders({});
    setSelectedSemanaId('');
    setSelectedSemanaNombre('');
    setImportResults(null);
    setValidationErrors([]);
    
    // Volver al paso inicial
    setStep('semana');
  };

  // Función para navegar a otra página del admin
  const navigateTo = (path: string) => {
    router.push(path);
  };

  // Renderizar el contenido según el paso actual
  const renderContent = () => {
    switch (step) {
      case 'semana':
        return (
          <div className="space-y-6">
            <Alert>
              <AlertTitle>Paso 1: Selección de semana</AlertTitle>
              <AlertDescription>
                Primero, selecciona la semana para la que deseas importar los datos.
                Todos los registros creados se asociarán a esta semana.
              </AlertDescription>
            </Alert>

            <SemanaSelector 
              onSemanaSelected={handleSemanaSelected}
              selectedSemanaId={selectedSemanaId}
            />

            {selectedSemanaId && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                <p className="font-medium text-blue-800">
                  Semana seleccionada: {selectedSemanaNombre}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  Los datos importados se asignarán a esta semana. Asegúrate de que la selección es correcta.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={goToUploadStep}
                disabled={!selectedSemanaId}
                className="flex items-center"
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
        
      case 'upload':
        return (
          <div className="space-y-6">
            <Alert>
              <AlertTitle>Paso 2: Subir archivo CSV</AlertTitle>
              <AlertDescription>
                Ahora, sube el archivo CSV con los datos de tiendas para la semana {selectedSemanaNombre}.
                Puedes utilizar la plantilla o subir un archivo con las columnas requeridas.
              </AlertDescription>
            </Alert>
            
            <CSVImportFormSemanal 
              onDataLoaded={handleCsvDataLoaded}
              selectedSemanaNombre={selectedSemanaNombre}
            />
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </div>
          </div>
        );
        
      case 'mapping':
        return (
          <div className="space-y-6">
            <Alert>
              <AlertTitle>Paso 3: Mapeo de campos</AlertTitle>
              <AlertDescription>
                Asigna las columnas de tu archivo CSV a los campos esperados en Airtable.
                El sistema ha intentado mapear automáticamente algunos campos basados en sus nombres.
              </AlertDescription>
            </Alert>
            
            <CSVMappingTableSemanal 
              headers={csvHeaders}
              mapping={mappedHeaders}
              csvData={csvData}
              onUpdateMapping={handleUpdateMapping}
              onContinue={goToPreviewStep}
              selectedSemanaNombre={selectedSemanaNombre}
            />
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={goToPreviousStep}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </div>
          </div>
        );
        
      case 'preview':
        return (
          <div className="space-y-6">
            <Alert>
              <AlertTitle>Paso 4: Vista previa y confirmación</AlertTitle>
              <AlertDescription>
                Revisa los datos que serán importados y confirma la acción.
                Los registros con errores serán omitidos durante la importación.
              </AlertDescription>
            </Alert>
            
            <CSVPreviewAndConfirmation
              data={csvData}
              mapping={mappedHeaders}
              selectedSemanaNombre={selectedSemanaNombre}
              selectedSemanaId={selectedSemanaId}
              onPrevious={goToPreviousStep}
              onStartImport={handleStartImport}
            />
          </div>
        );
        
      case 'importing':
        return (
          <div className="space-y-6">
            <Alert>
              <AlertTitle>Importando datos</AlertTitle>
              <AlertDescription>
                Tus datos están siendo importados a Airtable.
                Por favor espera mientras se completa el proceso.
              </AlertDescription>
            </Alert>
            
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin mb-4 h-12 w-12 rounded-full border-4 border-gray-200 border-t-blue-600"></div>
                  <p className="text-lg font-medium">Importando datos...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    La importación está en proceso. Por favor espera.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 'results':
        return (
          <div className="space-y-6">
            <Alert>
              <AlertTitle>Paso 6: Resultados</AlertTitle>
              <AlertDescription>
                La importación ha finalizado. Revisa los resultados a continuación.
              </AlertDescription>
            </Alert>
            
            <ImportResultsSemanal 
              results={importResults || {
                created: 0,
                updated: 0, 
                skipped: 0,
                total: 0,
                errors: [],
                isCompleted: true
              }} 
              selectedSemanaNombre={selectedSemanaNombre}
              onBackToStart={handleBackToStart}
            />
          </div>
        );
        
      default:
        return (
          <Alert>
            <AlertTitle>Importador en desarrollo</AlertTitle>
            <AlertDescription>
              Este importador está en fase de desarrollo. Pronto estarán disponibles todas las funcionalidades.
            </AlertDescription>
          </Alert>
        );
    }
  };

  // Si está cargando, mostrar indicador
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Contenido principal */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Importación Semanal de Datos desde CSV</h1>
          </div>
          
          {/* Indicador de pasos */}
          <div className="mb-6">
            <div className="flex items-center">
              <div 
                className={`flex items-center justify-center h-8 w-8 rounded-full ${
                  step === 'semana' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600 border border-blue-200'
                }`}
              >
                1
              </div>
              <div className={`h-1 flex-grow mx-2 ${step === 'semana' ? 'bg-gray-200' : 'bg-blue-200'}`}></div>
              <div 
                className={`flex items-center justify-center h-8 w-8 rounded-full ${
                  step === 'upload' ? 'bg-blue-600 text-white' : 
                  step === 'mapping' || step === 'preview' || step === 'importing' || step === 'results' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 
                  'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                2
              </div>
              <div className={`h-1 flex-grow mx-2 ${
                step === 'mapping' || step === 'preview' || step === 'importing' || step === 'results' ? 'bg-blue-200' : 'bg-gray-200'
              }`}></div>
              <div 
                className={`flex items-center justify-center h-8 w-8 rounded-full ${
                  step === 'mapping' ? 'bg-blue-600 text-white' : 
                  step === 'preview' || step === 'importing' || step === 'results' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 
                  'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                3
              </div>
              <div className={`h-1 flex-grow mx-2 ${
                step === 'preview' || step === 'importing' || step === 'results' ? 'bg-blue-200' : 'bg-gray-200'
              }`}></div>
              <div 
                className={`flex items-center justify-center h-8 w-8 rounded-full ${
                  step === 'preview' ? 'bg-blue-600 text-white' : 
                  step === 'importing' || step === 'results' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 
                  'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                4
              </div>
              <div className={`h-1 flex-grow mx-2 ${
                step === 'importing' || step === 'results' ? 'bg-blue-200' : 'bg-gray-200'
              }`}></div>
              <div 
                className={`flex items-center justify-center h-8 w-8 rounded-full ${
                  step === 'results' ? 'bg-blue-600 text-white' : 
                  'bg-gray-100 text-gray-400 border border-gray-200'
                }`}
              >
                5
              </div>
            </div>
            <div className="flex text-xs mt-1 text-gray-500 justify-between px-2">
              <div className={step === 'semana' ? 'font-medium text-blue-600' : ''}>Semana</div>
              <div className={step === 'upload' ? 'font-medium text-blue-600' : ''}>CSV</div>
              <div className={step === 'mapping' ? 'font-medium text-blue-600' : ''}>Mapeo</div>
              <div className={step === 'preview' ? 'font-medium text-blue-600' : ''}>Vista previa</div>
              <div className={step === 'results' ? 'font-medium text-blue-600' : ''}>Resultados</div>
            </div>
          </div>
          
          {/* Mensajes de error */}
          {validationErrors.length > 0 && (
            <div className="mb-6">
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {/* Contenido principal según el paso actual */}
          <Card>
            <CardHeader>
              <CardTitle>Importador de Datos Semanales</CardTitle>
              <CardDescription>
                Este asistente te guiará en el proceso de importación de datos semanales para las tiendas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 