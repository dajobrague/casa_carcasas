import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { EmployeeTable } from '../tables/EmployeeTable';
import { DiaLaboral } from '../utils/types';
import { styles } from '../styles/pdfStyles';
import { getDayName, formatDate } from '../utils/dateUtils';

interface DaySectionProps {
  dia: DiaLaboral;
  isEven: boolean;
}

export const DaySection: React.FC<DaySectionProps> = ({ dia, isEven }) => {
  const backgroundColor = isEven ? styles.evenSection : styles.oddSection;
  
  // Determinar si la tienda está en Francia
  const esFrancia = dia.tienda?.PAIS?.toUpperCase() === 'FRANCIA';
  
  // Filtrar solo las horas en formato de horas completas (09:00, 10:00, etc.)
  const horasCompletas = dia.recomendaciones.recomendacionesPorHora
    .filter(rec => rec.hora.endsWith(':00'))
    .sort((a, b) => a.hora.localeCompare(b.hora));
  
  // Obtener el día del mes a partir de la fecha
  const diaMes = formatDate(dia.fecha).split('-')[2];
  
  // Obtener el valor de atención deseada de la tienda
  const atencionDeseada = dia.tienda?.atencionDeseada || 
                          dia.recomendaciones.recomendacionesPorHora[0]?.detalles.atencionDeseada || 
                          0;
  
  return (
    <View style={[styles.daySection, backgroundColor, styles.landscapeSection, { marginBottom: 15, padding: 5 }]} break>
      <View style={[styles.daySectionHeader, { marginBottom: 8 }]}>
        <Text style={styles.daySectionTitle}>
          {getDayName(dia.diaSemana).toUpperCase()} {diaMes}
        </Text>
        <Text style={styles.daySectionSmallInfo}>
          {formatDate(dia.fecha)}
        </Text>
      </View>
      
      <View style={[styles.daySectionCompactContent, { border: '1pt solid #ddd', borderRadius: 3 }]}>
        <View style={styles.employeeTableContainer}>
          <EmployeeTable 
            empleados={dia.empleados} 
            horaInicio={dia.horarioApertura}
            horaFin={dia.horarioCierre}
            includeObservations={false}
            recomendaciones={dia.recomendaciones.recomendacionesPorHora}
            atencionDeseada={atencionDeseada}
            esFrancia={esFrancia}
          />
        </View>
      </View>
    </View>
  );
}; 