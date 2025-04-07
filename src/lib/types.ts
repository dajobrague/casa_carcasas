export interface TiendaData {
  id: string;
  fields: {
    Name: string;
    PAIS?: string;
    Apertura?: string;
    Cierre?: string;
    Crecimiento?: number;
    'Atención Deseada'?: number;
    'N°'?: string;
    TIENDA?: string;
    'Horas Aprobadas'?: number;
    [key: string]: any;
  };
  createdTime?: string;
}

export interface SemanaLaboralRecord {
  id: string;
  fields: {
    Name?: string;
    'Fecha Inicio'?: string;
    'Fecha Fin'?: string;
    Year?: string;
    Mes?: string;
    'Fecha de Inicio'?: string;
    'Fecha de fin'?: string;
    'Dias Laborales'?: string[];
    [key: string]: any;
  };
  createdTime?: string;
}

export interface DiaLaboralRecord {
  id: string;
  fields: {
    Name?: string;
    'Semana Laboral'?: string[];
    [key: string]: any;
  };
  createdTime?: string;
}

export interface ActividadDiariaRecord {
  id: string;
  fields: {
    Nombre?: string;
    Name?: string;
    Tienda?: string[];
    'Día Laboral'?: string[];
    'Horas Contrato'?: number;
    'Horas +'?: number;
    'Horas -'?: number;
    'Horas'?: number;
    DNI?: string;
    Observaciones?: string;
    'record_Id (from Tienda y Supervisor)'?: string[];
    'recordId (from Fecha)'?: string[];
    'Actividad Semanal'?: string[];
    Fecha?: Date;
    '08:00'?: string;
    '08:30'?: string;
    '09:00'?: string;
    '09:30'?: string;
    '10:00'?: string;
    '10:30'?: string;
    '11:00'?: string;
    '11:30'?: string;
    '12:00'?: string;
    '12:30'?: string;
    '13:00'?: string;
    '13:30'?: string;
    '14:00'?: string;
    '14:30'?: string;
    '15:00'?: string;
    '15:30'?: string;
    '16:00'?: string;
    '16:30'?: string;
    '17:00'?: string;
    '17:30'?: string;
    '18:00'?: string;
    '18:30'?: string;
    '19:00'?: string;
    '19:30'?: string;
    '20:00'?: string;
    '20:30'?: string;
    '21:00'?: string;
    '21:30'?: string;
    '22:00'?: string;
    '22:30'?: string;
    [key: string]: any;
  };
  createdTime?: string;
}

/**
 * Interfaz para respuestas estándar de la API
 */
export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: any;
} 