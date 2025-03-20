import React from 'react';
import { DiaLaboral } from '../../components/pdf/utils/types';
import { formatDate, getHalfHourRange } from '../../components/pdf/utils/dateUtils';
import EmployeeTable from './EmployeeTable';
import { IoMdCalendar, IoMdTime } from 'react-icons/io';

interface DaySectionProps {
  dia: DiaLaboral;
  isEven: boolean;
}

const DaySection: React.FC<DaySectionProps> = ({ dia, isEven }) => {
  // Determinar si la tienda está en Francia
  const esFrancia = dia.tienda?.PAIS?.toUpperCase() === 'FRANCIA';
  
  // Generar todas las horas desde apertura hasta cierre
  const horasArray = getHalfHourRange(dia.horarioApertura, dia.horarioCierre, esFrancia);
  
  // Obtener el valor de atención deseada de la tienda
  // Prioridad: tienda.atencionDeseada > tienda.Atención Deseada > tienda.Atencion Deseada > recomendacion.detalles.atencionDeseada > valor por defecto
  const atencionDeseada = 
    (dia.tienda?.atencionDeseada && typeof dia.tienda.atencionDeseada === 'number') 
      ? dia.tienda.atencionDeseada 
      : (dia.tienda?.['Atención Deseada'] && typeof dia.tienda['Atención Deseada'] === 'number')
        ? dia.tienda['Atención Deseada']
        : (dia.tienda?.['Atencion Deseada'] && typeof dia.tienda['Atencion Deseada'] === 'number')
          ? dia.tienda['Atencion Deseada']
          : dia.recomendaciones.recomendacionesPorHora[0]?.detalles.atencionDeseada || 25;
  
  // Determinar el fondo para el día de la semana
  const getDayGradient = (diaSemana: string) => {
    switch (diaSemana.toLowerCase()) {
      case 'lunes':
        return 'linear-gradient(135deg, #2980b9, #3498db)';
      case 'martes':
        return 'linear-gradient(135deg, #16a085, #2ecc71)';
      case 'miércoles':
        return 'linear-gradient(135deg, #8e44ad, #9b59b6)';
      case 'jueves':
        return 'linear-gradient(135deg, #d35400, #e67e22)';
      case 'viernes':
        return 'linear-gradient(135deg, #c0392b, #e74c3c)';
      case 'sábado':
        return 'linear-gradient(135deg, #1abc9c, #27ae60)';
      case 'domingo':
        return 'linear-gradient(135deg, #7f8c8d, #95a5a6)';
      default:
        return 'linear-gradient(135deg, #2980b9, #3498db)';
    }
  };
  
  return (
    <div 
      className="day-section"
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '30px',
        boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
        border: '1px solid #e1e4e8',
        transition: 'transform 0.2s ease',
        backgroundColor: isEven ? '#fdfdfd' : '#ffffff',
      }}>
      <div style={{
        color: 'white',
        padding: '14px 18px',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: getDayGradient(dia.diaSemana),
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '30%',
          height: '100%',
          backgroundImage: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1))',
          pointerEvents: 'none'
        }}></div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <h4 style={{
            margin: 0,
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 600,
            letterSpacing: '0.3px'
          }}>
            <IoMdCalendar style={{ marginRight: '6px', fontSize: '1.2rem' }} /> 
            {formatDate(dia.fecha)} - {dia.diaSemana}
          </h4>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.9rem',
            fontWeight: 500
          }}>
            <IoMdTime style={{ marginRight: '6px', fontSize: '1.2rem' }} /> 
            Horario: {dia.horarioApertura} a {dia.horarioCierre}
          </span>
        </div>
      </div>
      
      <EmployeeTable 
        empleados={dia.empleados}
        horasArray={horasArray}
        recomendaciones={dia.recomendaciones.recomendacionesPorHora}
        atencionDeseada={atencionDeseada}
      />
    </div>
  );
};

export default DaySection; 