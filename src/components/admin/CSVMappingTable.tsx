'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select } from '../ui/Select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Info } from 'lucide-react';

interface CSVMappingTableProps {
  headers: string[];
  mapping: Record<string, string>;
  onUpdateMapping: (mapping: Record<string, string>) => void;
}

// Los campos esperados en Airtable
const expectedFields = [
  { value: "N°", label: "N°", required: true, description: "Número de tienda (identificador único) - Formato: Número" },
  { value: "TIENDA", label: "TIENDA", required: false, description: "Nombre de la tienda - Formato: Texto largo" },
  { value: "Horas Aprobadas Value", label: "Horas Aprobadas Value", required: false, description: "Horas de trabajo aprobadas - Formato: Número" },
  { value: "Crecimiento Value", label: "Crecimiento Value", required: false, description: "Porcentaje de crecimiento - Formato: Número (sin el símbolo %)" },
  { value: "Atencion Value", label: "Atencion Value", required: false, description: "Nivel de atención deseada - Formato: Número" }
];

export default function CSVMappingTable({ headers, mapping, onUpdateMapping }: CSVMappingTableProps) {
  const [selectedHeaders, setSelectedHeaders] = useState<Record<string, string>>(mapping);
  
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
  
  const missingFields = getMissingRequiredFields();

  // Validar antes de enviar a la API
  const validateBeforeImport = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const skipped: number[] = [];
    
    // Verificar que al menos N° esté mapeado
    const hasNumeroMapping = Object.values(selectedHeaders).includes("N°");
    
    if (!hasNumeroMapping) {
      errors.push('Debe mapear el campo "N°" para identificar cada tienda.');
    }
    
    // Verificar que los registros tengan valores para los campos obligatorios
    // Si no los tienen, los marcaremos como filas a omitir
    if (hasNumeroMapping) {
      const numField = Object.keys(selectedHeaders).find(key => selectedHeaders[key] === "N°");
      
      // Aquí solo declaramos el tipo, la implementación real está en el componente principal
      const csvData: any[] = [];
      
      if (numField && csvData.length > 0) {
        csvData.forEach((row, index) => {
          if (!row[numField] || row[numField].toString().trim() === '') {
            warnings.push(`La fila ${index + 1} no tiene el número de tienda y será omitida durante la importación.`);
            skipped.push(index);
          }
        });
      }
    }
    
    return errors.length === 0;
  };

  return (
    <div className="flex flex-col space-y-6">
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle>Mapeo de Campos</CardTitle>
          <CardDescription>
            Asigne cada columna del CSV a su campo correspondiente en la tabla de Airtable
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {headers.map((header) => {
                const mappedField = selectedHeaders[header] || '';
                const field = expectedFields.find(f => f.value === mappedField);
                const isRequired = field?.required || false;
                
                return (
                  <TableRow key={header}>
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
                        className="w-full"
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
      
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md flex items-start">
        <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Consejos para el mapeo:</p>
          <ul className="list-disc ml-5 mt-1">
            <li>Solo el campo "N°" es obligatorio para identificar cada tienda. El campo "TIENDA" es opcional.</li>
            <li>Formatos de campo:</li>
            <ul className="list-circle ml-5">
              <li><strong>N°</strong>: Número entero (obligatorio)</li>
              <li><strong>TIENDA</strong>: Texto largo (opcional)</li>
              <li><strong>Horas Aprobadas Value</strong>: Número</li>
              <li><strong>Crecimiento Value</strong>: Número decimal (ej. 10 para 10%)</li>
              <li><strong>Atencion Value</strong>: Número</li>
            </ul>
            <li>El sistema verificará si el número de tienda ya existe para determinar si debe crear un nuevo registro o actualizar uno existente.</li>
            <li>El mapeo automático se aplica cuando el nombre del campo en el CSV coincide exactamente con el esperado en Airtable.</li>
            <li>Los campos que no mapee no se importarán.</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 