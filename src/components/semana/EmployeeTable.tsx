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

interface EmployeeTableProps {
  empleados: EmpleadoActividad[];
  horasArray: string[]; // Este array ya debería venir con formato correcto desde DaySection
  recomendaciones: RecomendacionHora[];
  atencionDeseada: number;
  intervalosApertura?: string[]; // Formato: ["10:00-14:00", "15:00-21:00"]
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({ 
  empleados, 
  horasArray, 
  recomendaciones,
  atencionDeseada,
  intervalosApertura = [] // Por defecto vacío, se usará horasArray completo
}) => {
  // Función para verificar si una hora está dentro de algún intervalo de apertura
  const estaEnIntervaloApertura = (hora: string): boolean => {
    // Si no hay intervalos definidos, asumimos que todas las horas son válidas
    if (!intervalosApertura || intervalosApertura.length === 0) {
      return true;
    }

    // Convertir la hora a minutos para facilitar comparación
    const [h, m] = hora.split(':').map(Number);
    const minutos = h * 60 + m;

    // Verificar si la hora está dentro de algún intervalo
    return intervalosApertura.some(intervalo => {
      const [inicio, fin] = intervalo.split('-');
      const [hInicio, mInicio] = inicio.split(':').map(Number);
      const [hFin, mFin] = fin.split(':').map(Number);
      
      const minutosInicio = hInicio * 60 + mInicio;
      const minutosFin = hFin * 60 + mFin;
      
      return minutos >= minutosInicio && minutos < minutosFin;
    });
  };

  // Filtrar solo las horas que están dentro de los intervalos de apertura
  // Si no hay intervalos definidos, mostramos todas las horas
  const horasFiltradas = React.useMemo(() => {
    if (!intervalosApertura || intervalosApertura.length === 0) {
      return horasArray;
    }
    
    return horasArray.filter(hora => estaEnIntervaloApertura(hora));
  }, [horasArray, intervalosApertura]);
  
  // Modificamos el código para detectar y visualizar los "saltos" entre intervalos
  const renderIntervalGaps = () => {
    // Si no hay suficientes horas para buscar saltos, no hacemos nada
    if (horasFiltradas.length < 2) return [];
    
    const gapColumns: { [key: number]: boolean } = {};
    
    // Detectar saltos entre horas consecutivas
    for (let i = 1; i < horasFiltradas.length; i++) {
      const prevHour = horasFiltradas[i-1];
      const currHour = horasFiltradas[i];
      
      // Convertir a minutos para comparar
      const [prevH, prevM] = prevHour.split(':').map(Number);
      const [currH, currM] = currHour.split(':').map(Number);
      
      const prevMinutes = prevH * 60 + prevM;
      const currMinutes = currH * 60 + currM;
      
      // Si la diferencia es mayor a lo esperado, hay un salto
      const expectedGap = 30; // 30 minutos es el intervalo estándar
      if (currMinutes - prevMinutes > expectedGap) {
        // Marcamos esta posición para mostrar una columna de separación
        gapColumns[i] = true;
      }
    }
    
    return gapColumns;
  };
  
  const gapColumns = renderIntervalGaps();

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

  // Función para determinar si es una hora exacta (sin minutos)
  const esHoraExacta = (hora: string): boolean => {
    return hora.endsWith(':00');
  };
  
  // Función para determinar el colspan para una hora específica
  const calcularColspan = (horaIndex: number): number => {
    // Determinar si es Francia basado en el patrón de intervalos (15 min vs 30 min)
    // Este enfoque es más seguro que buscar valores hardcodeados
    const esFrancia = horasFiltradas.some((hora, index) => {
      if (index > 0) {
        const horaActual = hora.split(':').map(Number);
        const horaAnterior = horasFiltradas[index - 1].split(':').map(Number);
        // Si hay intervalos de 15 minutos, es Francia
        return (
          horaActual[0] === horaAnterior[0] && // Misma hora
          Math.abs(horaActual[1] - horaAnterior[1]) === 15 // Diferencia de 15 min
        );
      }
      return false;
    });
    
    // Francia tiene 4 slots por hora, otros países tienen 2
    const slotsHora = esFrancia ? 4 : 2;
    
    // Contar cuántos slots hay para esta hora específica
    let colspan = 1;
    const horaActual = horasFiltradas[horaIndex].split(':')[0];
    
    // Contar slots consecutivos con la misma hora
    for (let i = horaIndex + 1; i < horasFiltradas.length; i++) {
      const siguienteHora = horasFiltradas[i].split(':')[0];
      if (siguienteHora === horaActual) {
        colspan++;
      } else {
        break;
      }
    }
    
    // Si hay menos slots que el esperado, usar los que hay
    return Math.min(colspan, slotsHora);
  };

  // Generar celdas para las actividades de un empleado
  const renderEmployeeActivities = (empleado: EmpleadoActividad) => {
    return horasFiltradas.map((hora, index) => {
      // Buscar la actividad para esta hora
      const actividadHora = empleado.horarioAsignado.find(h => h.hora === hora);
      const actividad = actividadHora ? actividadHora.actividad : '';
      const activityClass = getActivityClass(actividad);
      
      // Estilos base para la celda
      const baseStyle = getActivityStyle(activityClass);
      
      // Si hay un gap antes de esta hora, añadir borde izquierdo especial
      if (gapColumns[index]) {
        return (
          <td 
            key={hora}
            className={`hour-cell ${activityClass}`}
            style={{
              ...baseStyle,
              borderLeft: '2px dashed #999'
            }}
          >
            <div className="icon-container">
              {getActivityIcon(actividad)}
            </div>
          </td>
        );
      }
      
      // Celda normal
      return (
        <td 
          key={hora}
          className={`hour-cell ${activityClass}`}
          style={baseStyle}
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
    const resultado = [];
    let saltearIndices = new Set<number>();
    
    // Recorrer todas las horas filtradas
    for (let i = 0; i < horasFiltradas.length; i++) {
      // Si este índice debe saltearse, continuar
      if (saltearIndices.has(i)) continue;
      
      const hora = horasFiltradas[i];
      const baseStyle = {
        backgroundColor: '#f0f6ff',
        color: '#0366d6',
        fontWeight: 600,
        textAlign: 'center' as const,
        border: '1px solid #e1e4e8'
      };
      
      // Para horas exactas (10:00, 11:00), usar colspan
      if (esHoraExacta(hora)) {
        const colspan = calcularColspan(i);
        
        // Marcar índices que serán cubiertos por esta celda
        for (let j = 1; j < colspan; j++) {
          if (i + j < horasFiltradas.length) {
            saltearIndices.add(i + j);
          }
        }
        
        // Si hay un gap antes de esta hora, añadir borde izquierdo especial
        if (gapColumns[i]) {
          resultado.push(
            <td 
              key={hora}
              className="summary-value"
              style={{
                ...baseStyle,
                borderLeft: '2px dashed #999'
              }}
              colSpan={colspan}
            >
              {getRecomendacion(hora)}
            </td>
          );
        } else {
          resultado.push(
            <td 
              key={hora}
              className="summary-value"
              style={baseStyle}
              colSpan={colspan}
            >
              {getRecomendacion(hora)}
            </td>
          );
        }
      } else {
        // Para horas no exactas (10:15, 10:30, 10:45), célula con borde pero sin valor
        if (gapColumns[i]) {
          resultado.push(
            <td 
              key={hora}
              className="summary-value summary-empty"
              style={{
                ...baseStyle,
                borderLeft: '2px dashed #999',
                backgroundColor: '#f7faff'
              }}
            >
              &nbsp;
            </td>
          );
        } else {
          resultado.push(
            <td 
              key={hora}
              className="summary-value summary-empty"
              style={{
                ...baseStyle,
                backgroundColor: '#f7faff'
              }}
            >
              &nbsp;
            </td>
          );
        }
      }
    }
    
    return resultado;
  };

  // Generar celdas para la fila ATENCIÓN
  const renderAtencionRow = () => {
    const resultado = [];
    let saltearIndices = new Set<number>();
    
    // Recorrer todas las horas filtradas
    for (let i = 0; i < horasFiltradas.length; i++) {
      // Si este índice debe saltearse, continuar
      if (saltearIndices.has(i)) continue;
      
      const hora = horasFiltradas[i];
      const baseStyle = {
        backgroundColor: '#f2fcf5',
        color: '#28a745',
        fontWeight: 600,
        textAlign: 'center' as const,
        border: '1px solid #e1e4e8'
      };
      
      // Para horas exactas (10:00, 11:00), usar colspan
      if (esHoraExacta(hora)) {
        const colspan = calcularColspan(i);
        
        // Marcar índices que serán cubiertos por esta celda
        for (let j = 1; j < colspan; j++) {
          if (i + j < horasFiltradas.length) {
            saltearIndices.add(i + j);
          }
        }
        
        // Si hay un gap antes de esta hora, añadir borde izquierdo especial
        if (gapColumns[i]) {
          resultado.push(
            <td 
              key={hora}
              className="summary-value"
              style={{
                ...baseStyle,
                borderLeft: '2px dashed #999'
              }}
              colSpan={colspan}
            >
              {atencionDeseada}
            </td>
          );
        } else {
          resultado.push(
            <td 
              key={hora}
              className="summary-value"
              style={baseStyle}
              colSpan={colspan}
            >
              {atencionDeseada}
            </td>
          );
        }
      } else {
        // Para horas no exactas (10:15, 10:30, 10:45), célula con borde pero sin valor
        if (gapColumns[i]) {
          resultado.push(
            <td 
              key={hora}
              className="summary-value summary-empty"
              style={{
                ...baseStyle,
                borderLeft: '2px dashed #999',
                backgroundColor: '#f8fcfa'
              }}
            >
              &nbsp;
            </td>
          );
        } else {
          resultado.push(
            <td 
              key={hora}
              className="summary-value summary-empty"
              style={{
                ...baseStyle,
                backgroundColor: '#f8fcfa'
              }}
            >
              &nbsp;
            </td>
          );
        }
      }
    }
    
    return resultado;
  };

  return (
    <div className="employee-table-container" style={{
      padding: '15px',
      backgroundColor: 'white',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <table className="employee-table" style={{
        width: '100%',
        borderCollapse: 'collapse',
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
            {horasFiltradas.map((hora, index) => (
              <React.Fragment key={hora}>
                {gapColumns[index] ? (
                  // Si hay un gap, mostramos un indicador visual pero SIN crear una columna separada
                  <th className="hour-cell" style={{
                    borderLeft: '2px dashed #0366d6',
                    backgroundColor: '#0366d6'
                  }}>
                    {hora.substring(0, 5)}
                  </th>
                ) : (
                  <th className="hour-cell">
                    {hora.substring(0, 5)}
                  </th>
                )}
              </React.Fragment>
            ))}
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