import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles/pdfStyles';
import { formatDate } from '../utils/dateUtils';
import { Tienda, Semana } from '../utils/types';
import { styles as tableStyles } from '../styles/tableStyles';

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
      
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3, marginBottom: 5, gap: 15, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[{ width: 15, height: 15, marginRight: 5 }, tableStyles.activityWork]}>
            <Text style={{ fontSize: 8, textAlign: 'center' }}>W</Text>
          </View>
          <Text style={{ fontSize: 8 }}>Trabajo</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[{ width: 15, height: 15, marginRight: 5 }, tableStyles.activityOff]}>
            <Text style={{ fontSize: 8, textAlign: 'center' }}>D</Text>
          </View>
          <Text style={{ fontSize: 8 }}>Descanso</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[{ width: 15, height: 15, marginRight: 5 }, tableStyles.activityVacation]}>
            <Text style={{ fontSize: 8, textAlign: 'center' }}>V</Text>
          </View>
          <Text style={{ fontSize: 8 }}>Vacaciones</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[{ width: 15, height: 15, marginRight: 5 }, tableStyles.activityTraining]}>
            <Text style={{ fontSize: 8, textAlign: 'center' }}>F</Text>
          </View>
          <Text style={{ fontSize: 8 }}>Formación</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[{ width: 15, height: 15, marginRight: 5 }, tableStyles.activitySick]}>
            <Text style={{ fontSize: 8, textAlign: 'center' }}>E</Text>
          </View>
          <Text style={{ fontSize: 8 }}>Enfermedad</Text>
        </View>
      </View>
      
      <View style={styles.headerDivider} />
    </View>
  );
}; 