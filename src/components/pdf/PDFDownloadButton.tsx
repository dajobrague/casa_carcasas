import React from 'react';
import { PDFDownloadLink, Document, Page } from '@react-pdf/renderer';
import { PDFHeader } from './sections/PDFHeader';
import { DaySection } from './sections/DaySection';
import { WeeklySummary } from './sections/WeeklySummary';
import { PDFFooter } from './sections/PDFFooter';
import { styles } from './styles/pdfStyles';
import { TraficoSemanalResponse } from './utils/types';

interface PDFDownloadButtonProps {
  storeId: string;
  weekId: string;
  fileName?: string;
}

const fetchData = async (storeId: string, weekId: string): Promise<TraficoSemanalResponse> => {
  const response = await fetch(
    `/api/trafico-semana?storeId=${storeId}&semanaId=${weekId}`
  );
  
  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
};

export const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({ 
  storeId, 
  weekId, 
  fileName = 'reporte.pdf' 
}) => {
  const PDF = React.memo(() => {
    const [data, setData] = React.useState<TraficoSemanalResponse | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
      const loadData = async () => {
        try {
          setLoading(true);
          const jsonData = await fetchData(storeId, weekId);
          setData(jsonData);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }, []);

    if (loading) {
      return (
        <Document>
          <Page size="A4">
            <PDFHeader 
              tienda={{ 
                id: '', 
                nombre: 'Cargando...', 
                codigo: '',
                atencionDeseada: 0,
                crecimiento: 0 
              }} 
              semana={{ 
                id: '', 
                nombre: '', 
                fechaInicio: '', 
                fechaFin: '' 
              }} 
            />
          </Page>
        </Document>
      );
    }

    if (error || !data) {
      return (
        <Document>
          <Page size="A4">
            <PDFHeader 
              tienda={{ 
                id: '', 
                nombre: 'Error', 
                codigo: '',
                atencionDeseada: 0,
                crecimiento: 0 
              }} 
              semana={{ 
                id: '', 
                nombre: '', 
                fechaInicio: '', 
                fechaFin: '' 
              }} 
            />
          </Page>
        </Document>
      );
    }

    return (
      <Document title={`Reporte semanal - ${data.tienda.nombre} - ${data.semana.nombre}`}>
        <Page size="A4" style={styles.page}>
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
          
          <WeeklySummary 
            resumen={data.datos.resumenSemanal} 
            diasLaborales={data.datos.diasLaborales}
          />
          
          <PDFFooter />
        </Page>
      </Document>
    );
  });
  
  PDF.displayName = 'PDFDocument';

  return (
    <PDFDownloadLink 
      document={<PDF />} 
      fileName={fileName}
      style={{
        display: 'inline-block',
        padding: '8px 16px',
        backgroundColor: '#4a90e2',
        color: 'white',
        borderRadius: '4px',
        textDecoration: 'none',
        fontWeight: 'bold',
        marginRight: '10px'
      }}
    >
      {({ blob, url, loading, error }) => 
        loading ? 'Preparando documento...' : 'Descargar PDF'
      }
    </PDFDownloadLink>
  );
}; 