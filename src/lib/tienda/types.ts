/**
 * Tipos e interfaces para manejo de datos de tiendas
 */

/**
 * Interfaz para los datos básicos de una tienda
 */
export interface TiendaBasica {
  id: string;
  nombre: string;
  codigo: string;
  numero: number; // Número de tienda (campo "N°" en Airtable)
}

/**
 * Interfaz para los datos completos de una tienda
 */
export interface TiendaCompleta extends TiendaBasica {
  atencionDeseada: number;
  factorCrecimiento: number;
  supervisor: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  horarioApertura?: string;
  horarioCierre?: string;
  ubicacion?: {
    ciudad: string;
    estado: string;
  };
  metadatos?: Record<string, any>;
} 