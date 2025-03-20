import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { TraficoSemanalResponse } from '../../../../components/pdf/utils/types';
import Header from '../../../../components/semana/Header';
import DaySection from '../../../../components/semana/DaySection';

interface PrintableWeekViewPageProps {
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

const PrintableWeekViewPage: React.FC<PrintableWeekViewPageProps> = ({ storeId, weekId }) => {
  const [data, setData] = useState<TraficoSemanalResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Función para imprimir la página
  const handlePrint = () => {
    // Configurar página para impresión horizontal y capturar todo el contenido
    const printStyles = document.createElement('style');
    printStyles.innerHTML = `
      @page {
        size: landscape;
        margin: 10mm;
      }
      body {
        zoom: 0.9;  /* Ajusta el zoom para asegurar que todo el contenido sea visible */
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .days-container {
        padding-bottom: 20px;
      }
      .day-section {
        page-break-inside: avoid;
      }
    `;
    document.head.appendChild(printStyles);
    
    // Dar tiempo al navegador para aplicar los estilos
    setTimeout(() => {
      window.print();
      // Limpiar los estilos después de imprimir
      setTimeout(() => {
        document.head.removeChild(printStyles);
      }, 1000);
    }, 300);
  };
  
  // Cargar los datos de la semana
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/trafico-semana?storeId=${storeId}&semanaId=${weekId}`
        );
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (storeId && weekId) {
      fetchData();
    }
  }, [storeId, weekId]);

  return (
    <>
      <Head>
        <title>
          {data ? `${data.tienda.TIENDA || data.tienda.nombre} - ${data.semana.nombre}` : 'Horario Semanal'}
        </title>
        <meta name="description" content="Vista imprimible de horario semanal" />
        <style>{`
          @media print {
            @page {
              size: landscape;
              margin: 10mm;
            }
            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .printable-page {
              width: 100% !important;
              max-width: none !important;
            }
            .day-section {
              page-break-inside: avoid;
            }
          }
        `}</style>
      </Head>

      <div className="printable-page">
        {/* Contenido principal que se imprimirá */}
        <div className="print-content">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Cargando datos del horario...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <h2>Error al cargar los datos</h2>
              <p>{error}</p>
            </div>
          ) : data ? (
            <div className="weekly-schedule">
              {/* Cabecera con botones y información de la tienda */}
              <Header 
                tienda={data.tienda} 
                semana={data.semana}
                loading={loading}
                error={error}
                onPrint={handlePrint}
              />
              
              {/* Días de la semana */}
              <div className="days-container">
                {data.datos.diasLaborales.map((dia, index) => (
                  <DaySection 
                    key={dia.id}
                    dia={dia}
                    isEven={index % 2 === 0}
                  />
                ))}
              </div>
              
              {/* Pie de página */}
              <div className="page-footer">
                <p>Generado: {new Date().toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })} | Casa Carcasas</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .printable-page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
            Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
        }
        
        .print-content {
          padding: 20px;
          flex: 1;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }
        
        .loading-spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #0f4c81;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-container {
          background-color: #f8d7da;
          color: #721c24;
          padding: 20px;
          border-radius: 4px;
          margin: 20px 0;
        }
        
        .weekly-schedule {
          max-width: 100%;
          margin: 0 auto;
        }
        
        .days-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .page-footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #666;
          font-size: 0.8rem;
        }
        
        @media print {
          .printable-page {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .print-content {
            padding: 5mm !important;
          }
          
          .day-section {
            page-break-inside: avoid;
            margin-bottom: 15px;
          }
          
          .days-container {
            gap: 10px !important;
          }
        }
      `}</style>
    </>
  );
};

export default PrintableWeekViewPage; 