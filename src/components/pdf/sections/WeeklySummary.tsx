import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles/pdfStyles';
import { SummaryTable } from '../tables/SummaryTable';
import { DiaLaboral, ResumenSemanal } from '../utils/types';
import { formatDate } from '../utils/dateUtils';

interface WeeklySummaryProps {
  resumen: ResumenSemanal;
  diasLaborales: DiaLaboral[];
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ 
  resumen, 
  diasLaborales 
}) => {
  // Preparar datos para tabla de resumen
  const summaryData = diasLaborales.map(dia => ({
    fecha: dia.fecha,
    diaSemana: dia.diaSemana,
    totalEntradas: dia.trafico.metadatos.totalEntradas,
    personalRecomendado: dia.recomendaciones.metadatos.totalPersonalRedondeado,
    personalEfectivo: dia.empleados.length,
    diferencia: dia.empleados.length - dia.recomendaciones.metadatos.totalPersonalRedondeado
  }));

  return (
    <View style={styles.summarySection}>
      <Text style={styles.sectionTitle}>Resumen Semanal</Text>
      
      <View style={styles.summaryBoxes}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxTitle}>Total Entradas</Text>
          <Text style={styles.summaryBoxValue}>{resumen.totalEntradasSemana}</Text>
        </View>
        
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxTitle}>Personal Recomendado</Text>
          <Text style={styles.summaryBoxValue}>{resumen.totalPersonalRedondeado}</Text>
        </View>
        
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxTitle}>Promedio Diario</Text>
          <Text style={styles.summaryBoxValue}>{resumen.promedioEntradasDiario}</Text>
        </View>
        
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBoxTitle}>Día Mayor Tráfico</Text>
          <Text style={styles.summaryBoxValue}>
            {formatDate(resumen.diaMayorTrafico)}: {resumen.entradasDiaMayorTrafico}
          </Text>
        </View>
      </View>
      
      <View style={styles.summaryTableContainer}>
        <Text style={styles.tableTitle}>Comparativa Diaria</Text>
        <SummaryTable summaryData={summaryData} />
      </View>
      
      <View style={styles.summaryNotes}>
        <Text style={styles.summaryNotesTitle}>Observaciones:</Text>
        <Text style={styles.summaryNotesText}>
          Este informe compara el personal recomendado según el tráfico con el personal real asignado.
          Los valores negativos indican déficit de personal, positivos indican excedente.
        </Text>
        <Text style={styles.summaryNotesText}>
          Las recomendaciones se basan en una atención deseada de {diasLaborales[0]?.recomendaciones.recomendacionesPorHora[0]?.detalles.atencionDeseada || 25} minutos 
          y un factor de crecimiento del {(diasLaborales[0]?.recomendaciones.recomendacionesPorHora[0]?.detalles.factorCrecimiento || 0.23) * 100}%.
        </Text>
      </View>
    </View>
  );
}; 