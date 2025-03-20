import React from 'react';
import Link from 'next/link';

interface PDFGenerationLinkProps {
  storeId: string;
  semanaId: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Componente que proporciona un enlace para generar un PDF de tráfico semanal
 * 
 * Puede usarse como:
 * <PDFGenerationLink storeId="123" semanaId="456">
 *   Generar PDF
 * </PDFGenerationLink>
 * 
 * O con un ícono:
 * <PDFGenerationLink storeId="123" semanaId="456">
 *   <PdfIcon /> Descargar PDF
 * </PDFGenerationLink>
 */
export const PDFGenerationLink: React.FC<PDFGenerationLinkProps> = ({
  storeId,
  semanaId,
  className = '',
  style = {},
  children = 'Generar PDF'
}) => {
  const linkStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#0f4c81',
    color: 'white',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: 'bold',
    ...style
  };

  return (
    <Link 
      href={`/api/generate-pdf?storeId=${storeId}&semanaId=${semanaId}`}
      className={`pdf-generation-link ${className}`}
      style={linkStyle}
    >
      {children}
    </Link>
  );
};

// Versión para botón
export const PDFGenerationButton: React.FC<PDFGenerationLinkProps> = (props) => {
  return (
    <PDFGenerationLink 
      {...props}
      style={{
        cursor: 'pointer',
        border: 'none',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        transition: 'background-color 0.3s',
        ...props.style
      }}
    />
  );
}; 