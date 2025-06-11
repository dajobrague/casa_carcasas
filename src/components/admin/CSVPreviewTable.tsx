'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { useState, useMemo } from 'react';
import { TiendaRecord } from '@/app/admin/csv-import/page';
import { Switch } from '@/components/ui/switch';

interface CSVPreviewTableProps {
  data: any[];
  mapping: Record<string, string>;
  existingRecords: Record<string, TiendaRecord>;
  processingStatus: Record<string, {
    action: 'create' | 'update';
    status: 'pending' | 'success' | 'error';
  }>;
}

export default function CSVPreviewTable({ 
  data, 
  mapping, 
  existingRecords, 
  processingStatus 
}: CSVPreviewTableProps) {
  const [page, setPage] = useState(1);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const rowsPerPage = 10;

  // Obtener los campos mapeados
  const mappedFields = Object.values(mapping).filter(Boolean);
  
  // Obtener el campo que mapea a "N°"
  const numeroField = Object.keys(mapping).find(key => mapping[key] === "N°");
  const nombreField = Object.keys(mapping).find(key => mapping[key] === "TIENDA");
  
  // Función para obtener las diferencias entre el CSV y el registro existente
  const getDifferences = (row: any, existingRecord: TiendaRecord | undefined, mapping: Record<string, string>) => {
    if (!existingRecord) return [];
    
    const differences: { field: string; oldValue: any; newValue: any }[] = [];
    
    Object.entries(mapping).forEach(([sourceField, targetField]) => {
      if (!targetField) return; // Campo no mapeado
      
      let newValue = row[sourceField];
      let oldValue = existingRecord[targetField as keyof TiendaRecord];
      
      // Normalizar valores antes de comparar
      if (typeof newValue === 'string') newValue = newValue.trim();
      if (typeof oldValue === 'string') oldValue = oldValue.trim();
      
      // Convertir a números para campos numéricos para comparación exacta
      if (targetField === 'Horas Aprobadas' || targetField === 'Atención Deseada' || targetField === 'Crecimiento') {
        if (newValue !== undefined && newValue !== null && newValue !== '') {
          newValue = parseFloat(String(newValue).replace(',', '.'));
        }
        if (oldValue !== undefined && oldValue !== null && oldValue !== '') {
          oldValue = parseFloat(String(oldValue).replace(',', '.'));
        }
        
        // Comparar con tolerancia para números
        if (typeof newValue === 'number' && typeof oldValue === 'number') {
          if (Math.abs(newValue - oldValue) <= 0.001) {
            return; // No hay diferencia significativa
          }
        }
      }
      
      // Si los valores son diferentes, registrar la diferencia
      if (newValue !== undefined && newValue !== null && newValue !== '' && 
          String(newValue) !== String(oldValue)) {
        differences.push({
          field: targetField,
          oldValue,
          newValue
        });
      }
    });
    
    return differences;
  };

  // Procesar los datos para marcar registros sin cambios
  const processedData = useMemo(() => {
    return data.map(row => {
      const tiendaNum = numeroField ? row[numeroField] : null;
      const existingRecord = tiendaNum ? existingRecords[tiendaNum] : undefined;
      let isUnchanged = false;
      
      // Si es una actualización, verificar si hay cambios reales
      if (existingRecord) {
        const differences = getDifferences(row, existingRecord, mapping);
        isUnchanged = differences.length === 0;
      }
      
      return {
        ...row,
        __unchanged: isUnchanged,
        __shouldOmit: row.__skipped || isUnchanged
      };
    });
  }, [data, numeroField, existingRecords, mapping]);
  
  // Filtrar datos según las preferencias del usuario
  const filteredData = useMemo(() => {
    if (showUnchanged) {
      return processedData;
    } else {
      return processedData.filter(row => !row.__unchanged);
    }
  }, [processedData, showUnchanged]);
  
  // Calcular información de paginación
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedData = filteredData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  
  // Calcular estadísticas
  const totalRecords = data.length;
  const skippedRecords = processedData.filter(row => row.__skipped).length;
  const unchangedRecords = processedData.filter(row => row.__unchanged).length;
  const validRecords = totalRecords - skippedRecords - unchangedRecords;
  const createRecords = processedData.filter(row => {
    const tiendaNum = numeroField ? row[numeroField] : null;
    return !row.__shouldOmit && tiendaNum && !existingRecords[tiendaNum];
  }).length;
  const updateRecords = processedData.filter(row => {
    const tiendaNum = numeroField ? row[numeroField] : null;
    return !row.__shouldOmit && tiendaNum && existingRecords[tiendaNum];
  }).length;

  return (
    <div className="flex flex-col space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Vista Previa de Importación</CardTitle>
          <CardDescription>
            Revise los datos que serán importados y las acciones que se tomarán para cada registro.
            Los registros sin cambios respecto a los datos existentes serán omitidos automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Mostrando {filteredData.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredData.length)} de {filteredData.length} registros
              </span>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="show-unchanged" 
                  checked={showUnchanged} 
                  onCheckedChange={setShowUnchanged} 
                />
                <span className="text-sm" onClick={() => setShowUnchanged(!showUnchanged)}>
                  Mostrar registros sin cambios
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
                  {numeroField && <TableHead>N°</TableHead>}
                  {nombreField && <TableHead>TIENDA</TableHead>}
                  {Object.entries(mapping).map(([sourceField, targetField]) => 
                    targetField && targetField !== "N°" && targetField !== "TIENDA" ? (
                      <TableHead key={sourceField}>{targetField}</TableHead>
                    ) : null
                  )}
                  <TableHead>Cambios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={mappedFields.length + 2} className="text-center py-6 text-muted-foreground">
                      No hay registros para mostrar. {!showUnchanged && unchangedRecords > 0 && "Active 'Mostrar registros sin cambios' para ver todos los registros."}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedData.map((row, index) => {
                    const actualIndex = startIndex + index;
                    const tiendaNum = numeroField ? row[numeroField] : null;
                    const existingRecord = tiendaNum ? existingRecords[tiendaNum] : undefined;
                    const isSkipped = row.__skipped === true;
                    const isUnchanged = row.__unchanged === true;
                    
                    // Determinar acción basada en estado
                    let action: 'create' | 'update' | 'skip' = 'create';
                    if (isSkipped || isUnchanged) {
                      action = 'skip';
                    } else if (existingRecord) {
                      action = 'update';
                    }
                    
                    // Obtener diferencias con el registro existente
                    const differences = existingRecord 
                      ? getDifferences(row, existingRecord, mapping)
                      : [];
                    
                    return (
                      <TableRow 
                        key={actualIndex} 
                        className={
                          isSkipped ? "bg-red-50" : 
                          isUnchanged ? "bg-gray-50" : 
                          ""
                        }
                      >
                        <TableCell>
                          {isSkipped ? (
                            <Badge variant="outline" className="text-red-500 border-red-300 bg-red-50">
                              Omitido
                            </Badge>
                          ) : isUnchanged ? (
                            <Badge variant="outline" className="text-gray-500 border-gray-300 bg-gray-50">
                              Sin cambios
                            </Badge>
                          ) : action === 'create' ? (
                            <Badge variant="default">
                              Crear
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              Actualizar
                            </Badge>
                          )}
                        </TableCell>
                        
                        {numeroField && (
                          <TableCell className={`font-medium ${isSkipped || isUnchanged ? "text-gray-400" : ""}`}>
                            {row[numeroField] || <span className="text-red-500">Falta N°</span>}
                          </TableCell>
                        )}
                        
                        {nombreField && (
                          <TableCell className={isSkipped || isUnchanged ? "text-gray-400" : ""}>
                            {row[nombreField] || <span className="text-yellow-500">Opcional</span>}
                          </TableCell>
                        )}
                        
                        {Object.entries(mapping).map(([sourceField, targetField]) => 
                          targetField && targetField !== "N°" && targetField !== "TIENDA" ? (
                            <TableCell key={sourceField} className={isSkipped || isUnchanged ? "text-gray-400" : ""}>
                              {row[sourceField]}
                            </TableCell>
                          ) : null
                        )}
                        
                        <TableCell className={isSkipped || isUnchanged ? "text-gray-400" : ""}>
                          {isSkipped ? (
                            <span className="text-xs text-red-500">Datos incompletos</span>
                          ) : isUnchanged ? (
                            <span className="text-xs text-gray-500">Valores idénticos a los existentes</span>
                          ) : action === 'update' && differences.length > 0 ? (
                            <div className="text-xs">
                              {differences.map((diff, i) => (
                                <div key={i} className="mb-1">
                                  <span className="font-medium">{diff.field}:</span>{' '}
                                  <span className="text-red-500 line-through">{diff.oldValue}</span>{' '}
                                  <span className="text-green-500">{diff.newValue}</span>
                                </div>
                              ))}
                            </div>
                          ) : action === 'update' && differences.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Sin cambios</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nuevo registro</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-md border">
            <h4 className="text-sm font-semibold mb-2">Resumen de importación</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Total registros</div>
                <div className="text-lg font-semibold">{totalRecords}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Se importarán</div>
                <div className="text-lg font-semibold text-green-600">{validRecords}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Se omitirán</div>
                <div className="text-lg font-semibold text-red-500">{skippedRecords + unchangedRecords}</div>
                <div className="text-xs text-gray-500">{skippedRecords} incompletos, {unchangedRecords} sin cambios</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Tipo de operación</div>
                <div className="text-sm">
                  <span className="inline-flex items-center mr-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                    <span>{createRecords} nuevos</span>
                  </span>
                  <span className="inline-flex items-center">
                    <span className="w-3 h-3 rounded-full bg-purple-500 mr-1"></span>
                    <span>{updateRecords} actualizaciones</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="w-3 h-3 bg-red-50 border border-red-300 rounded-sm mr-1"></span>
                <span className="text-xs text-gray-600">Datos incompletos</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-gray-50 border border-gray-300 rounded-sm mr-1"></span>
                <span className="text-xs text-gray-600">Sin cambios</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                <span className="text-xs text-gray-600">Nuevos registros</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-1"></span>
                <span className="text-xs text-gray-600">Actualizaciones</span>
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
        </CardContent>
      </Card>
      
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-sm text-yellow-800">
        <p className="font-medium mb-2">Notas importantes antes de importar:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Los registros con número de tienda existente serán actualizados con los nuevos valores.</li>
          <li>Los registros con números de tienda nuevos serán creados como nuevas tiendas.</li>
          <li>Verifique que los campos estén correctamente mapeados antes de proceder.</li>
          <li>Una vez iniciada la importación, el proceso no puede cancelarse.</li>
        </ul>
      </div>
    </div>
  );
} 