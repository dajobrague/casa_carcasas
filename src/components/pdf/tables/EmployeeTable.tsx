import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles/tableStyles';
import { EmpleadoActividad, RecomendacionHora } from '../utils/types';
import { getHalfHourRange } from '../utils/dateUtils';

interface EmployeeTableProps {
  empleados: EmpleadoActividad[];
  horaInicio?: string;
  horaFin?: string;
  includeObservations?: boolean;
  recomendaciones?: RecomendacionHora[];
  atencionDeseada?: number;
  esFrancia?: boolean;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ 
  empleados,
  horaInicio = "09:00",
  horaFin = "21:00",
  includeObservations = false,
  recomendaciones = [],
  atencionDeseada = 0,
  esFrancia = false
}) => {
  // Generar array de horas a mostrar (por cada media hora)
  const horasArray = getHalfHourRange(horaInicio, horaFin, esFrancia);
  
  // Funciones auxiliares
  const getActivityColor = (actividad: string) => {
    switch (actividad.toUpperCase()) {
      case 'TRABAJO': return styles.activityWork;
      case 'LIBRE': return styles.activityOff;
      case 'VACACIONES': return styles.activityVacation;
      case 'BAJA MÉDICA': return styles.activitySick;
      case 'FORMACIÓN': return styles.activityTraining;
      default: return styles.activityEmpty;
    }
  };
  
  const getActivitySymbol = (actividad: string) => {
    switch (actividad.toUpperCase()) {
      case 'TRABAJO': return '■'; // Unicode cuadrado relleno
      case 'LIBRE': return '✖'; // Unicode X más visible
      case 'VACACIONES': return '▲'; // Unicode triángulo relleno
      case 'BAJA MÉDICA': return '✚'; // Unicode cruz más visible
      case 'FORMACIÓN': return '●'; // Unicode círculo relleno
      default: return ' ';
    }
  };
  
  // Función para obtener la actividad de un empleado en una hora específica
  const getEmployeeActivity = (empleado: EmpleadoActividad, hora: string) => {
    const actividadHora = empleado.horarioAsignado.find(h => h.hora === hora);
    return actividadHora ? actividadHora.actividad : '';
  };

  // Filtrar solo las horas completas para las filas de ESTIMADO y ATENCIÓN
  const horasCompletas = horasArray.filter(hora => hora.endsWith(':00'));
  
  // Para encontrar la recomendación para una hora específica
  const getRecomendacion = (hora: string) => {
    const rec = recomendaciones.find(r => r.hora === hora);
    return rec ? rec.recomendacionRedondeada : 0;
  };
  
  // Leyenda de iconos
  const renderLegend = () => (
    <View style={styles.legendContainer}>
      <Text style={styles.legendTitle}>Leyenda:</Text>
      <View style={styles.legendItems}>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, styles.activityWork]}>
            <Text style={styles.legendSymbol}>■</Text>
          </View>
          <Text style={styles.legendText}>TRABAJO</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, styles.activityOff]}>
            <Text style={styles.legendSymbol}>✖</Text>
          </View>
          <Text style={styles.legendText}>LIBRE</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, styles.activityVacation]}>
            <Text style={styles.legendSymbol}>▲</Text>
          </View>
          <Text style={styles.legendText}>VACACIONES</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, styles.activitySick]}>
            <Text style={styles.legendSymbol}>✚</Text>
          </View>
          <Text style={styles.legendText}>BAJA MÉDICA</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, styles.activityTraining]}>
            <Text style={styles.legendSymbol}>●</Text>
          </View>
          <Text style={styles.legendText}>FORMACIÓN</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View>
      {renderLegend()}
      <View style={styles.compactTable}>
        {/* Encabezado de la tabla */}
        <View style={styles.tableHeader}>
          <View style={styles.employeeCell}>
            <Text style={styles.tableHeaderText}>Empleado</Text>
          </View>
          
          {horasArray.map(hora => (
            <View key={hora} style={styles.halfHourCell}>
              <Text style={styles.smallHeaderText}>
                {hora.substring(0, 5)}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Filas de empleados */}
        {empleados.map(empleado => (
          <View key={empleado.empleado.id} style={styles.tableRow}>
            <View style={styles.employeeCell}>
              <Text style={styles.employeeNameText}>
                {typeof empleado.empleado.nombre === 'string' 
                  ? empleado.empleado.nombre 
                  : empleado.empleado.nombre[0]}
              </Text>
            </View>
            
            {horasArray.map(hora => {
              const actividad = getEmployeeActivity(empleado, hora);
              return (
                <View key={hora} style={[styles.halfHourCell, getActivityColor(actividad)]}>
                  <Text style={styles.activityText}>
                    {actividad ? getActivitySymbol(actividad) : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
        
        {/* Fila ESTIMADO */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelCell}>
            <Text style={styles.summaryLabelText}>ESTIMADO</Text>
          </View>
          
          {horasArray.map((hora, index) => {
            // Solo mostrar valor en horas completas (9:00, 10:00, etc.)
            const isFullHour = hora.endsWith(':00');
            const isHalfHour = hora.endsWith(':30');
            const nextHora = isHalfHour ? null : horasArray[index + 1];
            const showValue = isFullHour;
            
            // Si es hora completa, mostrar el valor y expandir para cubrir la media hora siguiente
            if (showValue && nextHora) {
              return (
                <View key={hora} style={styles.hourSummaryCell}>
                  <Text style={styles.summaryValueText}>
                    {getRecomendacion(hora)}
                  </Text>
                </View>
              );
            } 
            // Si es media hora, no mostrar nada (ya está cubierto por la hora anterior)
            else if (isHalfHour) {
              return null;
            } 
            // Última hora que no tiene media hora siguiente
            else if (isFullHour) {
              return (
                <View key={hora} style={styles.halfHourCell}>
                  <Text style={styles.summaryValueText}>
                    {getRecomendacion(hora)}
                  </Text>
                </View>
              );
            }
            
            return null;
          }).filter(Boolean)}
        </View>
        
        {/* Fila ATENCIÓN */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelCell}>
            <Text style={styles.summaryLabelText}>ATENCIÓN</Text>
          </View>
          
          {horasArray.map((hora, index) => {
            // Solo mostrar valor en horas completas (9:00, 10:00, etc.)
            const isFullHour = hora.endsWith(':00');
            const isHalfHour = hora.endsWith(':30');
            const nextHora = isHalfHour ? null : horasArray[index + 1];
            const showValue = isFullHour;
            
            // Si es hora completa, mostrar el valor y expandir para cubrir la media hora siguiente
            if (showValue && nextHora) {
              return (
                <View key={hora} style={styles.hourSummaryCell}>
                  <Text style={styles.summaryValueText}>
                    {atencionDeseada}
                  </Text>
                </View>
              );
            } 
            // Si es media hora, no mostrar nada (ya está cubierto por la hora anterior)
            else if (isHalfHour) {
              return null;
            } 
            // Última hora que no tiene media hora siguiente
            else if (isFullHour) {
              return (
                <View key={hora} style={styles.halfHourCell}>
                  <Text style={styles.summaryValueText}>
                    {atencionDeseada}
                  </Text>
                </View>
              );
            }
            
            return null;
          }).filter(Boolean)}
        </View>
      </View>
    </View>
  );
}; 