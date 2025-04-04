// Script para probar el cálculo de horas para un empleado específico en un mes específico
const Airtable = require('airtable');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuración de Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const actividadDiariaTableId = 'tblbkzixVwxZ8oVqb';
const tiendasTableId = 'tblPbxJkAqBQ1Qzcy';

// Datos específicos para la prueba
const EMPLEADO_ID = 'rec0hQqSaGCveK9a0';
const MES = '4'; // Abril
const AÑO = '2025';

console.log('API Key:', apiKey ? 'Configurada correctamente' : 'No encontrada');
console.log('Base ID:', baseId ? 'Configurado correctamente' : 'No encontrado');

// Inicializar Airtable
const airtable = new Airtable({ apiKey }).base(baseId);

// Implementación de la función calcularHorasTrabajadas
function calcularHorasTrabajadas(actividad, opciones = {}) {
  const { esFrancia = false } = opciones;
  const fields = actividad.fields;
  
  // Valor por defecto si no hay actividad de trabajo
  let resultado = {
    horasTotales: 0,
    tipoActividad: '',
    estado: 'Libre',
    esTrabajo: false,
    slots: 0,
    duracionSlot: esFrancia ? 0.25 : 0.5 // 15min o 30min según país
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
  
  return resultado;
}

// Función para verificar la configuración de país de una tienda
async function obtenerPaisTienda(tiendaId) {
  try {
    if (!tiendaId) return { esFrancia: false };
    
    const tienda = await airtable(tiendasTableId).find(tiendaId);
    const pais = tienda.fields['Pais'] || tienda.fields['País'] || '';
    const esFrancia = pais.toLowerCase().includes('francia') || pais.toLowerCase().includes('france');
    
    return { tienda, esFrancia, pais };
  } catch (error) {
    console.error('Error al obtener tienda:', error.message);
    return { esFrancia: false, error: error.message };
  }
}

// Función principal para analizar todas las actividades del empleado en el mes
async function analizarActividadesEmpleado() {
  try {
    console.log(`\n=== Analizando actividades para empleado: ${EMPLEADO_ID} ===`);
    console.log(`Mes: ${MES}/${AÑO}`);
    
    // Formatear mes para búsqueda
    const mesFormateado = MES.padStart(2, '0');
    const patronFecha = `${AÑO}-${mesFormateado}`;
    
    console.log(`\n1. Buscando actividades con patrón de fecha: ${patronFecha}`);
    
    // Buscar todas las actividades del mes
    const formula = `REGEX_MATCH({Fecha Format}, "^${patronFecha}")`;
    
    const allRecords = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formula
      })
      .all();
    
    console.log(`Total registros encontrados para el mes: ${allRecords.length}`);
    
    // Filtrar por empleado
    const actividades = allRecords.filter(record => {
      const empleados = record.fields['Empleados'] || [];
      return Array.isArray(empleados) && empleados.includes(EMPLEADO_ID);
    });
    
    console.log(`Actividades filtradas para el empleado: ${actividades.length}`);
    
    if (actividades.length === 0) {
      return { error: 'No se encontraron actividades para este empleado en el mes especificado' };
    }
    
    // Verificar si hay actividades con el campo de país
    console.log(`\n2. Verificando configuración de país en registros`);
    let esFrancia = false;
    let paisEncontrado = null;
    
    // Buscar en los registros el campo de país
    for (const actividad of actividades) {
      const camposPais = actividad.fields['PAIS (from Tienda y Supervisor)'];
      
      if (camposPais && (Array.isArray(camposPais) ? camposPais.length > 0 : true)) {
        const pais = Array.isArray(camposPais) ? camposPais[0] : camposPais;
        paisEncontrado = pais;
        
        // Verificar si es Francia
        if (typeof pais === 'string' && (
            pais.toLowerCase().includes('francia') || 
            pais.toLowerCase().includes('france')
          )) {
          esFrancia = true;
          break;
        }
      }
    }
    
    if (paisEncontrado) {
      console.log(`País encontrado en registros: ${paisEncontrado}`);
      console.log(`Es Francia: ${esFrancia ? 'Sí' : 'No'}`);
      console.log(`Incremento a utilizar: ${esFrancia ? '15 minutos' : '30 minutos'} por slot`);
    } else {
      console.log('No se encontró el campo de país en los registros. Asumiendo país estándar (no Francia).');
    }
    
    // Analizar cada actividad
    console.log(`\n3. Calculando horas para ${actividades.length} actividades:`);
    
    const resultados = [];
    
    // Ordenar actividades por fecha
    actividades.sort((a, b) => {
      const fechaA = a.fields['Fecha Format'] || '';
      const fechaB = b.fields['Fecha Format'] || '';
      return fechaA.localeCompare(fechaB);
    });
    
    // Buscar campos de formato hora en todos los registros
    const camposHoraEncontrados = new Set();
    
    actividades.forEach(actividad => {
      Object.keys(actividad.fields).forEach(campo => {
        if (/^\d{1,2}:\d{2}$/.test(campo)) {
          camposHoraEncontrados.add(campo);
        }
      });
    });
    
    console.log(`\nCampos con formato hora encontrados en los registros:`);
    if (camposHoraEncontrados.size > 0) {
      Array.from(camposHoraEncontrados).sort().forEach(campo => {
        console.log(`- ${campo}`);
      });
    } else {
      console.log('No se encontraron campos con formato hora.');
    }
    
    console.log('\nResultados por día:');
    
    // Procesar cada actividad
    actividades.forEach((actividad, index) => {
      const fecha = actividad.fields['Fecha Format'];
      
      // Verificar campos con formato hora en esta actividad
      const camposHoraActividad = Object.keys(actividad.fields).filter(campo => /^\d{1,2}:\d{2}$/.test(campo));
      
      // Aplicar la función de cálculo
      const resultado = calcularHorasTrabajadas(actividad, { esFrancia });
      
      // Agregar información a resultados
      resultados.push({
        fecha,
        ...resultado,
        tieneCamposHora: camposHoraActividad.length > 0,
        camposHora: camposHoraActividad
      });
      
      // Mostrar resultado en consola
      console.log(`[${index + 1}] ${fecha}: ${resultado.estado}`);
      
      if (camposHoraActividad.length > 0) {
        console.log(`   Campos de hora: ${camposHoraActividad.join(', ')}`);
        
        const camposTrabajo = [];
        camposHoraActividad.forEach(campo => {
          const valor = actividad.fields[campo];
          const esTrabajo = typeof valor === 'string' && valor.toUpperCase().includes('TRABAJO');
          console.log(`   - ${campo}: ${actividad.fields[campo]}${esTrabajo ? ' (TRABAJO)' : ''}`);
          
          if (esTrabajo) {
            camposTrabajo.push(campo);
          }
        });
        
        if (resultado.slots > 0) {
          console.log(`   Slots con TRABAJO: ${resultado.slots} (${camposTrabajo.join(', ')})`);
          console.log(`   Duración por slot: ${resultado.duracionSlot * 60} minutos (${esFrancia ? 'Francia' : 'Estándar'})`);
          console.log(`   Horas calculadas: ${resultado.horasTotales}h (${resultado.slots} slots × ${resultado.duracionSlot}h)`);
        }
      }
    });
    
    // Calcular resumen
    const diasConTrabajo = resultados.filter(r => r.esTrabajo).length;
    const horasTotales = resultados.reduce((sum, r) => sum + r.horasTotales, 0);
    
    return {
      totalActividades: actividades.length,
      diasConTrabajo,
      horasTotales,
      resultados,
      esFrancia
    };
    
  } catch (error) {
    console.error('Error en el análisis:', error);
    return { error: error.message };
  }
}

// Ejecutar análisis
analizarActividadesEmpleado()
  .then(resultado => {
    if (resultado.error) {
      console.error(`\nError: ${resultado.error}`);
    } else {
      console.log('\n=== Resumen de actividades ===');
      console.log(`Total días analizados: ${resultado.totalActividades}`);
      console.log(`Días con trabajo: ${resultado.diasConTrabajo}`);
      console.log(`Horas totales: ${resultado.horasTotales}`);
      
      // Verificar si se encontraron actividades de trabajo
      if (resultado.diasConTrabajo === 0) {
        console.log('\nATENCIÓN: No se encontraron horas de trabajo asignadas para este empleado en ninguna fecha.');
        console.log('Posibles razones:');
        console.log('1. El empleado no tiene asignaciones de trabajo en este mes');
        console.log('2. Los registros no utilizan campos de hora con formato HH:MM');
        console.log('3. Los campos de hora no contienen valores "TRABAJO"');
        console.log('4. Los valores de horas están en otro formato no reconocido');
      }
    }
    
    console.log('\nAnálisis completado.');
  })
  .catch(err => console.error('Error en la ejecución:', err)); 