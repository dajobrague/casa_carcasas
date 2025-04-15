'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CSVImportForm from '@/components/admin/CSVImportForm';
import CSVMappingTable from '@/components/admin/CSVMappingTable';
import CSVPreviewTable from '@/components/admin/CSVPreviewTable';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import ImportProgress, { ImportStatus } from '@/components/admin/ImportProgress';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { RefreshCw, FileText, LogOut } from 'lucide-react';

// Definir la estructura de datos esperada del CSV
export type TiendaRecord = {
  "N°": string;
  "TIENDA"?: string;
  "Horas Aprobadas Value"?: string | number; // Formato: Número
  "Crecimiento Value"?: string | number; // Formato: Número (sin el símbolo %)
  "Atencion Value"?: string | number; // Formato: Número
  [key: string]: any; // Para campos adicionales que pueden venir en el CSV
};

type ImportResults = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

// Agregar un nuevo tipo para la importación
type ProcessedRecord = Record<string, any> & {
  __shouldOmit?: boolean;
};

// Componente de carga
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function CSVImportPage() {
  const [csvData, setCsvData] = useState<Record<string, any>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappedHeaders, setMappedHeaders] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'results'>('upload');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [skippedRows, setSkippedRows] = useState<number[]>([]);
  const [existingRecords, setExistingRecords] = useState<Record<string, TiendaRecord>>({});
  const [processingStatus, setProcessingStatus] = useState<Record<string, {action: 'create' | 'update', status: 'pending' | 'success' | 'error'}>>({});
  const [results, setResults] = useState<ImportResults>({
    created: 0, 
    updated: 0, 
    skipped: 0, 
    errors: []
  });
  const [importSessionId, setImportSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'api' | 'csv' | 'semanal'>('csv');
  const router = useRouter();
  
  // Usamos la autenticación de administrador
  const { isAdminLoggedIn, loading, adminLogout } = useAuth();
  
  // Protección de ruta para administradores
  useEffect(() => {
    if (!loading && !isAdminLoggedIn) {
      router.push('/admin/login');
    }
  }, [isAdminLoggedIn, loading, router]);

  // Función para manejar datos del CSV cargado
  const handleCSVData = (data: any[], headers: string[]) => {
    setCsvData(data);
    setCsvHeaders(headers);
    
    // Intentar mapeo automático donde coincidan los nombres
    const expectedFields = ["N°", "TIENDA", "Horas Aprobadas Value", "Crecimiento Value", "Atencion Value"];
    const autoMapping: Record<string, string> = {};
    
    headers.forEach(header => {
      // Si el campo existe exactamente igual en los campos esperados
      if (expectedFields.includes(header)) {
        autoMapping[header] = header;
      } else {
        // Buscar coincidencias parciales o normalizadas
        const normalizedHeader = header.trim().toLowerCase().replace(/\s+/g, '');
        const match = expectedFields.find(field => 
          field.toLowerCase().replace(/\s+/g, '') === normalizedHeader ||
          (normalizedHeader.includes('tienda') && field === 'TIENDA') ||
          (normalizedHeader.includes('horas') && field === 'Horas Aprobadas Value') ||
          (normalizedHeader.includes('crecimiento') && field === 'Crecimiento Value') ||
          (normalizedHeader.includes('atencion') && field === 'Atencion Value')
        );
        
        if (match) {
          autoMapping[header] = match;
        }
      }
    });
    
    setMappedHeaders(autoMapping);
    checkExistingRecords(data, autoMapping);
    setStep('mapping');
  };

  // Verifica qué registros ya existen en la base de datos
  const checkExistingRecords = async (data: any[], mapping: Record<string, string>) => {
    try {
      // Extraer todos los números de tienda del CSV
      const tiendaNumeros = data.map(row => {
        const numeroField = Object.keys(mapping).find(key => mapping[key] === "N°");
        return numeroField ? row[numeroField] : null;
      }).filter(Boolean);

      // Consultar a la API para verificar cuáles ya existen
      const response = await fetch('/api/admin/check-tiendas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numeros: tiendaNumeros }),
      });

      if (!response.ok) {
        throw new Error('Error al verificar tiendas existentes');
      }

      const existingData = await response.json();
      setExistingRecords(existingData.records);
      
      // Inicializar el estado de procesamiento
      const initialStatus: Record<string, {action: 'create' | 'update', status: 'pending' | 'success' | 'error'}> = {};
      
      data.forEach((row) => {
        const numeroField = Object.keys(mapping).find(key => mapping[key] === "N°");
        if (numeroField && row[numeroField]) {
          const tiendaNum = row[numeroField];
          initialStatus[tiendaNum] = {
            action: existingData.records[tiendaNum] ? 'update' : 'create',
            status: 'pending'
          };
        }
      });
      
      setProcessingStatus(initialStatus);
    } catch (error) {
      console.error('Error al verificar registros existentes:', error);
      setValidationErrors(['Error al verificar los registros existentes en Airtable']);
    }
  };

  // Manejar la actualización del mapeo de headers
  const handleMappingUpdate = (newMapping: Record<string, string>) => {
    setMappedHeaders(newMapping);
    checkExistingRecords(csvData, newMapping);
  };

  // Validar antes de enviar a la API
  const validateBeforeImport = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const skipped: number[] = [];
    
    // Verificar que al menos N° esté mapeado (único campo obligatorio)
    const hasNumeroMapping = Object.values(mappedHeaders).includes("N°");
    
    if (!hasNumeroMapping) {
      errors.push('Debe mapear el campo "N°" para identificar cada tienda.');
    }
    
    // Verificar que los registros tengan valores para el campo obligatorio N°
    // Si no lo tienen, los marcaremos como filas a omitir
    if (hasNumeroMapping) {
      const numField = Object.keys(mappedHeaders).find(key => mappedHeaders[key] === "N°");
      
      csvData.forEach((row, index) => {
        if (numField && (!row[numField] || row[numField].toString().trim() === '')) {
          warnings.push(`La fila ${index + 1} no tiene el número de tienda (N°) y será omitida durante la importación.`);
          skipped.push(index);
        }
      });
    }
    
    setValidationErrors(errors);
    setValidationWarnings(warnings);
    setSkippedRows(skipped);
    
    // Solo bloqueamos el proceso si hay errores reales, no por advertencias
    return errors.length === 0;
  };

  // Procesar la importación de datos
  const processImport = async () => {
    if (!validateBeforeImport()) {
      return;
    }
    
    setStep('preview');
  };

  // Función para manejar la confirmación de la importación
  const confirmImport = async () => {
    setStep('importing');
    try {
      // Obtener referencias a datos procesados desde el componente de vista previa
      const processedData: ProcessedRecord[] = csvData.map((row, index) => {
        // Los datos del CSV son dinámicos, convertimos a nuestro tipo personalizado
        const csvRow = row as Record<string, any>;
        
        // Verificar si esta fila debe ser omitida por validación previa
        if (skippedRows.includes(index)) {
          return { ...csvRow, __shouldOmit: true };
        }
        
        // Verificar si este registro existe y si tiene cambios
        const tiendaNumField = Object.keys(mappedHeaders).find(key => mappedHeaders[key] === "N°");
        if (!tiendaNumField || !csvRow[tiendaNumField]) return { ...csvRow, __shouldOmit: true };
        
        const tiendaNum = csvRow[tiendaNumField];
        const existingRecord = existingRecords[tiendaNum];
        if (!existingRecord) return { ...csvRow, __shouldOmit: false }; // Es un registro nuevo
        
        // Verificar si hay cambios
        const differences = Object.entries(mappedHeaders).some(([sourceField, targetField]) => {
          if (!targetField) return false;
          
          let newValue = csvRow[sourceField];
          let oldValue = existingRecord[targetField as keyof TiendaRecord];
          
          // Normalizar valores
          if (typeof newValue === 'string') newValue = newValue.trim();
          if (typeof oldValue === 'string') oldValue = oldValue.trim();
          
          // Convertir a número para campos numéricos
          if (targetField === 'Horas Aprobadas Value' || targetField === 'Atencion Value' || targetField === 'Crecimiento Value') {
            if (newValue !== undefined && newValue !== null && newValue !== '') {
              newValue = parseFloat(String(newValue).replace(',', '.'));
            }
            if (oldValue !== undefined && oldValue !== null && oldValue !== '') {
              oldValue = parseFloat(String(oldValue).replace(',', '.'));
            }
            
            // Comparar con tolerancia para números
            if (typeof newValue === 'number' && typeof oldValue === 'number') {
              return Math.abs(newValue - oldValue) > 0.001;
            }
          }
          
          return String(newValue) !== String(oldValue);
        });
        
        return { ...csvRow, __shouldOmit: !differences };
      });
      
      // Filtrar solo los registros que tienen cambios o son nuevos
      const transformedData = processedData
        .filter(row => !row.__shouldOmit)
        .map(row => {
          const newRecord: Record<string, any> = {};
          Object.entries(mappedHeaders).forEach(([csvHeader, targetField]) => {
            if (targetField && csvHeader in row && row[csvHeader] !== undefined) {
              newRecord[targetField] = row[csvHeader];
            }
          });
          return newRecord;
        });
      
      console.log(`Enviando ${transformedData.length} registros con cambios para importar.`);
      
      const response = await fetch('/api/admin/import-tiendas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          records: transformedData,
          mapping: mappedHeaders
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error al importar datos');
      }
      
      const result = await response.json();
      setImportSessionId(result.sessionId || '');
      
      // No pasamos a resultados inmediatamente - esperamos a que el componente de progreso indique que se ha completado
      if (!result.sessionId) {
        // Si no hay sessionId (caso fallback), mostramos los resultados directamente
        setResults({
          created: result.created || 0,
          updated: result.updated || 0,
          skipped: result.skipped || 0,
          errors: result.errors || []
        });
        setStep('results');
      }
    } catch (error) {
      console.error('Error en la importación:', error);
      setValidationErrors(['Error al procesar la importación. Intente nuevamente.']);
      setStep('preview'); // Volver a vista previa en caso de error
    }
  };

  // Función para manejar la finalización de la importación desde el componente de progreso
  const handleImportComplete = (status: ImportStatus) => {
    setResults({
      created: status.created || 0,
      updated: status.updated || 0,
      skipped: status.skipped || 0,
      errors: status.errors || []
    });
    setStep('results');
  };

  const resetImport = () => {
    setCsvData([]);
    setCsvHeaders([]);
    setMappedHeaders({});
    setValidationErrors([]);
    setValidationWarnings([]);
    setSkippedRows([]);
    setResults({created: 0, updated: 0, skipped: 0, errors: []});
    setExistingRecords({});
    setProcessingStatus({});
    setStep('upload');
  };

  // Navegar a otra página del admin
  const navigateTo = (path: string) => {
    router.push(path);
  };
  
  // Navegar a la importación semanal
  const navigateToSemanasImport = () => {
    router.push('/admin/semanas-csv-import');
  };
  
  // Gestionar el cierre de sesión de admin
  const handleLogout = () => {
    adminLogout();
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAdminLoggedIn) {
    return null; // Redirecciona en useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Contenido principal */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Importación de Tiendas desde CSV</h1>
          </div>
          
          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Errores de validación</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {validationWarnings.length > 0 && (
            <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-800">
              <AlertTitle className="text-amber-800">Advertencias</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {validationWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
                <p className="mt-2 font-medium">Las filas con datos incompletos serán omitidas durante la importación.</p>
              </AlertDescription>
            </Alert>
          )}
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Proceso de Importación</CardTitle>
              <CardDescription>
                Siga los pasos para cargar, mapear y confirmar la importación de los datos de tiendas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={step} className="w-full">
                <TabsList className="grid grid-cols-5 mb-4">
                  <TabsTrigger value="upload" disabled={step !== 'upload'}>1. Cargar CSV</TabsTrigger>
                  <TabsTrigger value="mapping" disabled={step !== 'mapping'}>2. Mapear Campos</TabsTrigger>
                  <TabsTrigger value="preview" disabled={step !== 'preview'}>3. Revisar Datos</TabsTrigger>
                  <TabsTrigger value="importing" disabled={step !== 'importing'}>4. Importando</TabsTrigger>
                  <TabsTrigger value="results" disabled={step !== 'results'}>5. Resultados</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload">
                  <CSVImportForm onDataLoaded={handleCSVData} />
                </TabsContent>
                
                <TabsContent value="mapping">
                  <CSVMappingTable 
                    headers={csvHeaders} 
                    mapping={mappedHeaders} 
                    onUpdateMapping={handleMappingUpdate} 
                  />
                  
                  <div className="flex justify-end mt-4 space-x-2">
                    <Button variant="outline" onClick={resetImport}>Cancelar</Button>
                    <Button onClick={processImport}>Continuar</Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="preview">
                  <CSVPreviewTable 
                    data={csvData.map((row, index) => ({
                      ...row,
                      __skipped: skippedRows.includes(index)
                    }))} 
                    mapping={mappedHeaders} 
                    existingRecords={existingRecords} 
                    processingStatus={processingStatus}
                  />
                  
                  <div className="flex justify-end mt-4 space-x-2">
                    <Button variant="outline" onClick={() => setStep('mapping')}>Volver</Button>
                    <Button onClick={confirmImport}>Confirmar Importación</Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="importing">
                  <ImportProgress 
                    sessionId={importSessionId} 
                    onComplete={handleImportComplete} 
                  />
                  <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground">Por favor, no cierre esta página durante la importación.</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="results">
                  <div className="flex flex-col space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Registros Creados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold">{results.created}</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Registros Actualizados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold">{results.updated}</p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Registros Sin Cambios</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold">{results.skipped}</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {results.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTitle>Errores en la importación</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc pl-4">
                            {results.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="flex justify-end mt-4">
                      <Button onClick={resetImport}>Iniciar Nueva Importación</Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 