import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { PDFGenerator, PDFDownloadButton } from '../../../../components/pdf';
import Head from 'next/head';

interface PDFViewerPageProps {
  storeId: string;
  weekId: string;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { storeId, weekId } = context.params || {};
  
  if (!storeId || !weekId) {
    return {
      notFound: true
    };
  }
  
  return {
    props: {
      storeId,
      weekId
    }
  };
};

const PDFViewerPage: React.FC<PDFViewerPageProps> = ({ storeId, weekId }) => {
  const router = useRouter();
  const [isGenerated, setIsGenerated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Memoizamos la función handleGenerationComplete para evitar re-renderizados
  const handleGenerationComplete = useCallback((success: boolean) => {
    setLoading(false);
    setIsGenerated(success);
  }, []);
  
  // Obtener información de la tienda y semana para un título más descriptivo
  const [storeName, setStoreName] = useState('');
  const [weekName, setWeekName] = useState('');
  
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        if (!storeId || !weekId) return;
        const response = await fetch(`/api/trafico-semana?storeId=${storeId}&semanaId=${weekId}&minimal=true`);
        if (response.ok) {
          const data = await response.json();
          setStoreName(data.tienda?.nombre || '');
          setWeekName(data.semana?.nombre || '');
        }
      } catch (error) {
        console.error('Error al obtener información:', error);
      }
    };
    
    fetchInfo();
  }, [storeId, weekId]);
  
  return (
    <>
      <Head>
        <title>{`${storeName ? `${storeName} - ` : ''}Reporte Semanal PDF${weekName ? ` - ${weekName}` : ''}`}</title>
        <meta name="description" content="Visualizador y generador de PDF para reportes semanales de tráfico y personal" />
      </Head>
      
      <div className="pdf-container">
        <div className="pdf-actions">
          <h1>Reporte Semanal - PDF</h1>
          <div className="store-info">
            <p><strong>Tienda:</strong> {storeName || storeId}</p>
            <p><strong>Semana:</strong> {weekName || weekId}</p>
          </div>
          
          <div className="action-buttons">
            {loading ? (
              <div className="loading-btn">Generando PDF...</div>
            ) : isGenerated ? (
              <PDFDownloadButton 
                storeId={storeId} 
                weekId={weekId}
                fileName={`Reporte_${storeName || storeId}_${weekName || weekId}.pdf`}
              />
            ) : (
              <div className="error-message">
                Error al generar el PDF. Por favor, inténtelo de nuevo.
              </div>
            )}
            
            <button 
              onClick={() => router.back()}
              className="back-button"
            >
              Volver
            </button>
          </div>
        </div>
        
        <div className="pdf-viewer">
          <PDFGenerator 
            storeId={storeId} 
            semanaId={weekId}
            onGenerated={handleGenerationComplete}
          />
        </div>
      </div>
      
      <style jsx>{`
        .pdf-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        
        .pdf-actions {
          padding: 15px 20px;
          background-color: #f5f5f5;
          border-bottom: 1px solid #ddd;
        }
        
        .pdf-actions h1 {
          margin: 0 0 15px 0;
          font-size: 1.5rem;
          color: #0f4c81;
        }
        
        .store-info {
          margin-bottom: 15px;
        }
        
        .store-info p {
          margin: 5px 0;
        }
        
        .action-buttons {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 15px;
        }
        
        .loading-btn {
          padding: 10px 16px;
          background-color: #95a5a6;
          color: white;
          border-radius: 4px;
          font-weight: bold;
        }
        
        .error-message {
          padding: 10px 16px;
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }
        
        .pdf-viewer {
          flex: 1;
          overflow: hidden;
          position: relative;
        }
        
        .back-button {
          padding: 8px 16px;
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .back-button:hover {
          background-color: #e0e0e0;
        }
      `}</style>
    </>
  );
};

export default PDFViewerPage; 