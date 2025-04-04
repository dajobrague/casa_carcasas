export interface TiendaData {
  id: string;
  fields: {
    Name: string;
    TIENDA: string;
    'N°': string;
    PAIS?: string;
    Apertura?: string;
    Cierre?: string;
    Supervisor?: string;
    [key: string]: any;
  };
}

export interface EmpleadoRecord {
  id: string;
  fields: {
    Nombre: string;
    Apellidos: string;
    CodigoEmpleado: string;
    TipoJornada: string;
    'Status Empleado': string;
    HorasContrato?: number;
    'record_Id (from Tienda y Supervisor)'?: string[];
    [key: string]: any;
  };
}

export interface VacanteRecord {
  id: string;
  fields: {
    CodigoEmpleado: string;
    TipoJornada: string;
    HorasContrato?: number;
    'record_Id (from Tienda y Supervisor)'?: string[];
    [key: string]: any;
  };
}

export interface SemanaLaboralRecord {
  id: string;
  fields: {
    Name: string;
    'Fecha de Inicio': string;
    'Fecha de fin': string;
    Mes: string;
    Year: string;
    [key: string]: any;
  };
}

export interface ActividadSemanalRecord {
  id: string;
  fields: {
    'record_Id (from Empleados)'?: string[];
    'Semanas Laborales'?: string[];
    [key: string]: any;
  };
}

export interface GestorMensualState {
  tiendaId: string | null;
  tiendaData: TiendaData | null;
  empleados: EmpleadoRecord[];
  vacantes: VacanteRecord[];
  mesSeleccionado: string | null;
  semanasLaborales: SemanaLaboralRecord[];
  loading: boolean;
  error: string | null;
}

export const TIPOS_JORNADA = {
  TIEMPO_COMPLETO: {
    id: 'Tiempo Completo',
    label: 'Tiempo Completo',
    horas: 40
  },
  MEDIO_TIEMPO: {
    id: 'Medio Tiempo',
    label: 'Medio Tiempo',
    horas: 30
  },
  TEMPORAL: {
    id: 'Temporal',
    label: 'Temporal',
    horas: null
  }
};

export const STATUS_EMPLEADO = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  PENDIENTE: 'Pendiente'
}; 