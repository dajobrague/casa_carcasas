import { StyleSheet } from '@react-pdf/renderer';

export const colors = {
  primary: '#0f4c81',
  secondary: '#4a90e2',
  accent: '#f39c12',
  success: '#27ae60',
  danger: '#e74c3c',
  warning: '#f1c40f',
  gray: '#95a5a6',
  lightGray: '#ecf0f1',
  darkGray: '#34495e',
  white: '#ffffff',
  black: '#000000',
  lightBlue: '#e3f2fd',
  lightGreen: '#e8f5e9',
};

export const styles = StyleSheet.create({
  viewer: {
    width: '100%',
    height: '100vh',
  },
  page: {
    backgroundColor: colors.white,
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  landscapeSection: {
    width: '100%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 5,
    overflow: 'hidden',
  },
  // Header styles
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  logoContainer: {
    width: 80,
    height: 40,
    marginRight: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    fontSize: 12,
    color: colors.darkGray,
    fontFamily: 'Helvetica',
  },
  headerInfo: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoColumn: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
    fontFamily: 'Helvetica-Bold',
  },
  infoValue: {
    fontSize: 10,
    marginBottom: 5,
    fontFamily: 'Helvetica',
  },
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    marginTop: 5,
    marginBottom: 5,
  },
  // Day section styles
  daySection: {
    marginBottom: 15,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray,
  },
  daySectionHeader: {
    padding: 8,
    backgroundColor: colors.primary,
  },
  daySectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
    fontFamily: 'Helvetica-Bold',
  },
  daySectionSubtitle: {
    fontSize: 9,
    color: colors.lightGray,
    fontFamily: 'Helvetica',
  },
  daySectionSmallInfo: {
    fontSize: 8,
    color: colors.lightGray,
    fontFamily: 'Helvetica',
  },
  daySectionContent: {
    padding: 10,
  },
  daySectionCompactContent: {
    padding: 5,
  },
  evenSection: {
    backgroundColor: colors.white,
  },
  oddSection: {
    backgroundColor: colors.lightBlue,
  },
  tableContainer: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray,
    borderRadius: 3,
  },
  tableTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: colors.darkGray,
    fontFamily: 'Helvetica-Bold',
  },
  tablesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tableHalf: {
    flex: 1,
  },
  daySummary: {
    flexDirection: 'row',
    marginTop: 5,
    padding: 5,
    backgroundColor: colors.white,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontWeight: 'bold',
    marginRight: 5,
    fontFamily: 'Helvetica-Bold',
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  positiveValue: {
    color: colors.success,
  },
  negativeValue: {
    color: colors.danger,
  },
  // Summary section styles
  summarySection: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.primary,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  summaryBoxes: {
    flexDirection: 'row',
    marginBottom: 15,
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.lightGray,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray,
  },
  summaryBoxTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
  },
  summaryBoxValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: 'Helvetica-Bold',
  },
  summaryTableContainer: {
    marginTop: 0,
  },
  summaryNotes: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.lightGray,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.gray,
  },
  summaryNotesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
  },
  summaryNotesText: {
    fontSize: 8,
    marginBottom: 3,
    fontFamily: 'Helvetica',
  },
  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    paddingTop: 5,
  },
  footerText: {
    fontSize: 8,
    color: colors.gray,
    fontFamily: 'Helvetica',
  },
  // Estilos para layout compacto
  employeeTableContainer: {
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.gray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  cellLabel: {
    width: '20%',
    padding: 3,
    backgroundColor: colors.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray,
  },
  cellLabelText: {
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  cellValue: {
    width: '5%',
    padding: 2,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    borderRightWidth: 1,
    borderRightColor: colors.lightGray,
  },
  cellValueText: {
    fontSize: 8,
  },
}); 