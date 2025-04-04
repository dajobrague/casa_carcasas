// Script simplificado para buscar semanas generadas para un empleado específico
const Airtable = require('airtable');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuración de Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const actividadSemanalTableId = 'tblrrsQqHdJOF6xdy'; // Tabla de actividad semanal
const semanasLaboralesTableId = process.env.AIRTABLE_SEMANAS_LABORALES_TABLE_ID || 'tblY4azExiLi7dbcw';

// Validar configuración
console.log('API Key:', apiKey ? 'Configurada correctamente' : 'No encontrada');
console.log('Base ID:', baseId ? 'Configurado correctamente' : 'No encontrado');

// Inicializar Airtable
const airtable = new Airtable({ apiKey }).base(baseId);

/**
 * Busca las semanas generadas para un empleado específico
 * @param {string} empleadoId - ID del empleado a buscar
 * @returns {Promise<Array>} - Lista de semanas asignadas al empleado con detalles
 */
async function buscarSemanasEmpleado(empleadoId) {
  try {
    console.log(`Buscando semanas para el empleado con ID: ${empleadoId}`);
    
    // Buscar actividades relacionadas con el empleado
    const formula = `OR(FIND("${empleadoId}", {Empleados}), FIND("${empleadoId}", {record_Id (from Empleados)}))`;
    
    const registros = await airtable(actividadSemanalTableId)
      .select({
        filterByFormula: formula
      })
      .all();
    
    console.log(`Total de actividades encontradas: ${registros.length}`);
    
    // Extraer y contar las semanas únicas
    const semanasUnicas = new Set();
    registros.forEach(registro => {
      if (registro.fields['Semanas Laborales'] && Array.isArray(registro.fields['Semanas Laborales'])) {
        registro.fields['Semanas Laborales'].forEach(semanaId => {
          semanasUnicas.add(semanaId);
        });
      }
    });
    
    const semanasIds = Array.from(semanasUnicas);
    console.log(`Total de semanas únicas: ${semanasIds.length}`);
    
    // Obtener detalles de cada semana
    const detallesSemanas = [];
    
    for (const semanaId of semanasIds) {
      try {
        const semana = await airtable(semanasLaboralesTableId).find(semanaId);
        
        detallesSemanas.push({
          id: semana.id,
          nombre: semana.fields['Name'] || 'Sin nombre',
          fechaInicio: semana.fields['Fecha de Inicio'] || '',
          fechaFin: semana.fields['Fecha de fin'] || '',
          mes: semana.fields['Mes'] || '',
          año: semana.fields['Year'] || ''
        });
      } catch (error) {
        console.error(`Error al obtener detalles de la semana ${semanaId}:`, error);
      }
    }
    
    // Ordenar por fecha de inicio (si está disponible)
    detallesSemanas.sort((a, b) => {
      if (!a.fechaInicio) return 1;
      if (!b.fechaInicio) return -1;
      return a.fechaInicio.localeCompare(b.fechaInicio);
    });
    
    return detallesSemanas;
  } catch (error) {
    console.error('Error al buscar semanas del empleado:', error);
    return [];
  }
}

/**
 * Verifica si un empleado tiene una semana específica asignada
 * @param {string} empleadoId - ID del empleado a verificar
 * @param {string} semanaId - ID de la semana a verificar
 * @returns {Promise<boolean>} - true si el empleado tiene la semana asignada
 */
async function verificarSemanaAsignada(empleadoId, semanaId) {
  try {
    console.log(`Verificando si el empleado ${empleadoId} tiene asignada la semana ${semanaId}`);
    
    // Método 1: Búsqueda directa
    const formula = `AND(OR(FIND("${empleadoId}", {Empleados}), FIND("${empleadoId}", {record_Id (from Empleados)})), FIND("${semanaId}", {Semanas Laborales}))`;
    
    const registros = await airtable(actividadSemanalTableId)
      .select({
        filterByFormula: formula
      })
      .all();
    
    if (registros.length > 0) {
      console.log(`Encontrada asignación directa. Registros: ${registros.length}`);
      return true;
    }
    
    // Método 2: Verificación inversa
    console.log('No se encontró asignación directa, verificando relación inversa...');
    
    // Obtener la semana
    const semana = await airtable(semanasLaboralesTableId).find(semanaId);
    
    // Verificar si la semana tiene actividades asociadas
    if (!semana.fields['Actividad Semanal'] || !Array.isArray(semana.fields['Actividad Semanal'])) {
      console.log('La semana no tiene actividades asociadas');
      return false;
    }
    
    // Verificar cada actividad
    const actividadesIds = semana.fields['Actividad Semanal'];
    
    for (const actividadId of actividadesIds) {
      try {
        const actividad = await airtable(actividadSemanalTableId).find(actividadId);
        
        const empleadosActividad = actividad.fields['Empleados'] || [];
        const empleadosVinculados = actividad.fields['record_Id (from Empleados)'] || [];
        
        if (empleadosActividad.includes(empleadoId) || empleadosVinculados.includes(empleadoId)) {
          console.log(`Encontrada asignación inversa en actividad ${actividadId}`);
          return true;
        }
      } catch (error) {
        console.error(`Error al verificar actividad ${actividadId}:`, error);
      }
    }
    
    console.log('No se encontró ninguna asignación');
    return false;
  } catch (error) {
    console.error('Error al verificar semana asignada:', error);
    return false;
  }
}

/**
 * Entrada principal del script
 */
async function main() {
  // Verificar los argumentos proporcionados
  const empleadoId = process.argv[2];
  const semanaId = process.argv[3]; // Opcional: para verificar una semana específica
  
  if (!empleadoId) {
    console.error('\nError: Debe proporcionar un ID de empleado como primer argumento.');
    console.log('Uso 1: node buscar-semanas-por-empleado.js [ID_EMPLEADO]');
    console.log('Uso 2: node buscar-semanas-por-empleado.js [ID_EMPLEADO] [ID_SEMANA]');
    return;
  }
  
  try {
    if (semanaId) {
      // Verificar si el empleado tiene asignada la semana específica
      const tieneAsignacion = await verificarSemanaAsignada(empleadoId, semanaId);
      
      console.log('\n=== Resultado de la Verificación ===');
      if (tieneAsignacion) {
        console.log(`El empleado ${empleadoId} TIENE ASIGNADA la semana ${semanaId}`);
      } else {
        console.log(`El empleado ${empleadoId} NO TIENE ASIGNADA la semana ${semanaId}`);
      }
    } else {
      // Buscar todas las semanas asignadas al empleado
      const semanas = await buscarSemanasEmpleado(empleadoId);
      
      console.log('\n=== Semanas Asignadas al Empleado ===');
      if (semanas.length > 0) {
        console.log(`Se encontraron ${semanas.length} semanas para el empleado ${empleadoId}:`);
        semanas.forEach((semana, index) => {
          console.log(`\n${index + 1}. ${semana.nombre}`);
          console.log(`   ID: ${semana.id}`);
          console.log(`   Fecha inicio: ${semana.fechaInicio}`);
          console.log(`   Fecha fin: ${semana.fechaFin}`);
          console.log(`   Mes: ${semana.mes}`);
          console.log(`   Año: ${semana.año}`);
        });
      } else {
        console.log(`No se encontraron semanas asignadas al empleado ${empleadoId}`);
      }
    }
    
    console.log('\nOperación completada exitosamente.');
  } catch (error) {
    console.error('\nError durante la ejecución:', error);
  }
}

// Ejecutar el script
main(); 