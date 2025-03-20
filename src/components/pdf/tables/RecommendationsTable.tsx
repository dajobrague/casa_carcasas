import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles/tableStyles';
import { RecomendacionHora } from '../utils/types';

interface RecommendationsTableProps {
  recomendaciones: RecomendacionHora[];
}

export const RecommendationsTable: React.FC<RecommendationsTableProps> = ({ 
  recomendaciones 
}) => {
  return (
    <View style={styles.table}>
      {/* Encabezado de la tabla */}
      <View style={styles.tableHeader}>
        <View style={styles.hourCell}>
          <Text style={styles.tableHeaderText}>Hora</Text>
        </View>
        
        <View style={styles.entriesCell}>
          <Text style={styles.tableHeaderText}>Entradas</Text>
        </View>
        
        <View style={styles.recExactCell}>
          <Text style={styles.tableHeaderText}>Rec. Exacta</Text>
        </View>
        
        <View style={styles.recRoundedCell}>
          <Text style={styles.tableHeaderText}>Rec. Final</Text>
        </View>
      </View>
      
      {/* Filas de recomendaciones */}
      {recomendaciones.map(recomendacion => (
        <View key={recomendacion.hora} style={styles.tableRow}>
          <View style={styles.hourCell}>
            <Text style={styles.hourText}>{recomendacion.hora}</Text>
          </View>
          
          <View style={styles.entriesCell}>
            <Text style={styles.entriesText}>{recomendacion.entradas}</Text>
          </View>
          
          <View style={styles.recExactCell}>
            <Text style={styles.recExactText}>
              {recomendacion.recomendacionExacta.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.recRoundedCell}>
            <Text style={recomendacion.recomendacionRedondeada === 0 ? 
              {...styles.recRoundedText, ...styles.recZero} : 
              styles.recRoundedText
            }>
              {recomendacion.recomendacionRedondeada}
            </Text>
          </View>
        </View>
      ))}
      
      {/* Fila de totales */}
      <View style={styles.tableFooter}>
        <View style={styles.hourCell}>
          <Text style={styles.tableFooterText}>Total</Text>
        </View>
        
        <View style={styles.entriesCell}>
          <Text style={styles.tableFooterText}>
            {recomendaciones.reduce((sum, rec) => sum + rec.entradas, 0)}
          </Text>
        </View>
        
        <View style={styles.recExactCell}>
          <Text style={styles.tableFooterText}>
            {recomendaciones.reduce((sum, rec) => sum + rec.recomendacionExacta, 0).toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.recRoundedCell}>
          <Text style={styles.tableFooterText}>
            {recomendaciones.reduce((sum, rec) => sum + rec.recomendacionRedondeada, 0)}
          </Text>
        </View>
      </View>
    </View>
  );
}; 