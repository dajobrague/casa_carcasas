/**
 * Utilidad para calcular horas trabajadas basadas en actividades de Airtable
 */

// Interfaz para los resultados de cálculo
export interface ResultadoCalculo {
  horasTotales: number;
  tipoActividad: string;
  estado: string;
  esTrabajo: boolean;
  slots: number;
  duracionSlot: number;
  camposTrabajo?: string[];
}

/**
 * Calcula las horas trabajadas para una actividad específica
 * 
 * @param actividad Registro de actividad de Airtable
 * @param opciones Opciones adicionales (esFrancia para determinar incrementos)
 * @returns Objeto con los resultados del cálculo
 */
export function calcularHorasTrabajadas(actividad: any, opciones: { esFrancia?: boolean } = {}): ResultadoCalculo {
  const { esFrancia = false } = opciones;
  const fields = actividad.fields;
  
  // Valor por defecto si no hay actividad de trabajo
  let resultado: ResultadoCalculo = {
    horasTotales: 0,
    tipoActividad: '',
    estado: 'Libre',
    esTrabajo: false,
    slots: 0,
    duracionSlot: esFrancia ? 0.25 : 0.5 // 15min o 30min según país
  };
  
  // Lista para almacenar campos que contienen "TRABAJO"
  const camposTrabajo: string[] = [];
  
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
        camposTrabajo.push(campo);
      }
    });
    
    // Guardar cantidad de slots
    resultado.slots = slots;
    
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
  
  // Agregar lista de campos con valor "TRABAJO"
  if (camposTrabajo.length > 0) {
    resultado.camposTrabajo = camposTrabajo;
  }
  
  return resultado;
}

/**
 * Verifica si un país es Francia para determinar el incremento de tiempo
 * 
 * @param pais Nombre del país
 * @returns true si es Francia, false en caso contrario
 */
export function esPaisFrancia(pais: string | null | undefined): boolean {
  if (!pais) return false;
  
  const paisLower = pais.toLowerCase();
  return paisLower.includes('francia') || paisLower.includes('france');
} 