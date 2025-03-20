import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles/pdfStyles';
import { formatDate } from '../utils/dateUtils';
import { Tienda, Semana } from '../utils/types';

interface PDFHeaderProps {
  tienda: Tienda;
  semana: Semana;
}

export const PDFHeader: React.FC<PDFHeaderProps> = ({ tienda, semana }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Horarios Semana: {semana.nombre} - {tienda.nombre}</Text>
        </View>
      </View>
      
      <View style={styles.headerInfo}>
        <View style={styles.infoColumn}>
          <Text style={styles.infoValue}>
            Periodo: {formatDate(semana.fechaInicio)} - {formatDate(semana.fechaFin)}
          </Text>
        </View>
      </View>
      
      <View style={styles.headerDivider} />
    </View>
  );
}; 