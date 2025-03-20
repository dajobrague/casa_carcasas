import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles/tableStyles';
import { getDayName, formatDate } from '../utils/dateUtils';

interface SummaryData {
  fecha: string;
  diaSemana: string;
  totalEntradas: number;
  personalRecomendado: number;
  personalEfectivo: number;
  diferencia: number;
}

interface SummaryTableProps {
  summaryData: SummaryData[];
}

export const SummaryTable: React.FC<SummaryTableProps> = ({ 
  summaryData 
}) => {
  return (
    <View style={styles.table}>
      {/* Encabezado de la tabla */}
      <View style={styles.tableHeader}>
        <View style={styles.summaryDayCell}>
          <Text style={styles.tableHeaderText}>Día</Text>
        </View>
        
        <View style={styles.summaryDateCell}>
          <Text style={styles.tableHeaderText}>Fecha</Text>
        </View>
        
        <View style={styles.summaryEntriesCell}>
          <Text style={styles.tableHeaderText}>Entradas</Text>
        </View>
        
        <View style={styles.summaryRecCell}>
          <Text style={styles.tableHeaderText}>Recomendado</Text>
        </View>
        
        <View style={styles.summaryActualCell}>
          <Text style={styles.tableHeaderText}>Efectivo</Text>
        </View>
        
        <View style={styles.summaryDiffCell}>
          <Text style={styles.tableHeaderText}>Balance</Text>
        </View>
      </View>
      
      {/* Filas de datos */}
      {summaryData.map((day, index) => (
        <View key={day.fecha} style={styles.tableRow}>
          <View style={styles.summaryDayCell}>
            <Text style={styles.dayText}>{getDayName(day.diaSemana)}</Text>
          </View>
          
          <View style={styles.summaryDateCell}>
            <Text style={styles.dateText}>{formatDate(day.fecha)}</Text>
          </View>
          
          <View style={styles.summaryEntriesCell}>
            <Text style={styles.entriesText}>{day.totalEntradas}</Text>
          </View>
          
          <View style={styles.summaryRecCell}>
            <Text style={styles.recText}>{day.personalRecomendado}</Text>
          </View>
          
          <View style={styles.summaryActualCell}>
            <Text style={styles.actualText}>{day.personalEfectivo}</Text>
          </View>
          
          <View style={styles.summaryDiffCell}>
            <Text style={day.diferencia < 0 ? 
              {...styles.diffText, ...styles.negativeDiff} : 
              day.diferencia > 0 ? 
              {...styles.diffText, ...styles.positiveDiff} : 
              styles.diffText
            }>
              {day.diferencia > 0 ? '+' : ''}{day.diferencia}
            </Text>
          </View>
        </View>
      ))}
      
      {/* Fila de totales */}
      <View style={styles.tableFooter}>
        <View style={styles.summaryDayCell}>
          <Text style={styles.tableFooterText}>Total</Text>
        </View>
        
        <View style={styles.summaryDateCell}>
          <Text style={styles.tableFooterText}>{summaryData.length} días</Text>
        </View>
        
        <View style={styles.summaryEntriesCell}>
          <Text style={styles.tableFooterText}>
            {summaryData.reduce((sum, day) => sum + day.totalEntradas, 0)}
          </Text>
        </View>
        
        <View style={styles.summaryRecCell}>
          <Text style={styles.tableFooterText}>
            {summaryData.reduce((sum, day) => sum + day.personalRecomendado, 0)}
          </Text>
        </View>
        
        <View style={styles.summaryActualCell}>
          <Text style={styles.tableFooterText}>
            {summaryData.reduce((sum, day) => sum + day.personalEfectivo, 0)}
          </Text>
        </View>
        
        <View style={styles.summaryDiffCell}>
          <Text style={
            summaryData.reduce((sum, day) => sum + day.diferencia, 0) < 0 ? 
            {...styles.tableFooterText, ...styles.negativeDiff} : 
            summaryData.reduce((sum, day) => sum + day.diferencia, 0) > 0 ? 
            {...styles.tableFooterText, ...styles.positiveDiff} : 
            styles.tableFooterText
          }>
            {summaryData.reduce((sum, day) => sum + day.diferencia, 0)}
          </Text>
        </View>
      </View>
    </View>
  );
}; 