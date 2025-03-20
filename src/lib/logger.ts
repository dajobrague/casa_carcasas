/**
 * Utilidad para manejar logs de forma segura en la aplicación
 * Los logs solo se mostrarán en desarrollo, no en producción
 */

const isProduction = process.env.NODE_ENV === 'production';
const isLogEnabled = !isProduction;

// Exportar función noLog para cuando queremos deshabilitar los logs completamente
export const noLog = () => {};

/**
 * Logger que solo muestra mensajes en desarrollo
 */
export const logger = {
  log: (...args: any[]) => {
    if (isLogEnabled) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (isLogEnabled) {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isLogEnabled) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isLogEnabled) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isLogEnabled) {
      console.debug(...args);
    }
  }
};

export default logger; 