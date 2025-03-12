import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { generarYMostrarPDFSemana } from '@/lib/pdf';
import { Spinner } from './Spinner';

interface PdfButtonProps {
  semanaId: string;
  storeId: string;
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

/**
 * Botón para generar y mostrar un PDF semanal
 */
export function PdfButton({ 
  semanaId,
  storeId,
  label = 'Generar PDF',
  className,
  variant = 'primary',
  size = 'md',
  disabled = false,
  ...buttonProps
}: PdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerarPDF = async () => {
    if (isLoading) return;
    
    try {
      await generarYMostrarPDFSemana(semanaId, storeId, setIsLoading);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGenerarPDF}
      className={`relative ${className || ''}`}
      disabled={isLoading || disabled}
      variant={variant}
      size={size}
      {...buttonProps}
    >
      {isLoading && (
        <span className="absolute left-3">
          <Spinner size="sm" />
        </span>
      )}
      {label}
    </Button>
  );
} 