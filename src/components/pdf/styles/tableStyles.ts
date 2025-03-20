import { StyleSheet } from '@react-pdf/renderer';
import { colors } from './pdfStyles';

export const styles = StyleSheet.create({
  // Estilos base para tablas
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: colors.lightGray,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    backgroundColor: colors.primary,
  },
  tableHeaderText: {
    fontSize: 8,
    padding: 3,
    color: colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    minHeight: 20,
  },
  tableFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.gray,
    backgroundColor: colors.lightGray,
  },
  tableFooterText: {
    fontSize: 8,
    padding: 3,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Celdas para la tabla de empleados
  employeeNameCell: {
    width: '20%',
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  hourCell: {
    width: '10%',
    padding: 3,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  totalHoursCell: {
    width: '10%',
    padding: 3,
    textAlign: 'center',
  },
  
  // Estilos para texto en tabla de empleados
  employeeNameText: {
    fontSize: 7,
  },
  hourText: {
    fontSize: 7,
    textAlign: 'center',
  },
  totalHoursText: {
    fontSize: 7,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  activityText: {
    fontSize: 8,
    textAlign: 'center',
  },
  
  // Colores para actividades
  activityWork: {
    backgroundColor: colors.lightBlue,
  },
  activityOff: {
    backgroundColor: colors.lightGray,
  },
  activityVacation: {
    backgroundColor: colors.lightGreen,
  },
  activitySick: {
    backgroundColor: '#ffebee',
  },
  activityTraining: {
    backgroundColor: '#fff8e1',
  },
  activityEmpty: {
    backgroundColor: colors.white,
  },
  
  // Celdas para tabla de recomendaciones
  entriesCell: {
    width: '30%',
    padding: 3,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  recExactCell: {
    width: '30%',
    padding: 3,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  recRoundedCell: {
    width: '30%',
    padding: 3,
    textAlign: 'center',
  },
  
  // Estilos para tabla de recomendaciones
  entriesText: {
    fontSize: 7,
    textAlign: 'center',
  },
  recExactText: {
    fontSize: 7,
    textAlign: 'center',
  },
  recRoundedText: {
    fontSize: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  recZero: {
    color: colors.gray,
  },
  
  // Celdas para tabla de tráfico
  trafficCell: {
    width: '45%',
    padding: 3,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  percentCell: {
    width: '45%',
    padding: 3,
    textAlign: 'center',
  },
  
  // Estilos para tabla de tráfico
  trafficText: {
    fontSize: 7,
    textAlign: 'center',
  },
  percentText: {
    fontSize: 7,
    textAlign: 'center',
  },
  peakRow: {
    backgroundColor: '#fff8e1',
  },
  peakValue: {
    fontWeight: 'bold',
    color: colors.accent,
  },
  
  // Celdas para tabla de resumen
  summaryDayCell: {
    width: '15%',
    padding: 3,
    textAlign: 'left',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  summaryDateCell: {
    width: '20%',
    padding: 3,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  summaryEntriesCell: {
    width: '20%',
    padding: 3,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  summaryRecCell: {
    width: '15%',
    padding: 3,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  summaryActualCell: {
    width: '15%',
    padding: 3,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  summaryDiffCell: {
    width: '15%',
    padding: 3,
    textAlign: 'center',
  },
  
  // Estilos para tabla de resumen
  dayText: {
    fontSize: 7,
    textAlign: 'left',
  },
  dateText: {
    fontSize: 7,
    textAlign: 'center',
  },
  recText: {
    fontSize: 7,
    textAlign: 'center',
  },
  actualText: {
    fontSize: 7,
    textAlign: 'center',
  },
  diffText: {
    fontSize: 7,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  positiveDiff: {
    color: colors.success,
  },
  negativeDiff: {
    color: colors.danger,
  },
  // Estilos para tablas compactas
  compactTable: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: colors.lightGray,
    marginBottom: 5,
  },
  employeeCell: {
    width: '25%',
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
    fontSize: 9,
  },
  categoryCell: {
    width: '5%',
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
    textAlign: 'center',
  },
  hoursContractCell: {
    width: '6%',
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
    textAlign: 'center',
  },
  hoursAssignedCell: {
    width: '5%',
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
    textAlign: 'center',
  },
  halfHourCell: {
    width: '3%',
    padding: 1,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  smallHeaderText: {
    fontSize: 6,
    color: colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 7,
    textAlign: 'center',
  },
  // Estilos para la leyenda de iconos
  legendContainer: {
    marginBottom: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: colors.lightGray,
    padding: 5,
    borderRadius: 3,
  },
  legendTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 3,
  },
  legendIcon: {
    width: 14,
    height: 14,
    marginRight: 3,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendSymbol: {
    fontSize: 8,
    textAlign: 'center',
  },
  legendText: {
    fontSize: 7,
  },
  // Estilos para filas de resumen en la tabla
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    backgroundColor: colors.lightGray,
    minHeight: 20,
  },
  summaryLabelCell: {
    width: '25%',
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: colors.gray,
  },
  summaryLabelText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  hourSummaryCell: {
    width: '6%', // Doble ancho para cubrir dos celdas de media hora
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
    padding: 2,
  },
  summaryValueText: {
    fontSize: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
}); 