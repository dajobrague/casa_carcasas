// Tipos para el JSON de respuesta de la API
export interface TraficoSemanalResponse {
  success: boolean;
  timestamp: string;
  tienda: Tienda;
  semana: Semana;
  datos: {
    diasLaborales: DiaLaboral[];
    resumenSemanal: ResumenSemanal;
  };
  errores?: string[];
}

export interface Tienda {
  id: string;
  nombre: string;
  codigo: string;
  atencionDeseada: number;
  crecimiento: number;
  // Campos adicionales que pueden estar presentes
  TIENDA?: string; // Nombre para mostrar
  'N°'?: string;   // Número de tienda
  [key: string]: any; // Para aceptar cualquier otro campo que pueda venir en los datos
}

export interface Semana {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface DiaLaboral {
  id: string;
  fecha: string;
  diaSemana: string;
  nombre: string;
  horarioApertura: string;
  horarioCierre: string;
  trafico: TraficoDia;
  recomendaciones: RecomendacionDiaria;
  empleados: EmpleadoActividad[];
  tienda?: Tienda;
  semana?: Semana;
}

export interface TraficoDia {
  fecha: string;
  entradasPorHora: {
    [hora: string]: number;
  };
  metadatos: {
    totalEntradas: number;
    horaMaxima: string;
    entradasHoraMaxima: number;
    promedioEntradasPorHora: number;
    horasConTrafico: number;
    simulado: boolean;
  };
}

export interface RecomendacionDiaria {
  fecha: string;
  diaSemana: string;
  recomendacionesPorHora: RecomendacionHora[];
  metadatos: {
    totalPersonalRecomendado: number;
    totalPersonalRedondeado: number;
    horarioApertura: string;
    horarioCierre: string;
    diaLaboral: {
      id: string;
      nombre: string;
    };
  };
}

export interface RecomendacionHora {
  hora: string;
  entradas: number;
  recomendacionExacta: number;
  recomendacionRedondeada: number;
  detalles: {
    atencionDeseada: number;
    factorCrecimiento: number;
    formulaAplicada: string;
    calculoCompleto: string;
  };
}

export interface EmpleadoActividad {
  empleado: {
    id: string;
    nombre: string | string[];
    dni?: string | string[];
    horasContrato?: number;
    categoria?: string;
  };
  horarioAsignado: {
    hora: string;
    actividad: string;
  }[];
  horasTotales: number;
  observaciones?: string;
}

export interface ResumenSemanal {
  totalEntradasSemana: number;
  totalPersonalRecomendado: number;
  totalPersonalRedondeado: number;
  promedioEntradasDiario: number;
  diaMayorTrafico: string;
  entradasDiaMayorTrafico: number;
} 