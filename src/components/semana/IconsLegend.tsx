import React from 'react';
import { 
  IoMdBriefcase,
  IoMdHome, 
  IoMdUmbrella,
  IoMdMedical,
  IoMdSchool
} from 'react-icons/io';

const IconsLegend: React.FC = () => {
  return (
    <div className="icons-legend" style={{
      marginBottom: '15px',
      border: '1px solid #d0d0d0',
      padding: '12px',
      borderRadius: '6px',
      backgroundColor: '#f9f9f9',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <h5 style={{
        margin: '0 0 10px 0',
        fontSize: '0.9rem',
        color: '#333',
        fontWeight: 600,
        borderBottom: '1px solid #eaeaea',
        paddingBottom: '6px'
      }}>Leyenda de Actividades:</h5>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          backgroundColor: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          border: '1px solid #f0f0f0'
        }}>
          <span style={{
            backgroundColor: '#e8f4ff',
            color: '#0366d6',
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            <IoMdBriefcase size={20} />
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>TRABAJO</span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          backgroundColor: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          border: '1px solid #f0f0f0'
        }}>
          <span style={{
            backgroundColor: '#f0f0f0',
            color: '#4a4a4a',
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            <IoMdHome size={20} />
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>LIBRE</span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          backgroundColor: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          border: '1px solid #f0f0f0'
        }}>
          <span style={{
            backgroundColor: '#d1f7f0',
            color: '#0ca789',
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            <IoMdUmbrella size={20} />
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>VACACIONES</span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          backgroundColor: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          border: '1px solid #f0f0f0'
        }}>
          <span style={{
            backgroundColor: '#ffeaea',
            color: '#d73a49',
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            <IoMdMedical size={20} />
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>BAJA MÉDICA</span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          backgroundColor: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          border: '1px solid #f0f0f0'
        }}>
          <span style={{
            backgroundColor: '#f5e8ff',
            color: '#6f42c1',
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            <IoMdSchool size={20} />
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>FORMACIÓN</span>
        </div>
      </div>
    </div>
  );
};

export default IconsLegend; 