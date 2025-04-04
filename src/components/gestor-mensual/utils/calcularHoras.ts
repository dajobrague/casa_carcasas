/**
 * Utilidad para calcular horas trabajadas a partir de los campos de actividad
 */

/**
 * Interfaz genérica para los registros de actividad
 */
interface ActividadRecord {
  id: string;
  fields: Record<string, any>;
}

/**
 * Opciones para el cálculo de horas
 */
interface OpcionesCalculo {
  esFrancia?: boolean; // Si es true, cada slot vale 15min, sino 30min
}

/**
 * Resultado del cálculo de horas trabajadas
 */
interface ResultadoHoras {
  horasTotales: number;
  tipoActividad: string;
  estado: string;
  esTrabajo: boolean;
}

/**
 * Calcula las horas trabajadas basándose en los campos disponibles
 * @param actividad Registro de actividad desde Airtable
 * @param opciones Opciones para el cálculo
 * @returns Resultado con horas totales y estado
 */
export function calcularHorasTrabajadas(
  actividad: ActividadRecord,
  opciones: OpcionesCalculo = {}
): ResultadoHoras {
  const { esFrancia = false } = opciones;
  const fields = actividad.fields;
  
  // Valor por defecto si no hay actividad de trabajo
  let resultado: ResultadoHoras = {
    horasTotales: 0,
    tipoActividad: '',
    estado: 'Libre',
    esTrabajo: false
  };
  
  // 1. Comprobación del campo Horas Trabajadas
  if (typeof fields['Horas Trabajadas'] === 'number' && fields['Horas Trabajadas'] > 0) {
    resultado.horasTotales = fields['Horas Trabajadas'];
    resultado.esTrabajo = true;
  }
  
  // 2. Comprobar campos Horas + y Horas -
  const horasPlus = parseFloat(String(fields['Horas +'] || 0));
  const horasMinus = parseFloat(String(fields['Horas -'] || 0));
  
  if (horasPlus > 0 || horasMinus > 0) {
    resultado.horasTotales = horasPlus - horasMinus;
    resultado.esTrabajo = resultado.horasTotales > 0;
  }
  
  // 3. Buscar campo de tipo de actividad
  if (fields['Tipo Actividad']) {
    resultado.tipoActividad = String(fields['Tipo Actividad']);
    
    // Si el tipo incluye "Trabajo", es trabajo incluso si las horas son 0
    if (resultado.tipoActividad.toLowerCase().includes('trabajo')) {
      resultado.esTrabajo = true;
    }
  } else if (fields['Actividad Semanal']) {
    resultado.tipoActividad = 'Actividad Semanal';
  }
  
  // 4. Buscar campos con formato de hora (HH:MM) que podrían tener valor "TRABAJO"
  const camposHora = Object.keys(fields).filter(campo => {
    return /^\d{1,2}:\d{2}$/.test(campo);
  });
  
  if (camposHora.length > 0) {
    let slots = 0;
    
    camposHora.forEach(campo => {
      const valor = fields[campo];
      if (typeof valor === 'string' && valor.toUpperCase().includes('TRABAJO')) {
        slots++;
      }
    });
    
    // Calcular horas según el país (15min o 30min por slot)
    if (slots > 0) {
      const horasPorSlot = esFrancia ? 0.25 : 0.5;
      resultado.horasTotales = slots * horasPorSlot;
      resultado.esTrabajo = true;
    }
  }
  
  // Determinar el estado final
  if (resultado.esTrabajo) {
    resultado.estado = `Trabajo (${resultado.horasTotales}h)`;
  }
  
  return resultado;
}

/**
 * Determina si una tienda está en Francia basándose en su información
 * @param tienda Información de la tienda
 */
export function esTiendaFrancia(tienda: any): boolean {
  if (!tienda || !tienda.fields) return false;
  
  const pais = tienda.fields['Pais'] || tienda.fields['País'] || '';
  return pais.toLowerCase().includes('francia') || pais.toLowerCase().includes('france');
}

export default {
  calcularHorasTrabajadas,
  esTiendaFrancia
}; 