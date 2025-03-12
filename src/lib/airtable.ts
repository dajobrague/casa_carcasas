import Airtable from 'airtable';

// Configuración de Airtable
const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || '';
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || '';
const semanasLaboralesTableId = process.env.NEXT_PUBLIC_AIRTABLE_SEMANAS_LABORALES_TABLE_ID || '';
const tiendaSupervisorTableId = process.env.NEXT_PUBLIC_AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID || '';
const actividadDiariaTableId = process.env.NEXT_PUBLIC_AIRTABLE_ACTIVIDAD_DIARIA_TABLE_ID || '';
const diasLaboralesTableId = process.env.NEXT_PUBLIC_AIRTABLE_DIAS_LABORALES_TABLE_ID || '';

// Inicializar Airtable
Airtable.configure({ apiKey });
const base = Airtable.base(baseId);

// Tablas
const semanasLaboralesTable = base(semanasLaboralesTableId);
const tiendaSupervisorTable = base(tiendaSupervisorTableId);
const actividadDiariaTable = base(actividadDiariaTableId);
const diasLaboralesTable = base(diasLaboralesTableId);

// Opciones de estado para los horarios
export const opcionesDropdown = [
  'TRABAJO',
  'VACACIONES',
  'LIBRE',
  'BAJA MÉDICA',
  'FORMACIÓN',
  'LACTANCIA'
];

// Opciones de estado con colores
export const opcionesEstado = [
  { value: 'TRABAJO', label: 'Trabajo', color: 'green' },
  { value: 'VACACIONES', label: 'Vacaciones', color: 'blue' },
  { value: 'LIBRE', label: 'Libre', color: 'red' },
  { value: 'BAJA MÉDICA', label: 'Baja Médica', color: 'purple' },
  { value: 'FORMACIÓN', label: 'Formación', color: 'orange' },
  { value: 'LACTANCIA', label: 'Lactancia', color: 'pink' }
];

// Función para verificar la conexión a Airtable
export async function verificarConexionAirtable() {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${actividadDiariaTableId}?maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    console.log('Airtable connection test:', {
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Airtable connection failed:', text);
    }

    return response.ok;
  } catch (error) {
    console.error('Airtable connection error:', error);
    return false;
  }
}

// Exportar tablas y configuración
export {
  base,
  semanasLaboralesTable,
  tiendaSupervisorTable,
  actividadDiariaTable,
  diasLaboralesTable,
  apiKey,
  baseId,
  semanasLaboralesTableId,
  tiendaSupervisorTableId,
  actividadDiariaTableId,
  diasLaboralesTableId
};

// Tipos de datos
export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
}

export interface SemanasLaboralesRecord extends AirtableRecord {
  fields: {
    Name: string;
    Year: string;
    Mes: string;
    'Fecha de Inicio': string;
    'Fecha de fin': string;
    'Dias Laborales'?: string[];
  };
}

export interface TiendaSupervisorRecord extends AirtableRecord {
  fields: {
    Name: string;
    PAIS?: string;
    Apertura?: string;
    Cierre?: string;
    'Horas Aprobadas'?: number;
  };
}

export interface ActividadDiariaRecord extends AirtableRecord {
  fields: {
    Nombre?: string;
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
    [key: string]: any; // Para los campos de tiempo (10:00, 10:30, etc.)
  };
}

export interface DiasLaboralesRecord extends AirtableRecord {
  fields: {
    Name: string;
    'Semana Laboral'?: string[];
  };
}

// Funciones para obtener datos
export async function obtenerDatosSemanasLaborales(): Promise<SemanasLaboralesRecord[]> {
  try {
    const urlBase = `https://api.airtable.com/v0/${baseId}/${semanasLaboralesTableId}`;
    const requestUrl = `${urlBase}`;
    
    console.log('URL de petición a Airtable:', requestUrl);

    const respuesta = await fetch(requestUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    console.log('Estado de la respuesta:', respuesta.status);
    
    if (!respuesta.ok) {
      throw new Error(`Error en la respuesta: ${respuesta.status} ${respuesta.statusText}`);
    }

    const datos = await respuesta.json();
    console.log('Datos recibidos de Airtable:', datos);
    
    if (!datos.records || datos.records.length === 0) {
      throw new Error('No se encontraron registros en Semanas Laborales');
    }

    console.log('Número de registros encontrados:', datos.records.length);
    return datos.records as SemanasLaboralesRecord[];
  } catch (error) {
    console.error("Error detallado al obtener datos de Semanas Laborales:", error);
    throw error;
  }
}

export async function obtenerDatosTienda(recordId: string): Promise<TiendaSupervisorRecord | null> {
  try {
    const url = `https://api.airtable.com/v0/${baseId}/${tiendaSupervisorTableId}/${recordId}`;
    console.log('URL de petición para tienda:', url);
    
    const response = await fetch(url, {
      headers: { 
        Authorization: `Bearer ${apiKey}` 
      }
    });
    
    console.log('Estado de la respuesta de tienda:', response.status);
    
    if (!response.ok) {
      throw new Error(`Error al obtener tienda: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Datos de tienda recibidos:', data);
    return data as TiendaSupervisorRecord;
  } catch (error) {
    console.error('Error detallado al obtener datos de tienda:', error);
    return null;
  }
}

export async function obtenerActividadesDiarias(tiendaId: string, fechaId: string): Promise<ActividadDiariaRecord[]> {
  try {
    const filterFormula = encodeURIComponent(
      `AND(
        {record_Id (from Tienda y Supervisor)}='${tiendaId}',
        {recordId (from Fecha)}='${fechaId}'
      )`
    );

    const url = `https://api.airtable.com/v0/${baseId}/${actividadDiariaTableId}?filterByFormula=${filterFormula}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching daily activities: ${response.status}`);
    }

    const data = await response.json();
    return data.records as ActividadDiariaRecord[];
  } catch (error) {
    console.error('Error fetching daily activities:', error);
    return [];
  }
}

export async function actualizarHorario(
  actividadId: string, 
  tiempo: string, 
  valor: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${actividadDiariaTableId}/${actividadId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          [tiempo]: valor || null
        }
      })
    });

    if (!response.ok) {
      const responseData = await response.text();
      throw new Error(`Airtable error: ${response.status} - ${responseData}`);
    }

    return true;
  } catch (error) {
    console.error('Update failed:', error);
    return false;
  }
}

export async function obtenerSemanasLaborales(mes: string, año: string): Promise<SemanasLaboralesRecord[]> {
  const urlBase = `https://api.airtable.com/v0/${baseId}/${semanasLaboralesTableId}`;
  
  // Filtrar solo por año para obtener todas las semanas
  const filterFormula = encodeURIComponent(`{Year}="${año}"`);
  const url = `${urlBase}?filterByFormula=${filterFormula}`;

  try {
    const respuesta = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!respuesta.ok) {
      throw new Error(`Error: ${respuesta.statusText}`);
    }

    const datos = await respuesta.json();
    
    // Obtener el número del mes actual (0-11)
    const mesNum = obtenerNumeroMes(mes.toLowerCase());
    
    // Filtrar las semanas que pertenecen al mes
    const semanasDelMes = datos.records.filter((record: SemanasLaboralesRecord) => {
      const fechaInicio = new Date(record.fields['Fecha de Inicio']);
      const fechaFin = new Date(record.fields['Fecha de fin']);
      const mesInicio = fechaInicio.getMonth();
      const mesFin = fechaFin.getMonth();
      
      // Una semana pertenece al mes si:
      // - El mes está entre el mes de inicio y el mes de fin
      // - O si el mes de inicio es igual al mes actual
      // - O si el mes de fin es igual al mes actual
      return (mesNum >= mesInicio && mesNum <= mesFin) || 
          mesInicio === mesNum || 
          mesFin === mesNum;
    });

    // Ordenar por fecha de inicio
    semanasDelMes.sort((a: SemanasLaboralesRecord, b: SemanasLaboralesRecord) => {
      const fechaA = new Date(a.fields['Fecha de Inicio']);
      const fechaB = new Date(b.fields['Fecha de Inicio']);
      return fechaA.getTime() - fechaB.getTime();
    });

    console.log(`Semanas encontradas para ${mes} ${año}:`, semanasDelMes);
    return semanasDelMes as SemanasLaboralesRecord[];

  } catch (error) {
    console.error("Error al obtener semanas laborales:", error);
    return [];
  }
}

// Función auxiliar para obtener el número de mes (0-11)
export function obtenerNumeroMes(nombreMes: string): number {
  const meses: Record<string, number> = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };
  return meses[nombreMes.split(' ')[0]];
}

export function capitalizarPrimeraLetra(texto: string): string {
  const palabras = texto.split(' ');
  const primeraPalabra = palabras[0];
  const año = palabras[1];
  return primeraPalabra.charAt(0).toUpperCase() + primeraPalabra.slice(1).toLowerCase() + ' ' + año;
}

export function formatearFecha(fecha: string | Date | undefined): string {
  if (!fecha) return '';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace('.', '').replace(/^(\d{1,2}) /, '$1 de ');
}

// Función para normalizar fechas (asegurarse de que estén en UTC)
export function normalizarFecha(fecha: Date | string): Date {
  const date = new Date(fecha);
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));
}

/**
 * Obtiene una semana laboral específica por su ID
 */
export async function obtenerSemanaPorId(semanaId: string): Promise<SemanasLaboralesRecord | null> {
  if (!semanaId) {
    console.error('Error: No se proporcionó un ID de semana laboral');
    return null;
  }

  const urlBase = `https://api.airtable.com/v0/${baseId}/${semanasLaboralesTableId}`;
  const url = `${urlBase}/${semanaId}`;

  try {
    const respuesta = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!respuesta.ok) {
      if (respuesta.status === 404) {
        console.error(`La semana con ID ${semanaId} no fue encontrada`);
        return null;
      }
      throw new Error(`Error al obtener semana: ${respuesta.statusText}`);
    }

    const datos = await respuesta.json();
    return datos as SemanasLaboralesRecord;
  } catch (error) {
    console.error('Error al obtener semana laboral por ID:', error);
    throw error;
  }
} 