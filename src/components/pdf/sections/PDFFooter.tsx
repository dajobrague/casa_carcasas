import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { styles } from '../styles/pdfStyles';

export const PDFFooter: React.FC = () => {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Generado: {currentDate} | Casa Carcasas
      </Text>
    </View>
  );
}; 