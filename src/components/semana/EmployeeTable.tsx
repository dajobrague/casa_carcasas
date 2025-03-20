import React from 'react';
import { 
  IoMdBriefcase,
  IoMdHome, 
  IoMdUmbrella,
  IoMdMedical,
  IoMdSchool,
  IoMdHelp
} from 'react-icons/io';
import { EmpleadoActividad, RecomendacionHora } from '../../components/pdf/utils/types';
import IconsLegend from './IconsLegend';

interface EmployeeTableProps {
  empleados: EmpleadoActividad[];
  horasArray: string[];
  recomendaciones: RecomendacionHora[];
  atencionDeseada: number;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({ 
  empleados, 
  horasArray, 
  recomendaciones,
  atencionDeseada
}) => {
  // Función para obtener el ícono adecuado para cada actividad
  const getActivityIcon = (actividad: string) => {
    switch (actividad.toUpperCase()) {
      case 'TRABAJO':
        return <IoMdBriefcase size={20} />;
      case 'LIBRE':
        return <IoMdHome size={20} />;
      case 'VACACIONES':
        return <IoMdUmbrella size={20} />;
      case 'BAJA MÉDICA':
        return <IoMdMedical size={20} />;
      case 'FORMACIÓN':
        return <IoMdSchool size={20} />;
      case '':  // Si está vacío, se considera como libre
        return <IoMdHome size={20} />;
      default:
        return <IoMdHelp size={20} />;
    }
  };

  // Función para obtener la clase CSS para cada actividad
  const getActivityClass = (actividad: string) => {
    switch (actividad.toUpperCase()) {
      case 'TRABAJO':
        return 'activity-work';
      case 'LIBRE':
        return 'activity-off';
      case 'VACACIONES':
        return 'activity-vacation';
      case 'BAJA MÉDICA':
        return 'activity-sick';
      case 'FORMACIÓN':
        return 'activity-training';
      case '':  // Si está vacío, se considera como libre
        return 'activity-off';
      default:
        return '';
    }
  };

  // Encontrar recomendación para una hora específica
  // Valor mínimo siempre debe ser 1
  const getRecomendacion = (hora: string) => {
    const rec = recomendaciones.find(r => r.hora === hora);
    const valor = rec ? rec.recomendacionRedondeada : 0;
    return valor > 0 ? valor : 1; // Si es 0, retornamos 1 como mínimo
  };

  // Generar columnas para horas en cabecera
  const renderHeaderHours = () => {
    return horasArray.map(hora => (
      <th key={hora} className="hour-cell">
        {hora.substring(0, 5)}
      </th>
    ));
  };

  // Generar celdas para las actividades de un empleado
  const renderEmployeeActivities = (empleado: EmpleadoActividad) => {
    return horasArray.map(hora => {
      // Buscar la actividad para esta hora
      const actividadHora = empleado.horarioAsignado.find(h => h.hora === hora);
      const actividad = actividadHora ? actividadHora.actividad : '';
      const activityClass = getActivityClass(actividad);
      
      return (
        <td 
          key={hora} 
          className={`hour-cell ${activityClass}`}
          style={getActivityStyle(activityClass)}
        >
          <div className="icon-container">
            {getActivityIcon(actividad)}
          </div>
        </td>
      );
    });
  };

  // Obtener estilo inline para actividad
  const getActivityStyle = (activityClass: string) => {
    switch (activityClass) {
      case 'activity-work':
        return {
          backgroundColor: '#e8f4ff',
          color: '#0366d6'
        };
      case 'activity-off':
        return {
          backgroundColor: '#f0f0f0',
          color: '#4a4a4a'
        };
      case 'activity-vacation':
        return {
          backgroundColor: '#d1f7f0',
          color: '#0ca789'
        };
      case 'activity-sick':
        return {
          backgroundColor: '#ffeaea',
          color: '#d73a49'
        };
      case 'activity-training':
        return {
          backgroundColor: '#f5e8ff',
          color: '#6f42c1'
        };
      default:
        return {};
    }
  };

  // Generar celdas para la fila ESTIMADO
  const renderEstimadoRow = () => {
    // Creamos un array para horas de 00 y 30 minutos
    const horasValores: React.ReactNode[] = [];
    
    for (let i = 0; i < horasArray.length; i++) {
      const hora = horasArray[i];
      const isFullHour = hora.endsWith(':00');
      const isHalfHour = hora.endsWith(':30');
      
      if (isFullHour) {
        // Buscamos la próxima media hora
        const nextHour = i + 1 < horasArray.length ? horasArray[i + 1] : null;
        const hasNextHalfHour = nextHour && nextHour.endsWith(':30');
        
        // Si hay una siguiente media hora, ponemos un colspan de 2
        if (hasNextHalfHour) {
          horasValores.push(
            <td 
              key={hora}
              className="summary-value"
              colSpan={2}
              style={{
                backgroundColor: '#f0f6ff',
                color: '#0366d6',
                fontWeight: 600
              }}
            >
              {getRecomendacion(hora)}
            </td>
          );
          // Saltamos la siguiente media hora
          i++;
        } else {
          // Si no hay siguiente media hora, ponemos un colspan de 1
          horasValores.push(
            <td 
              key={hora}
              className="summary-value"
              style={{
                backgroundColor: '#f0f6ff',
                color: '#0366d6',
                fontWeight: 600
              }}
            >
              {getRecomendacion(hora)}
            </td>
          );
        }
      } else if (isHalfHour) {
        // Para medias horas que no tienen una hora completa antes
        horasValores.push(
          <td 
            key={hora}
            className="summary-value"
            style={{
              backgroundColor: '#f0f6ff',
              color: '#0366d6',
              fontWeight: 600
            }}
          >
            {getRecomendacion(hora)}
          </td>
        );
      }
    }
    
    return horasValores;
  };

  // Generar celdas para la fila ATENCIÓN
  const renderAtencionRow = () => {
    // Creamos un array para horas de 00 y 30 minutos
    const horasValores: React.ReactNode[] = [];
    
    for (let i = 0; i < horasArray.length; i++) {
      const hora = horasArray[i];
      const isFullHour = hora.endsWith(':00');
      const isHalfHour = hora.endsWith(':30');
      
      if (isFullHour) {
        // Buscamos la próxima media hora
        const nextHour = i + 1 < horasArray.length ? horasArray[i + 1] : null;
        const hasNextHalfHour = nextHour && nextHour.endsWith(':30');
        
        // Si hay una siguiente media hora, ponemos un colspan de 2
        if (hasNextHalfHour) {
          horasValores.push(
            <td 
              key={hora}
              className="summary-value"
              colSpan={2}
              style={{
                backgroundColor: '#f2fcf5',
                color: '#28a745',
                fontWeight: 600
              }}
            >
              {atencionDeseada}
            </td>
          );
          // Saltamos la siguiente media hora
          i++;
        } else {
          // Si no hay siguiente media hora, ponemos un colspan de 1
          horasValores.push(
            <td 
              key={hora}
              className="summary-value"
              style={{
                backgroundColor: '#f2fcf5',
                color: '#28a745',
                fontWeight: 600
              }}
            >
              {atencionDeseada}
            </td>
          );
        }
      } else if (isHalfHour) {
        // Para medias horas que no tienen una hora completa antes
        horasValores.push(
          <td 
            key={hora}
            className="summary-value"
            style={{
              backgroundColor: '#f2fcf5',
              color: '#28a745',
              fontWeight: 600
            }}
          >
            {atencionDeseada}
          </td>
        );
      }
    }
    
    return horasValores;
  };

  return (
    <div className="employee-table-container" style={{
      padding: '15px',
      backgroundColor: 'white',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <IconsLegend />
      
      <table className="employee-table" style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
      }}>
        <thead>
          <tr>
            <th className="employee-cell" style={{
              width: '25%',
              textAlign: 'left',
              backgroundColor: '#0366d6',
              color: 'white',
              fontWeight: 500,
              letterSpacing: '0.3px',
              padding: '8px 5px',
              paddingLeft: '12px',
              border: '1px solid #0366d6'
            }}>Empleado</th>
            {renderHeaderHours()}
          </tr>
        </thead>
        <tbody>
          {/* Filas de empleados */}
          {empleados.map(empleado => (
            <tr key={empleado.empleado.id} className="employee-row">
              <td className="employee-cell" style={{
                width: '25%',
                textAlign: 'left',
                fontWeight: 600,
                backgroundColor: '#f6f8fa',
                paddingLeft: '12px',
                padding: '8px 5px',
                border: '1px solid #e1e4e8'
              }}>
                {typeof empleado.empleado.nombre === 'string' 
                  ? empleado.empleado.nombre 
                  : empleado.empleado.nombre[0]}
              </td>
              {renderEmployeeActivities(empleado)}
            </tr>
          ))}
          
          {/* Fila ESTIMADO */}
          <tr className="summary-row estimado-row" style={{
            backgroundColor: '#f8fafd',
            borderTop: '2px solid #e1e4e8'
          }}>
            <td className="summary-label" style={{
              fontWeight: 600,
              textAlign: 'left',
              paddingLeft: '12px',
              color: '#24292e',
              padding: '8px 5px',
              border: '1px solid #e1e4e8',
              backgroundColor: '#f6f8fa'
            }}>ESTIMADO</td>
            {renderEstimadoRow()}
          </tr>
          
          {/* Fila ATENCIÓN */}
          <tr className="summary-row atencion-row" style={{
            backgroundColor: '#f8fafd',
            borderTop: '1px solid #e1e4e8'
          }}>
            <td className="summary-label" style={{
              fontWeight: 600,
              textAlign: 'left',
              paddingLeft: '12px',
              color: '#24292e',
              padding: '8px 5px',
              border: '1px solid #e1e4e8',
              backgroundColor: '#f6f8fa'
            }}>ATENCIÓN</td>
            {renderAtencionRow()}
          </tr>
        </tbody>
      </table>

      <style jsx global>{`
        .employee-table th {
          background-color: #0366d6;
          color: white;
          font-weight: 500;
          letter-spacing: 0.3px;
          border: 1px solid #0366d6;
          text-align: center;
          padding: 8px 5px;
          font-size: 0.85rem;
        }
        
        .hour-cell {
          width: 3%;
          font-size: 14px;
          text-align: center;
          padding: 8px 2px;
          border: 1px solid #e1e4e8;
        }
        
        .icon-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
        }
        
        @media print {
          .employee-table-container {
            padding: 10px;
            box-shadow: none;
          }
          
          .employee-table {
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeTable; 