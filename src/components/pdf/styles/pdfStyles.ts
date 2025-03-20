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
    marginBottom: 5,
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
  },
  subtitle: {
    fontSize: 12,
    color: colors.darkGray,
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
  },
  infoValue: {
    fontSize: 10,
    marginBottom: 5,
  },
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    marginTop: 5,
    marginBottom: 5,
  },
  // Day section styles
  daySection: {
    marginBottom: 10,
    borderRadius: 3,
    overflow: 'hidden',
  },
  daySectionHeader: {
    padding: 5,
    backgroundColor: colors.primary,
  },
  daySectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  daySectionSubtitle: {
    fontSize: 9,
    color: colors.lightGray,
  },
  daySectionSmallInfo: {
    fontSize: 8,
    color: colors.lightGray,
  },
  daySectionContent: {
    padding: 10,
  },
  daySectionCompactContent: {
    padding: 2,
  },
  evenSection: {
    backgroundColor: colors.white,
  },
  oddSection: {
    backgroundColor: colors.lightBlue,
  },
  tableContainer: {
    marginBottom: 10,
  },
  tableTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: colors.darkGray,
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
  },
  summaryValue: {
    fontSize: 12,
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
  },
  summaryBoxTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryBoxValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  summaryTableContainer: {
    marginTop: 0,
  },
  summaryNotes: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.lightGray,
    borderRadius: 5,
  },
  summaryNotesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryNotesText: {
    fontSize: 8,
    marginBottom: 3,
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
  },
  // Estilos para layout compacto
  employeeTableContainer: {
    marginBottom: 5,
  },
  cellLabel: {
    width: '20%',
    padding: 2,
    backgroundColor: colors.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray,
  },
  cellLabelText: {
    fontSize: 8,
    fontWeight: 'bold',
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