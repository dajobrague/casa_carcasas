import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, PDFViewer } from '@react-pdf/renderer';
import { PDFHeader } from './sections/PDFHeader';
import { DaySection } from './sections/DaySection';
import { PDFFooter } from './sections/PDFFooter';
import { styles } from './styles/pdfStyles';
import { TraficoSemanalResponse } from './utils/types';

interface PDFGeneratorProps {
  storeId: string;
  semanaId: string;
  onGenerated?: (success: boolean) => void;
}

export const PDFGenerator: React.FC<PDFGeneratorProps> = ({ 
  storeId, 
  semanaId, 
  onGenerated 
}) => {
  const [data, setData] = useState<TraficoSemanalResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const onGeneratedCalledRef = useRef<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!storeId || !semanaId || !loading) return;
        
        const response = await fetch(
          `/api/trafico-semana?storeId=${storeId}&semanaId=${semanaId}`
        );
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData);
        
        if (onGenerated && !onGeneratedCalledRef.current) {
          onGenerated(true);
          onGeneratedCalledRef.current = true;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        
        if (onGenerated && !onGeneratedCalledRef.current) {
          onGenerated(false);
          onGeneratedCalledRef.current = true;
        }
      } finally {
        setLoading(false);
      }
    };

    if (storeId && semanaId && loading) {
      fetchData();
    }
  }, [storeId, semanaId, onGenerated]);

  if (loading) {
    return <div>Cargando datos para generar el PDF...</div>;
  }

  if (error || !data) {
    return <div>Error al generar el PDF: {error}</div>;
  }

  return (
    <PDFViewer style={styles.viewer}>
      <Document title={`Horarios Semana: ${data.semana.nombre} - ${data.tienda.nombre}`}>
        <Page size="A4" orientation="landscape" style={styles.page} wrap>
          <PDFHeader 
            tienda={data.tienda} 
            semana={data.semana} 
          />
          
          {data.datos.diasLaborales.map((dia, index) => (
            <DaySection 
              key={dia.id} 
              dia={dia}
              isEven={index % 2 === 0} 
            />
          ))}
          
          <PDFFooter />
        </Page>
      </Document>
    </PDFViewer>
  );
}; 