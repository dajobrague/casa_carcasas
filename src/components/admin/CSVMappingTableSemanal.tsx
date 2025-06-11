'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select } from '../ui/Select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CSVMappingTableSemanalProps {
  headers: string[];
  mapping: Record<string, string>;
  csvData: Record<string, any>[];
  onUpdateMapping: (mapping: Record<string, string>) => void;
  onContinue: () => void;
  selectedSemanaNombre: string;
}

// Los campos esperados en Airtable para los datos semanales
const expectedFields = [
  { value: "N°", label: "N°", required: true, description: "Número de tienda (identificador único) - Formato: Número", validationRegex: /^\d+$/, type: "numeric" },
  { value: "Horas Aprobadas", label: "Horas Aprobadas", required: false, description: "Horas de trabajo aprobadas - Formato: Número (acepta decimales)", validationRegex: /^-?\d+(\.\d+)?$/, type: "numeric" },
  { value: "Crecimiento", label: "Crecimiento", required: false, description: "Porcentaje de crecimiento - Formato: Decimal o porcentaje (ej: 5.2 o 5.2%)", validationRegex: /^-?\d+(\.\d+)?%?$/, type: "numeric" },
  { value: "Atencion Deseada", label: "Atencion Deseada", required: false, description: "Nivel de atención deseada - Formato: Número", validationRegex: /^-?\d+(\.\d+)?$/, type: "numeric" }
];

export default function CSVMappingTableSemanal({ 
  headers, 
  mapping, 
  csvData, 
  onUpdateMapping, 
  onContinue,
  selectedSemanaNombre 
}: CSVMappingTableSemanalProps) {
  const [selectedHeaders, setSelectedHeaders] = useState<Record<string, string>>(mapping);
  const [validationIssues, setValidationIssues] = useState<{field: string, rows: number[], message: string}[]>([]);
  const [isDataValid, setIsDataValid] = useState<boolean>(false);
  
  // Verificar si un header ya está mapeado a un campo
  const isFieldAlreadyMapped = (field: string, currentHeader: string) => {
    return Object.entries(selectedHeaders).some(([header, mappedField]) => 
      mappedField === field && header !== currentHeader
    );
  };
  
  // Actualizar el mapping cuando cambia una selección
  const handleMappingChange = (header: string, field: string) => {
    // Si el campo es "none", convertirlo a cadena vacía para mantener la lógica existente
    const fieldValue = field === "none" ? "" : field;
    const newMapping = { ...selectedHeaders, [header]: fieldValue };
    setSelectedHeaders(newMapping);
    onUpdateMapping(newMapping);
  };
  
  // Identificar campos requeridos que aún no han sido mapeados
  const getMissingRequiredFields = () => {
    const mappedFields = Object.values(selectedHeaders);
    return expectedFields
      .filter(field => field.required && !mappedFields.includes(field.value))
      .map(field => field.value);
  };
  
  // Validar datos después de cada cambio en el mapeo
  useEffect(() => {
    validateData();
  }, [selectedHeaders, csvData]);
  
  // Validar los datos antes de continuar
  const validateData = () => {
    const issues: {field: string, rows: number[], message: string}[] = [];
    
    // Verificar que al menos N° esté mapeado (requerido)
    const hasNumeroMapping = Object.values(selectedHeaders).includes("N°");
    
    if (!hasNumeroMapping) {
      issues.push({
        field: "N°",
        rows: [],
        message: 'El campo "N°" es obligatorio para identificar cada tienda.'
      });
    }
    
    // Validar el formato de los datos numéricos
    if (csvData.length > 0) {
      expectedFields.forEach(fieldDef => {
        if (fieldDef.type === "numeric" && fieldDef.validationRegex) {
          // Buscar qué columna del CSV está mapeada a este campo
          const matchedHeader = Object.entries(selectedHeaders).find(([_, value]) => value === fieldDef.value);
          
          if (matchedHeader) {
            const headerName = matchedHeader[0];
            const invalidRows: number[] = [];
            
            csvData.forEach((row, index) => {
              const value = row[headerName];
              
              // Si hay un valor (no nulo, no vacío) y no cumple con el formato esperado
              if (value !== undefined && value !== null && value !== '') {
                let formattedValue = String(value).trim();
                
                // Preparar el valor para validación según el tipo de campo
                if (fieldDef.value === "Crecimiento") {
                  // Si es un porcentaje, validar el formato después de quitar el símbolo %
                  formattedValue = formattedValue.replace('%', '').replace(',', '.').trim();
                } else if (fieldDef.type === "numeric") {
                  // Para otros campos numéricos, reemplazar comas por puntos
                  formattedValue = formattedValue.replace(',', '.').trim();
                }
                
                if (!fieldDef.validationRegex?.test(formattedValue)) {
                  invalidRows.push(index + 1); // +1 porque los índices comienzan en 0 pero las filas en 1
                }
              }
            });
            
            if (invalidRows.length > 0) {
              const rowsToShow = invalidRows.slice(0, 5);
              const remainingRows = invalidRows.length - 5;
              
              issues.push({
                field: fieldDef.value,
                rows: invalidRows,
                message: `El campo "${fieldDef.label}" tiene valores con formato incorrecto en ${invalidRows.length} filas (filas ${rowsToShow.join(', ')}${remainingRows > 0 ? ` y ${remainingRows} más` : ''}).`
              });
            }
          }
        }
      });
      
      // Verificar que todos los registros tengan número de tienda
      if (hasNumeroMapping) {
        const numHeader = Object.entries(selectedHeaders).find(([header, field]) => field === "N°")?.[0];
        
        if (numHeader) {
          const rowsWithoutNum: number[] = [];
          
          csvData.forEach((row, index) => {
            if (!row[numHeader] || String(row[numHeader]).trim() === '') {
              rowsWithoutNum.push(index + 1);
            }
          });
          
          if (rowsWithoutNum.length > 0) {
            const rowsToShow = rowsWithoutNum.slice(0, 5);
            const remainingRows = rowsWithoutNum.length - 5;
            
            issues.push({
              field: "N°",
              rows: rowsWithoutNum,
              message: `${rowsWithoutNum.length} filas no tienen número de tienda (filas ${rowsToShow.join(', ')}${remainingRows > 0 ? ` y ${remainingRows} más` : ''}).`
            });
          }
        }
      }
    }
    
    setValidationIssues(issues);
    setIsDataValid(issues.length === 0);
  };
  
  // Obtener los campos obligatorios que faltan
  const missingFields = getMissingRequiredFields();
  
  // Verificar si hay algún campo mapeado
  const hasMappedFields = Object.values(selectedHeaders).some(field => field !== '');
  
  // Calcular estadísticas de mapeo
  const getMappingStats = () => {
    const totalFields = expectedFields.length;
    
    // Solo contar campos que estén mapeados a campos válidos presentes en expectedFields
    const validMappedFields = Object.values(selectedHeaders)
      .filter(fieldValue => fieldValue !== '' && expectedFields.some(ef => ef.value === fieldValue));
    
    const mappedFieldsCount = new Set(validMappedFields).size;
    
    return {
      percentage: totalFields > 0 ? Math.round((mappedFieldsCount / totalFields) * 100) : 0,
      mapped: mappedFieldsCount,
      total: totalFields
    };
  };
  
  const mappingStats = getMappingStats();

  return (
    <div className="flex flex-col space-y-6">
      {/* Cabecera y estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Mapeo de Campos para {selectedSemanaNombre}</h3>
          <p className="text-sm text-muted-foreground">
            Asigna las columnas del CSV a los campos de Airtable
          </p>
        </div>
        
        <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm">
          <div className="flex items-center justify-between mb-1">
            <span>Campos mapeados:</span>
            <span className="font-medium">{mappingStats.mapped}/{mappingStats.total}</span>
          </div>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                mappingStats.percentage === 100 ? 'bg-green-500' : 
                mappingStats.percentage >= 40 ? 'bg-blue-500' : 
                'bg-amber-500'
              }`}
              style={{ width: `${mappingStats.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-sm mb-4">
            <div className="flex items-center">
              <Badge variant="secondary" className="mr-1">Auto</Badge>
              <span>Mapeo automático</span>
            </div>
            <div className="flex items-center">
              <Badge variant="destructive" className="mr-1">Requerido</Badge>
              <span>Campo obligatorio</span>
            </div>
            <div className="flex items-center">
              <Badge variant="outline" className="mr-1">Opcional</Badge>
              <span>Campo opcional</span>
            </div>
          </div>
          
          {/* Alertas de validación */}
          {missingFields.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Campos requeridos sin mapear:</p>
                <ul className="list-disc ml-5 mt-1">
                  {missingFields.map(field => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {validationIssues.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md mb-4 flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Problemas con los datos:</p>
                <ul className="list-disc ml-5 mt-1">
                  {validationIssues.map((issue, index) => (
                    <li key={index}>{issue.message}</li>
                  ))}
                </ul>
                <p className="mt-2 text-sm">Corrige estos problemas en tu archivo CSV o ajusta el mapeo para continuar.</p>
              </div>
            </div>
          )}
          
          {/* Tabla de mapeo */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Columna en CSV</TableHead>
                <TableHead>Campo en Airtable</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headers
                .filter(header => !['Tienda y Supervisor', 'tienda y supervisor'].includes(header.toLowerCase()))
                .map((header) => {
                const mappedField = selectedHeaders[header] || '';
                const field = expectedFields.find(f => f.value === mappedField);
                const isRequired = field?.required || false;
                
                // Verificar si este campo tiene algún problema de validación
                const fieldIssue = validationIssues.find(issue => issue.field === mappedField);
                
                return (
                  <TableRow key={header} className={fieldIssue ? "bg-amber-50" : undefined}>
                    <TableCell className="font-medium">{header}</TableCell>
                    <TableCell>
                      <Select
                        value={mappedField === "" ? "none" : mappedField}
                        onChange={(value) => handleMappingChange(header, value)}
                        options={[
                          { value: "none", label: "No mapear" },
                          ...expectedFields.map(field => ({
                            value: field.value,
                            label: `${field.label} ${field.required ? '(Requerido)' : ''}`,
                            disabled: isFieldAlreadyMapped(field.value, header)
                          }))
                        ]}
                        placeholder="Seleccionar campo..."
                        className={`w-full ${fieldIssue ? 'border-amber-500' : ''}`}
                      />
                    </TableCell>
                    <TableCell>
                      {mappedField ? (
                        mappedField === header ? (
                          <Badge variant="secondary" className="flex items-center">
                            <Check className="h-3 w-3 mr-1" />
                            Auto
                          </Badge>
                        ) : (
                          <Badge variant={isRequired ? "destructive" : "outline"}>
                            {isRequired ? 'Requerido' : 'Opcional'}
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          No mapeado
                        </Badge>
                      )}
                      
                      {/* Indicador de problema de validación */}
                      {fieldIssue && (
                        <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200">
                          Formato incorrecto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {field?.description || 'Este campo no se importará'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Información de ayuda */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md flex items-start">
        <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Consejos para el mapeo de datos semanales:</p>
          <ul className="list-disc ml-5 mt-1">
            <li>El campo <strong>N°</strong> es obligatorio para identificar cada tienda.</li>
            <li>Todos los campos numéricos deben contener solo números y puntos decimales cuando corresponda.</li>
            <li>Formatos esperados:</li>
            <ul className="list-disc ml-5">
              <li><strong>N°</strong>: Número entero (ej: 1, 42, 356)</li>
              <li><strong>Horas Aprobadas</strong>: Número (ej: 40, 35.5, 44)</li>
              <li><strong>Crecimiento</strong>: Valor decimal o porcentaje (ej: 5.2 o 5.2%)</li>
              <li><strong>Atencion Deseada</strong>: Número (ej: 4, 5, 6)</li>
            </ul>
            <li>Todos los datos importados serán asociados a la semana <strong>{selectedSemanaNombre}</strong>.</li>
            <li>Si ya existen registros para alguna tienda en esta semana, se actualizarán los datos existentes.</li>
          </ul>
        </div>
      </div>
      
      {/* Botón para continuar */}
      <div className="flex justify-end">
        <Button
          onClick={onContinue}
          disabled={!hasMappedFields || missingFields.length > 0 || validationIssues.length > 0}
          className="flex items-center"
        >
          Continuar a Vista Previa
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 