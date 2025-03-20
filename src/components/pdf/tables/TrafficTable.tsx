import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles/tableStyles';
import { TraficoDia } from '../utils/types';
import { getHoursRange } from '../utils/dateUtils';

interface TrafficTableProps {
  trafico: TraficoDia;
}

export const TrafficTable: React.FC<TrafficTableProps> = ({ 
  trafico 
}) => {
  // Convertir el objeto de entradas por hora a un array para facilitar el renderizado
  const horasArray = Object.keys(trafico.entradasPorHora).sort();
  
  // Determinar la hora de mayor tráfico
  const horaMaxima = trafico.metadatos.horaMaxima;
  
  return (
    <View style={styles.table}>
      {/* Encabezado de la tabla */}
      <View style={styles.tableHeader}>
        <View style={styles.hourCell}>
          <Text style={styles.tableHeaderText}>Hora</Text>
        </View>
        
        <View style={styles.trafficCell}>
          <Text style={styles.tableHeaderText}>Entradas</Text>
        </View>
        
        <View style={styles.percentCell}>
          <Text style={styles.tableHeaderText}>% del Total</Text>
        </View>
      </View>
      
      {/* Filas de tráfico por hora */}
      {horasArray.map(hora => {
        const entradas = trafico.entradasPorHora[hora];
        const porcentaje = (entradas / trafico.metadatos.totalEntradas) * 100;
        const esHoraMaxima = hora === horaMaxima;
        
        return (
          <View key={hora} style={esHoraMaxima ? 
            {...styles.tableRow, ...styles.peakRow} : 
            styles.tableRow
          }>
            <View style={styles.hourCell}>
              <Text style={styles.hourText}>{hora}</Text>
            </View>
            
            <View style={styles.trafficCell}>
              <Text style={esHoraMaxima ? 
                {...styles.trafficText, ...styles.peakValue} : 
                styles.trafficText
              }>
                {entradas}
                {esHoraMaxima && ' 🔺'}
              </Text>
            </View>
            
            <View style={styles.percentCell}>
              <Text style={styles.percentText}>
                {porcentaje.toFixed(1)}%
              </Text>
            </View>
          </View>
        );
      })}
      
      {/* Fila de totales */}
      <View style={styles.tableFooter}>
        <View style={styles.hourCell}>
          <Text style={styles.tableFooterText}>Total</Text>
        </View>
        
        <View style={styles.trafficCell}>
          <Text style={styles.tableFooterText}>{trafico.metadatos.totalEntradas}</Text>
        </View>
        
        <View style={styles.percentCell}>
          <Text style={styles.tableFooterText}>100%</Text>
        </View>
      </View>
    </View>
  );
}; 