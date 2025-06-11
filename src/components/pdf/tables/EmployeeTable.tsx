import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { EmpleadoActividad, RecomendacionHora } from '../utils/types';
import { styles } from '../styles/tableStyles';

// Función auxiliar para generar rangos de horas
const getHourRangeFromStartAndEnd = (startHour: string, endHour: string): string[] => {
  // Comprobar si estamos usando el nuevo formato con múltiples intervalos
  if (startHour && startHour.includes('-')) {
    const result: string[] = [];
    const intervalos = startHour.split(',');
    
    // Procesar cada intervalo
    intervalos.forEach(intervalo => {
      const [inicio, fin] = intervalo.split('-');
      if (!inicio || !fin) return;
      
      // Convertir a horas enteras para cada intervalo
      const horaInicio = parseInt(inicio.split(':')[0]);
      const horaFin = parseInt(fin.split(':')[0]);
      
      // Añadir cada hora del intervalo
      for (let i = horaInicio; i < horaFin; i++) {
        result.push(`${i.toString().padStart(2, '0')}:00`);
      }
    });
    
    return result;
  }
  
  // Formato antiguo: un solo intervalo
  const start = parseInt(startHour.split(':')[0]);
  const end = parseInt(endHour.split(':')[0]);
  
  const hours = [];
  for (let i = start; i < end; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }
  
  return hours;
};

interface EmployeeTableProps {
  empleados: EmpleadoActividad[];
  horaInicio: string;
  horaFin: string;
  includeObservations?: boolean;
  recomendaciones?: RecomendacionHora[];
  atencionDeseada?: number;
  esFrancia?: boolean;
  showLegend?: boolean;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ 
  empleados,
  horaInicio,
  horaFin,
  includeObservations = false,
  recomendaciones = [],
  atencionDeseada = 0,
  esFrancia = false,
  showLegend = false
}) => {
  // El horario de trabajo (ej. ["09:00", "10:00", "11:00", ...])
  const horas = getHourRangeFromStartAndEnd(horaInicio, horaFin);

  // Objeto para almacenar las recomendaciones por hora
  const recomendacionesPorHora: { [key: string]: RecomendacionHora } = {};
  recomendaciones.forEach(rec => {
    recomendacionesPorHora[rec.hora] = rec;
  });

  // Función para determinar el color de una actividad
  const getActivityColor = (actividad: string) => {
    if (!actividad) return styles.activityEmpty;
    
    const actividadLC = actividad.toLowerCase();
    
    if (actividadLC.includes('trabajo') || actividadLC === 'work' || actividadLC === 'travail') {
      return styles.activityWork;
    } else if (actividadLC.includes('descanso') || actividadLC === 'off' || actividadLC === 'repos') {
      return styles.activityOff;
    } else if (actividadLC.includes('vacaciones') || actividadLC === 'vacation' || actividadLC === 'vacances') {
      return styles.activityVacation;
    } else if (actividadLC.includes('enfermedad') || actividadLC === 'sick' || actividadLC === 'maladie') {
      return styles.activitySick;
    } else if (actividadLC.includes('formación') || actividadLC.includes('formacion') || actividadLC === 'training' || actividadLC === 'formation') {
      return styles.activityTraining;
    } else {
      return styles.activityEmpty;
    }
  };

  // Función para obtener un símbolo para una actividad
  const getActivitySymbol = (actividad: string) => {
    if (!actividad) return '';
    
    const actividadLC = actividad.toLowerCase();
    
    if (actividadLC.includes('trabajo') || actividadLC === 'work' || actividadLC === 'travail') {
      return 'W';
    } else if (actividadLC.includes('descanso') || actividadLC === 'off' || actividadLC === 'repos') {
      return 'D';
    } else if (actividadLC.includes('vacaciones') || actividadLC === 'vacation' || actividadLC === 'vacances') {
      return 'V';
    } else if (actividadLC.includes('formación') || actividadLC.includes('formacion') || actividadLC === 'training' || actividadLC === 'formation') {
      return 'F';
    } else if (actividadLC.includes('enfermedad') || actividadLC === 'sick' || actividadLC === 'maladie') {
      return 'E';
    } else if (actividadLC.includes('baja') || actividadLC === 'leave' || actividadLC === 'congé') {
      return 'B';
    } else {
      return 'O';
    }
  };

  // Función para obtener la actividad de un empleado en una hora específica
  const getEmployeeActivity = (empleado: EmpleadoActividad, hora: string) => {
    const actividadHora = empleado.horarioAsignado.find(h => h.hora === hora);
    return actividadHora ? actividadHora.actividad : '';
  };

  return (
    <View style={{ width: '100%' }} break>
      {/* Encabezado de la tabla */}
      <View style={[styles.table, { borderWidth: 1, borderColor: '#ddd' }]}>
        <View style={styles.tableHeader}>
          <View style={styles.employeeNameCell}>
            <Text style={styles.tableHeaderText}>Empleado</Text>
          </View>
          {horas.map((hora: string) => (
            <View key={hora} style={styles.hourCell}>
              <Text style={styles.hourText}>{hora}</Text>
              {recomendacionesPorHora[hora] && (
                <Text style={styles.hourText}>
                  {recomendacionesPorHora[hora].recomendacionRedondeada || atencionDeseada}
                </Text>
              )}
            </View>
          ))}
          <View style={styles.totalHoursCell}>
            <Text style={styles.totalHoursText}>Total</Text>
          </View>
        </View>

        {/* Filas de empleados */}
        {empleados.map((empleado, index) => {
          // Calcular total de horas de trabajo
          let totalHoras = 0;
          
          empleado.horarioAsignado.forEach((act: { hora: string; actividad: string }) => {
            if (act.actividad.toLowerCase().includes('trabajo') ||
                act.actividad.toLowerCase() === 'work' ||
                act.actividad.toLowerCase() === 'travail') {
              totalHoras += 1; // Cada actividad de trabajo cuenta como 1 hora
            }
          });
          
          return (
            <View key={empleado.empleado.id} style={[
              styles.tableRow,
              index % 2 === 0 ? { backgroundColor: '#f9f9f9' } : {},
              { minHeight: 22 }
            ]}>
              <View style={styles.employeeNameCell}>
                <Text style={styles.employeeNameText}>
                  {typeof empleado.empleado.nombre === 'string' 
                    ? empleado.empleado.nombre 
                    : empleado.empleado.nombre[0]}
                </Text>
              </View>
              
              {horas.map((hora: string) => {
                const actividad = getEmployeeActivity(empleado, hora);
                
                return (
                  <View key={hora} style={[
                    styles.hourCell,
                    getActivityColor(actividad)
                  ]}>
                    <Text style={styles.activityText}>
                      {actividad ? getActivitySymbol(actividad) : ''}
                    </Text>
                  </View>
                );
              })}
              
              <View style={styles.totalHoursCell}>
                <Text style={styles.totalHoursText}>{totalHoras}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Leyenda de actividades solo si se solicita explícitamente */}
      {showLegend && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[{ width: 15, height: 15, marginRight: 5 }, styles.activityWork]}>
              <Text style={{ fontSize: 8, textAlign: 'center' }}>W</Text>
            </View>
            <Text style={{ fontSize: 8 }}>Trabajo</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[{ width: 15, height: 15, marginRight: 5 }, styles.activityOff]}>
              <Text style={{ fontSize: 8, textAlign: 'center' }}>D</Text>
            </View>
            <Text style={{ fontSize: 8 }}>Descanso</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[{ width: 15, height: 15, marginRight: 5 }, styles.activityVacation]}>
              <Text style={{ fontSize: 8, textAlign: 'center' }}>V</Text>
            </View>
            <Text style={{ fontSize: 8 }}>Vacaciones</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[{ width: 15, height: 15, marginRight: 5 }, styles.activityTraining]}>
              <Text style={{ fontSize: 8, textAlign: 'center' }}>F</Text>
            </View>
            <Text style={{ fontSize: 8 }}>Formación</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[{ width: 15, height: 15, marginRight: 5 }, styles.activitySick]}>
              <Text style={{ fontSize: 8, textAlign: 'center' }}>E</Text>
            </View>
            <Text style={{ fontSize: 8 }}>Enfermedad</Text>
          </View>
        </View>
      )}
    </View>
  );
}; 