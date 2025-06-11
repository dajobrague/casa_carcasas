'use client';

import { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface CSVPreviewAndConfirmationProps {
  data: any[];
  mapping: Record<string, string>;
  selectedSemanaNombre: string;
  selectedSemanaId: string;
  onPrevious: () => void;
  onStartImport: (validatedData: any[]) => void;
}

export default function CSVPreviewAndConfirmation({
  data,
  mapping,
  selectedSemanaNombre,
  selectedSemanaId,
  onPrevious,
  onStartImport
}: CSVPreviewAndConfirmationProps) {
  const [page, setPage] = useState(1);
  const [showInvalid, setShowInvalid] = useState(true);
  const [isValidating, setIsValidating] = useState(true);
  const [existingRecords, setExistingRecords] = useState<Record<string, any>>({});
  const [validationComplete, setValidationComplete] = useState(false);
  const rowsPerPage = 10;

  // Verificar datos al cargar el componente
  useEffect(() => {
    const validateAndCheckExisting = async () => {
      try {
        setIsValidating(true);
        
        // Obtener el campo que mapea a "N°" (número de tienda)
        const numeroField = Object.keys(mapping).find(key => mapping[key] === "N°");
        
        if (!numeroField) {
          throw new Error("No se encontró el mapeo para el campo 'N°'");
        }
        
        // Extraer todos los números de tienda del CSV
        const tiendaNumeros = data
          .map(row => row[numeroField])
          .filter(Boolean)
          .map(num => String(num).trim());
        
        if (tiendaNumeros.length === 0) {
          throw new Error("No se encontraron números de tienda válidos en el CSV");
        }
        
        // Verificar registros existentes para esta semana
        const response = await fetch('/api/admin/import-datos-semanales/check-existing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            semanaId: selectedSemanaId,
            tiendaNumeros
          }),
        });
        
        if (!response.ok) {
          throw new Error("Error al verificar registros existentes");
        }
        
        const result = await response.json();
        setExistingRecords(result.existingRecords || {});
        setIsValidating(false);
        setValidationComplete(true);
      } catch (error: any) {
        console.error('Error validando datos:', error);
        setIsValidating(false);
      }
    };
    
    validateAndCheckExisting();
  }, [data, mapping, selectedSemanaId]);

  // Validar los datos del CSV y marcar filas con problemas
  const processedData = useMemo(() => {
    const numeroField = Object.keys(mapping).find(key => mapping[key] === "N°");
    const horasField = Object.keys(mapping).find(key => mapping[key] === "Horas Aprobadas");
    const crecimientoField = Object.keys(mapping).find(key => mapping[key] === "Crecimiento");
    const atencionField = Object.keys(mapping).find(key => mapping[key] === "Atencion Deseada");
    
    return data.map(row => {
      // Validar cada fila
      const tiendaNum = numeroField ? String(row[numeroField]).trim() : null;
      const existingRecord = tiendaNum ? existingRecords[tiendaNum] : undefined;
      
      // Verificar valores requeridos y formatos
      const errors: string[] = [];
      
      if (!tiendaNum) {
        errors.push("Falta número de tienda");
      }
      
      // Validar Horas Aprobadas (debe ser un número entero)
      if (horasField) {
        const horas = row[horasField];
        if (horas === undefined || horas === null || horas === '') {
          errors.push("Horas Aprobadas no puede estar vacío");
        } else {
          // Limpiar el valor y verificar si es un número válido
          const horasLimpio = String(horas).replace(',', '.').trim();
          if (isNaN(parseFloat(horasLimpio))) {
            errors.push("Horas Aprobadas debe ser un número");
          }
        }
      } else {
        errors.push("No se ha mapeado el campo Horas Aprobadas");
      }
      
      // Validar Crecimiento (debe ser un número decimal)
      if (crecimientoField) {
        const crecimiento = row[crecimientoField];
        if (crecimiento === undefined || crecimiento === null || crecimiento === '') {
          errors.push("Crecimiento no puede estar vacío");
        } else {
          // Limpiar el valor eliminando el símbolo de porcentaje y verificar si es un número válido
          const crecimientoLimpio = String(crecimiento).replace('%', '').replace(',', '.').trim();
          if (isNaN(parseFloat(crecimientoLimpio))) {
            errors.push("Crecimiento debe ser un número o porcentaje");
          }
        }
      } else {
        errors.push("No se ha mapeado el campo Crecimiento");
      }
      
      // Validar Atencion Deseada (debe ser un número entero)
      if (atencionField) {
        const atencion = row[atencionField];
        if (atencion === undefined || atencion === null || atencion === '') {
          errors.push("Atencion Deseada no puede estar vacío");
        } else {
          // Limpiar el valor y verificar si es un número válido
          const atencionLimpio = String(atencion).replace(',', '.').trim();
          if (isNaN(parseFloat(atencionLimpio))) {
            errors.push("Atencion Deseada debe ser un número");
          }
        }
      } else {
        errors.push("No se ha mapeado el campo Atencion Deseada");
      }
      
      // Determinar acción
      let action: 'create' | 'update' = existingRecord ? 'update' : 'create';
      
      return {
        ...row,
        __errors: errors,
        __action: action,
        __tiendaNum: tiendaNum
      };
    });
  }, [data, mapping, existingRecords]);
  
  // Filtrar datos según preferencias
  const filteredData = useMemo(() => {
    if (showInvalid) {
      return processedData;
    } else {
      return processedData.filter(row => row.__errors.length === 0);
    }
  }, [processedData, showInvalid]);
  
  // Paginación
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedData = filteredData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  
  // Estadísticas
  const totalRecords = processedData.length;
  const invalidRecords = processedData.filter(row => row.__errors.length > 0).length;
  const validRecords = totalRecords - invalidRecords;
  const createRecords = processedData.filter(row => row.__errors.length === 0 && row.__action === 'create').length;
  const updateRecords = processedData.filter(row => row.__errors.length === 0 && row.__action === 'update').length;
  
  // Manejar inicio de importación
  const handleStartImport = () => {
    // Filtrar solo los datos válidos para la importación y formatear valores
    const validData = processedData
      .filter(row => row.__errors.length === 0)
      .map(row => {
        const tiendaNumField = Object.keys(mapping).find(key => mapping[key] === "N°");
        const horasField = Object.keys(mapping).find(key => mapping[key] === "Horas Aprobadas");
        const crecimientoField = Object.keys(mapping).find(key => mapping[key] === "Crecimiento");
        const atencionField = Object.keys(mapping).find(key => mapping[key] === "Atencion Deseada");
        
        // Crear una copia de la fila con solo los campos necesarios
        const processedRow: Record<string, any> = {};
        
        // Incluir solo los campos mapeados y relevantes
        if (tiendaNumField) {
          processedRow[tiendaNumField] = row[tiendaNumField];
        }
        
        // Formatear Horas Aprobadas como número
        if (horasField && row[horasField] !== undefined) {
          const horasLimpio = String(row[horasField]).replace(',', '.').trim();
          processedRow[horasField] = parseFloat(horasLimpio);
        }
        
        // Formatear Crecimiento como número (quitar %)
        if (crecimientoField && row[crecimientoField] !== undefined) {
          const crecimientoLimpio = String(row[crecimientoField]).replace('%', '').replace(',', '.').trim();
          processedRow[crecimientoField] = parseFloat(crecimientoLimpio);
        }
        
        // Formatear Atencion Deseada como número
        if (atencionField && row[atencionField] !== undefined) {
          const atencionLimpio = String(row[atencionField]).replace(',', '.').trim();
          processedRow[atencionField] = parseFloat(atencionLimpio);
        }
        
        return processedRow;
      });
    
    onStartImport(validData);
  };

  return (
    <div className="flex flex-col space-y-6">
      <Alert variant="default">
        <AlertTitle className="flex items-center">
          <Info className="h-4 w-4 mr-2" />
          Vista previa de datos para {selectedSemanaNombre}
        </AlertTitle>
        <AlertDescription>
          Revisa los datos antes de confirmar la importación. Se crearán {createRecords} registros nuevos 
          y se actualizarán {updateRecords} registros existentes.
        </AlertDescription>
      </Alert>

      {isValidating ? (
        <Card>
          <CardContent className="py-6 flex justify-center items-center">
            <div className="animate-spin mr-2 h-5 w-5 rounded-full border-2 border-background border-t-foreground"></div>
            <p>Validando datos y comprobando registros existentes...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Vista Previa de Datos</CardTitle>
              <CardDescription>
                Se encontraron {totalRecords} registros en el CSV. {validRecords} válidos para importar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded p-3 border">
                    <div className="text-sm font-medium">Total Registros</div>
                    <div className="text-2xl font-bold mt-1">{totalRecords}</div>
                  </div>
                  <div className="bg-green-50 rounded p-3 border border-green-100">
                    <div className="text-sm font-medium text-green-800">Registros a Crear</div>
                    <div className="text-2xl font-bold text-green-700 mt-1">{createRecords}</div>
                  </div>
                  <div className="bg-blue-50 rounded p-3 border border-blue-100">
                    <div className="text-sm font-medium text-blue-800">Registros a Actualizar</div>
                    <div className="text-2xl font-bold text-blue-700 mt-1">{updateRecords}</div>
                  </div>
                </div>
                
                {invalidRecords > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Algunos registros tienen errores</AlertTitle>
                    <AlertDescription>
                      Se encontraron {invalidRecords} registros con errores que no serán importados.
                      Corrige los problemas en tu CSV y vuelve a intentarlo.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Mostrando {filteredData.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredData.length)} de {filteredData.length} registros
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="show-invalid" 
                        checked={showInvalid} 
                        onCheckedChange={setShowInvalid} 
                      />
                      <span className="text-sm" onClick={() => setShowInvalid(!showInvalid)}>
                        Mostrar registros con errores
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Estado</TableHead>
                        <TableHead>N°</TableHead>
                        {Object.values(mapping).includes("Horas Aprobadas") && <TableHead>Horas Aprobadas</TableHead>}
                        {Object.values(mapping).includes("Crecimiento") && <TableHead>Crecimiento</TableHead>}
                        {Object.values(mapping).includes("Atencion Deseada") && <TableHead>Atencion Deseada</TableHead>}
                        <TableHead>Errores/Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={Object.values(mapping).length + 1} className="text-center py-6 text-muted-foreground">
                            No hay registros para mostrar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedData.map((row, index) => {
                          const actualIndex = startIndex + index;
                          const hasErrors = row.__errors && row.__errors.length > 0;
                          const tiendaNumField = Object.keys(mapping).find(key => mapping[key] === "N°");
                          const horasField = Object.keys(mapping).find(key => mapping[key] === "Horas Aprobadas");
                          const crecimientoField = Object.keys(mapping).find(key => mapping[key] === "Crecimiento");
                          const atencionField = Object.keys(mapping).find(key => mapping[key] === "Atencion Deseada");
                          
                          return (
                            <TableRow 
                              key={actualIndex} 
                              className={hasErrors ? "bg-red-50" : row.__action === 'update' ? "bg-blue-50" : ""}
                            >
                              <TableCell>
                                {hasErrors ? (
                                  <Badge variant="outline" className="text-red-500 border-red-300 bg-red-50">
                                    Error
                                  </Badge>
                                ) : row.__action === 'create' ? (
                                  <Badge variant="default" className="bg-green-600">
                                    Crear
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-blue-600 hover:bg-blue-700">
                                    Actualizar
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{tiendaNumField && row[tiendaNumField]}</TableCell>
                              {horasField && (
                                <TableCell>
                                  {row[horasField] !== undefined && row[horasField] !== null
                                    ? String(row[horasField]).replace(',', '.').trim()
                                    : ''}
                                </TableCell>
                              )}
                              {crecimientoField && (
                                <TableCell>
                                  {row[crecimientoField] !== undefined && row[crecimientoField] !== null
                                    ? String(row[crecimientoField]).includes('%')
                                      ? String(row[crecimientoField]).trim()
                                      : `${String(row[crecimientoField]).replace(',', '.').trim()}%`
                                    : ''}
                                </TableCell>
                              )}
                              {atencionField && (
                                <TableCell>
                                  {row[atencionField] !== undefined && row[atencionField] !== null
                                    ? String(row[atencionField]).replace(',', '.').trim()
                                    : ''}
                                </TableCell>
                              )}
                              <TableCell>
                                {hasErrors ? (
                                  <div className="text-sm text-red-600">
                                    {row.__errors.map((error: string, i: number) => (
                                      <div key={i} className="flex items-start">
                                        <AlertTriangle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                                        <span>{error}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : row.__action === 'update' ? (
                                  <div className="text-sm text-blue-600">
                                    <div className="flex items-center">
                                      <Info className="h-3 w-3 mr-1" />
                                      <span>Actualizará registro existente</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-green-600">
                                    <div className="flex items-center">
                                      <Check className="h-3 w-3 mr-1" />
                                      <span>Listo para crear</span>
                                    </div>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={onPrevious}
              className="flex items-center"
            >
              Volver al Mapeo
            </Button>
            
            <Button
              onClick={handleStartImport}
              disabled={validRecords === 0 || isValidating}
              className="flex items-center"
            >
              {validRecords > 0 ? `Importar ${validRecords} Registros` : 'No hay registros válidos'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
} 