'use client';

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '../ui/Select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Check, Info } from 'lucide-react';

export interface FieldOption {
  value: string;
  label: string;
  required?: boolean;
  description?: string;
}

export interface FieldMappingSelectProps {
  sourceFields: string[];
  targetFields: FieldOption[];
  mapping: Record<string, string>;
  onUpdateMapping: (mapping: Record<string, string>) => void;
  title?: string;
  description?: string;
}

export default function FieldMappingSelect({
  sourceFields,
  targetFields,
  mapping,
  onUpdateMapping,
  title = 'Mapeo de Campos',
  description = 'Asigne cada campo de origen a su campo correspondiente',
}: FieldMappingSelectProps) {
  const [selectedMapping, setSelectedMapping] = useState<Record<string, string>>(mapping);
  
  // Verificar si un campo objetivo ya está mapeado a un campo origen
  const isFieldAlreadyMapped = (fieldValue: string, currentSource: string) => {
    return Object.entries(selectedMapping).some(([source, target]) => 
      target === fieldValue && source !== currentSource
    );
  };
  
  // Actualizar el mapping cuando cambia una selección
  const handleMappingChange = (sourceField: string, targetField: string) => {
    // Si el campo es "none", convertirlo a cadena vacía para mantener la lógica existente
    const fieldValue = targetField === "none" ? "" : targetField;
    const newMapping = { ...selectedMapping, [sourceField]: fieldValue };
    setSelectedMapping(newMapping);
    onUpdateMapping(newMapping);
  };
  
  // Identificar campos requeridos que aún no han sido mapeados
  const getMissingRequiredFields = () => {
    const mappedTargets = Object.values(selectedMapping);
    return targetFields
      .filter(field => field.required && !mappedTargets.includes(field.value))
      .map(field => field.value);
  };
  
  const missingFields = getMissingRequiredFields();

  return (
    <div className="flex flex-col space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 text-sm mb-4">
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
                <TableHead>Campo de origen</TableHead>
                <TableHead>Campo de destino</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceFields.map((sourceField) => {
                const targetField = selectedMapping[sourceField] || '';
                const fieldOption = targetFields.find(f => f.value === targetField);
                const isRequired = fieldOption?.required || false;
                
                return (
                  <TableRow key={sourceField}>
                    <TableCell className="font-medium">{sourceField}</TableCell>
                    <TableCell>
                      <Select
                        value={targetField === "" ? "none" : targetField}
                        onChange={(value) => handleMappingChange(sourceField, value)}
                        options={[
                          { value: "none", label: "No mapear" },
                          ...targetFields.map(field => ({
                            value: field.value,
                            label: `${field.label} ${field.required ? '(Requerido)' : ''}`,
                            disabled: isFieldAlreadyMapped(field.value, sourceField)
                          }))
                        ]}
                        placeholder="Seleccionar campo..."
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      {targetField ? (
                        targetField === sourceField ? (
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
                      {fieldOption?.description || 'Este campo no se mapeará'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 