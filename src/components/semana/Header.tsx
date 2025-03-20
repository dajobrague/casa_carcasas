import React from 'react';
import { useRouter } from 'next/router';
import { Tienda, Semana } from '../../components/pdf/utils/types';
import { formatDate } from '../../components/pdf/utils/dateUtils';
import { 
  IoMdBusiness, 
  IoMdCalendar,
  IoMdBriefcase,
  IoMdHome, 
  IoMdUmbrella,
  IoMdMedical,
  IoMdSchool,
  IoMdWater,
  IoMdAlarm
} from 'react-icons/io';

interface HeaderProps {
  tienda: Tienda;
  semana: Semana;
  loading: boolean;
  error: string | null;
  onPrint: () => void;
}

const Header: React.FC<HeaderProps> = ({ tienda, semana, loading, error, onPrint }) => {
  const router = useRouter();
  
  // Obtener el nombre correcto de la tienda: priorizar TIENDA sobre nombre
  const nombreTienda = tienda.TIENDA || tienda.nombre || 'Tienda';
  
  // Obtener información adicional de supervisor si existe
  const supervisor = tienda.supervisor || '';
  
  return (
    <>
      {/* Header con acciones - no se imprime */}
      <div 
        className="no-print"
        style={{
          backgroundColor: '#f6f8fa',
          padding: '16px 24px',
          borderBottom: '1px solid #e1e4e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <h1 style={{
          margin: 0,
          fontSize: '1.5rem',
          color: '#0366d6',
          fontWeight: 600
        }}>
          Horario de la Semana
        </h1>
      </div>

      {/* Cabecera de la tienda y semana */}
      <div 
        className="print-header"
        style={{
          marginBottom: '30px',
          padding: '20px 24px',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e1e4e8'
        }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <h2 style={{
            margin: 0,
            color: '#0366d6',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '1.8rem',
            paddingBottom: '8px',
            borderBottom: '1px solid #eaecef'
          }}>
            <IoMdBusiness style={{ color: '#0366d6', fontSize: '1.7rem' }} />
            {nombreTienda} 
            {tienda['N°'] && (
              <span style={{
                fontSize: '0.8em',
                backgroundColor: '#0366d6',
                color: 'white',
                padding: '3px 10px',
                borderRadius: '20px',
                marginLeft: '10px',
                fontWeight: 500
              }}>
                N° {tienda['N°']}
              </span>
            )}
          </h2>
          {supervisor && (
            <div style={{
              fontSize: '0.95rem',
              color: '#586069'
            }}>
              Supervisor: {supervisor}
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: '5px'
          }}>
            <h3 style={{
              margin: 0,
              fontWeight: 500,
              color: '#24292e',
              fontSize: '1.2rem'
            }}>
              Horario Semanal: {semana.nombre}
            </h3>
            <p style={{
              margin: 0,
              color: '#586069',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 500
            }}>
              <IoMdCalendar style={{ marginRight: '6px', color: '#666' }} />
              Periodo: {formatDate(semana.fechaInicio)} al {formatDate(semana.fechaFin)}
            </p>
          </div>

          {/* Leyenda unificada de actividades */}
          <div className="activities-legend" style={{
            marginTop: '15px',
            paddingTop: '15px',
            borderTop: '1px solid #eaecef'
          }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                backgroundColor: '#fbfbfb',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #f0f0f0'
              }}>
                <span style={{
                  backgroundColor: '#e3f2fd',
                  color: '#0366d6',
                  width: '25px',
                  height: '25px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IoMdBriefcase size={18} />
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>Trabajo</span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                backgroundColor: '#fbfbfb',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #f0f0f0'
              }}>
                <span style={{
                  backgroundColor: '#fff8e1',
                  color: '#ffa000',
                  width: '25px',
                  height: '25px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IoMdAlarm size={18} />
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>Descanso</span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                backgroundColor: '#fbfbfb',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #f0f0f0'
              }}>
                <span style={{
                  backgroundColor: '#f0f0f0',
                  color: '#4a4a4a',
                  width: '25px',
                  height: '25px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IoMdHome size={18} />
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>En casa</span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                backgroundColor: '#fbfbfb',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #f0f0f0'
              }}>
                <span style={{
                  backgroundColor: '#d1f7f0',
                  color: '#0ca789',
                  width: '25px',
                  height: '25px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IoMdUmbrella size={18} />
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>Vacaciones</span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                backgroundColor: '#fbfbfb',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #f0f0f0'
              }}>
                <span style={{
                  backgroundColor: '#ffeaea',
                  color: '#d73a49',
                  width: '25px',
                  height: '25px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IoMdMedical size={18} />
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>Baja</span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                backgroundColor: '#fbfbfb',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #f0f0f0'
              }}>
                <span style={{
                  backgroundColor: '#f5e8ff',
                  color: '#6f42c1',
                  width: '25px',
                  height: '25px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IoMdSchool size={18} />
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>Formación</span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                backgroundColor: '#fbfbfb',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #f0f0f0'
              }}>
                <span style={{
                  backgroundColor: '#fff0f7',
                  color: '#e83e8c',
                  width: '25px',
                  height: '25px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <IoMdWater size={18} />
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>Lactancia</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print-header {
            margin-bottom: 15px !important;
            padding: 10px 15px !important;
            box-shadow: none !important;
            border-bottom: 2px solid #0366d6 !important;
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            break-inside: avoid !important;
          }
          
          /* Estilos para la leyenda en el PDF */
          .activities-legend {
            margin-top: 10px !important;
            padding-top: 10px !important;
            display: flex !important;
            justify-content: center !important;
          }
          
          .activities-legend > div {
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            gap: 10px !important;
          }
          
          .activities-legend span {
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
};

export default Header; 