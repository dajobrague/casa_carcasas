// Script para buscar semanas generadas para un empleado específico
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
console.log('Tabla Actividad Semanal:', actividadSemanalTableId);
console.log('Tabla Semanas Laborales:', semanasLaboralesTableId);

// Inicializar Airtable
const airtable = new Airtable({ apiKey }).base(baseId);

/**
 * Analiza y muestra la estructura completa de un registro
 * @param {Object} registro - Registro de Airtable a analizar
 */
function analizarEstructuraRegistro(registro) {
  console.log('\n=== Análisis de Estructura del Registro ===');
  console.log('ID del registro:', registro.id);
  
  // Obtener todos los campos disponibles
  const campos = Object.keys(registro.fields);
  console.log(`Total de campos disponibles: ${campos.length}`);
  
  // Mostrar todos los campos y sus tipos de datos
  console.log('\nCampos disponibles:');
  campos.forEach(campo => {
    const valor = registro.fields[campo];
    const tipoDato = Array.isArray(valor) ? 
      `Array[${valor.length}]` : 
      (valor === null ? 'null' : typeof valor);
    
    console.log(`- ${campo} (${tipoDato})`);
    
    // Si es un array, mostrar el primer elemento como ejemplo
    if (Array.isArray(valor) && valor.length > 0) {
      console.log(`  Ejemplo: ${valor[0]}`);
    } 
    // Si es un string, mostrar una vista previa
    else if (typeof valor === 'string') {
      console.log(`  Valor: ${valor.length > 50 ? valor.substring(0, 50) + '...' : valor}`);
    }
    // Si es un objeto, mostrar sus propiedades
    else if (typeof valor === 'object' && valor !== null) {
      console.log(`  Propiedades: ${Object.keys(valor).join(', ')}`);
    }
  });
  
  return campos;
}

/**
 * Verifica si las actividades semanales de una semana incluyen al empleado dado
 * @param {string} semanaId - ID de la semana a verificar
 * @param {string} empleadoId - ID del empleado a buscar
 * @returns {Promise<{isRelated: boolean, actividades: Array}>} - Resultado de la verificación
 */
async function verificarRelacionSemanaEmpleado(semanaId, empleadoId) {
  try {
    console.log(`\nVerificando relación desde la semana ${semanaId} al empleado ${empleadoId}...`);
    
    // Obtener detalles de la semana
    const detallesSemana = await obtenerDetallesSemana(semanaId);
    
    if (!detallesSemana || !detallesSemana.fields['Actividad Semanal'] || !Array.isArray(detallesSemana.fields['Actividad Semanal'])) {
      console.log('La semana no tiene actividades semanales asociadas');
      return { isRelated: false, actividades: [] };
    }
    
    // Obtener las actividades semanales de la semana
    const actividadesIds = detallesSemana.fields['Actividad Semanal'];
    console.log(`La semana tiene ${actividadesIds.length} actividades semanales asociadas`);
    
    // Verificar cada actividad semanal para ver si está relacionada con el empleado
    const actividadesRelacionadas = [];
    
    for (const actividadId of actividadesIds) {
      try {
        console.log(`Verificando actividad: ${actividadId}`);
        
        // Obtener detalles de la actividad semanal
        const actividadSemanal = await airtable(actividadSemanalTableId).find(actividadId);
        
        // Verificar si la actividad está relacionada con el empleado
        const empleadosActividad = actividadSemanal.fields['Empleados'] || [];
        const empleadosVinculados = actividadSemanal.fields['record_Id (from Empleados)'] || [];
        
        if (empleadosActividad.includes(empleadoId) || empleadosVinculados.includes(empleadoId)) {
          console.log(`¡Encontrada coincidencia en actividad ${actividadId}!`);
          
          // Guardar los detalles de esta actividad
          actividadesRelacionadas.push({
            id: actividadId,
            empleado: actividadSemanal.fields['Nombre (from Empleados)'] || 'Desconocido',
            tienda: actividadSemanal.fields['Tienda [Link] (from Empleados)'] || 'Desconocida',
            semana: actividadSemanal.fields['Name (from Semanas Laborales)'] || 'Desconocida'
          });
        }
      } catch (error) {
        console.error(`Error al verificar actividad ${actividadId}:`, error);
      }
    }
    
    const isRelated = actividadesRelacionadas.length > 0;
    
    if (isRelated) {
      console.log(`Se encontraron ${actividadesRelacionadas.length} actividades relacionadas con el empleado`);
    } else {
      console.log('No se encontraron actividades relacionadas con el empleado');
    }
    
    return { isRelated, actividades: actividadesRelacionadas };
  } catch (error) {
    console.error('Error al verificar relación semana-empleado:', error);
    return { isRelated: false, actividades: [] };
  }
}

/**
 * Busca las semanas generadas para un empleado específico
 * @param {string} empleadoId - ID del empleado a buscar
 * @param {string} [semanaId] - ID opcional de la semana específica a buscar
 * @returns {Promise<Array>} - Lista de semanas asignadas al empleado
 */
async function buscarSemanasEmpleado(empleadoId, semanaId = null) {
  try {
    console.log(`Buscando semanas para el empleado con ID: ${empleadoId}`);
    if (semanaId) {
      console.log(`Filtrando por semana específica con ID: ${semanaId}`);
    }
    
    // Construir la fórmula de búsqueda basada en los parámetros
    let formula;
    if (semanaId) {
      // Si tenemos ID de semana, buscamos actividades que coincidan con ambos criterios
      formula = `AND(FIND("${empleadoId}", {Empleados}), FIND("${semanaId}", {Semanas Laborales}))`;
    } else {
      // Si solo tenemos empleado, usamos la búsqueda por empleado
      formula = `FIND("${empleadoId}", {Empleados})`;
    }
    
    // Consultar la tabla de actividad semanal
    let registros = await airtable(actividadSemanalTableId)
      .select({
        filterByFormula: formula
      })
      .all();
    
    // Si no hay resultados, intentar con formato alternativo de los campos
    if (registros.length === 0) {
      console.log('No se encontraron registros con la primera fórmula, intentando con campo alternativo...');
      
      // Construir fórmula alternativa
      if (semanaId) {
        formula = `AND(FIND("${empleadoId}", {record_Id (from Empleados)}), FIND("${semanaId}", {Semanas Laborales}))`;
      } else {
        formula = `FIND("${empleadoId}", {record_Id (from Empleados)})`;
      }
      
      registros = await airtable(actividadSemanalTableId)
        .select({
          filterByFormula: formula
        })
        .all();
    }
    
    console.log(`Total de actividades encontradas: ${registros.length}`);
    
    // Si encontramos al menos un registro, analizar su estructura
    if (registros.length > 0) {
      const primerRegistro = registros[0];
      const camposDisponibles = analizarEstructuraRegistro(primerRegistro);
      
      // Identificar los campos que contienen referencias a semanas
      const camposSemana = camposDisponibles.filter(campo => 
        campo.toLowerCase().includes('semana') || 
        (Array.isArray(primerRegistro.fields[campo]) && 
         primerRegistro.fields[campo].length > 0 && 
         typeof primerRegistro.fields[campo][0] === 'string' && 
         primerRegistro.fields[campo][0].startsWith('rec')));
      
      console.log('\nPosibles campos de semanas identificados:', camposSemana);
    }
    
    // Si estamos buscando una semana específica
    if (semanaId) {
      // Primero realizar la búsqueda directa
      const detallesSemana = await obtenerDetallesSemana(semanaId);
      
      // Si no encontramos registros con la búsqueda directa, intentar la relación inversa
      if (registros.length === 0) {
        console.log('\nNo se encontraron registros con la búsqueda directa, intentando verificar relación inversa...');
        const resultado = await verificarRelacionSemanaEmpleado(semanaId, empleadoId);
        
        if (resultado.isRelated) {
          console.log('\n=== Detalles de la Relación Empleado-Semana (Verificación Inversa) ===');
          resultado.actividades.forEach((actividad, index) => {
            console.log(`\nActividad ${index + 1}: ${actividad.id}`);
            console.log('Empleado:', actividad.empleado);
            console.log('Tienda:', actividad.tienda);
            console.log('Semana:', actividad.semana);
          });
          
          return resultado.actividades;
        }
      } else if (registros.length > 0) {
        console.log('\n=== Detalles de la Relación Empleado-Semana ===');
        registros.forEach((registro, index) => {
          console.log(`\nRegistro ${index + 1}: ${registro.id}`);
          console.log('Empleado:', registro.fields['Nombre (from Empleados)'] || registro.fields['Empleados']);
          console.log('Semana:', registro.fields['Name (from Semanas Laborales)'] || registro.fields['Semanas Laborales']);
          console.log('Fecha de inicio:', registro.fields['Fecha de Inicio (from Semanas Laborales)'] || 'No disponible');
          
          // Buscar actividades diarias si existe el campo
          if (registro.fields['Actividad Diaria'] && Array.isArray(registro.fields['Actividad Diaria'])) {
            console.log('Actividades diarias:', registro.fields['Actividad Diaria'].length);
            console.log('IDs de actividades:', registro.fields['Actividad Diaria'].join(', '));
          }
        });
      }
      
      return registros;
    }
    
    // Si no estamos buscando una semana específica, extraer todas las semanas encontradas
    const semanasUnicas = new Set();
    registros.forEach(registro => {
      // Intentar con el campo estándar primero
      let campoSemanas = 'Semanas Laborales';
      
      if (!registro.fields[campoSemanas] || !Array.isArray(registro.fields[campoSemanas])) {
        // Si no existe, buscar algún campo que contenga "semana" en su nombre
        campoSemanas = Object.keys(registro.fields).find(campo => 
          campo.toLowerCase().includes('semana') &&
          Array.isArray(registro.fields[campo])
        );
      }
      
      if (campoSemanas && registro.fields[campoSemanas] && Array.isArray(registro.fields[campoSemanas])) {
        console.log(`Registro ${registro.id} - Usando campo "${campoSemanas}" - Semanas: ${registro.fields[campoSemanas].length}`);
        registro.fields[campoSemanas].forEach(semanaId => {
          semanasUnicas.add(semanaId);
        });
      } else {
        console.log(`Registro ${registro.id} - No se encontraron semanas en un formato reconocible`);
      }
    });
    
    const semanasArray = Array.from(semanasUnicas);
    console.log(`Total de semanas únicas: ${semanasArray.length}`);
    
    // Si hay semanas, buscar detalles de la primera semana para confirmar estructura
    if (semanasArray.length > 0) {
      const primeraSemanaId = semanasArray[0];
      await obtenerDetallesSemana(primeraSemanaId);
    }
    
    return semanasArray;
  } catch (error) {
    console.error('Error al buscar semanas del empleado:', error);
    return [];
  }
}

/**
 * Obtiene y muestra detalles de una semana específica
 * @param {string} semanaId - ID de la semana a consultar
 * @returns {Promise<Object|null>} - Detalles de la semana o null en caso de error
 */
async function obtenerDetallesSemana(semanaId) {
  try {
    console.log(`\nBuscando detalles para la semana (ID: ${semanaId})...`);
    
    const detallesSemana = await airtable(semanasLaboralesTableId)
      .find(semanaId);
    
    console.log('\n=== Detalles de la Semana ===');
    console.log('ID:', detallesSemana.id);
    console.log('Nombre:', detallesSemana.fields['Name'] || 'No disponible');
    console.log('Fecha de Inicio:', detallesSemana.fields['Fecha de Inicio'] || 'No disponible');
    console.log('Fecha de Fin:', detallesSemana.fields['Fecha de fin'] || 'No disponible');
    console.log('Mes:', detallesSemana.fields['Mes'] || 'No disponible');
    console.log('Año:', detallesSemana.fields['Year'] || 'No disponible');
    
    // Mostrar días laborales asociados si existen
    if (detallesSemana.fields['Dias Laborales'] && Array.isArray(detallesSemana.fields['Dias Laborales'])) {
      console.log('Días laborales asociados:', detallesSemana.fields['Dias Laborales'].length);
      console.log('IDs de días:', detallesSemana.fields['Dias Laborales'].slice(0, 3).join(', ') + 
                (detallesSemana.fields['Dias Laborales'].length > 3 ? '...' : ''));
    }
    
    // Mostrar actividades semanales asociadas si existen
    if (detallesSemana.fields['Actividad Semanal'] && Array.isArray(detallesSemana.fields['Actividad Semanal'])) {
      console.log('Actividades semanales asociadas:', detallesSemana.fields['Actividad Semanal'].length);
      console.log('IDs de actividades:', detallesSemana.fields['Actividad Semanal'].slice(0, 3).join(', ') + 
                (detallesSemana.fields['Actividad Semanal'].length > 3 ? '...' : ''));
    }
    
    // Analizar todos los campos disponibles en la semana
    analizarEstructuraRegistro(detallesSemana);
    
    return detallesSemana;
  } catch (error) {
    console.error('Error al obtener detalles de la semana:', error);
    return null;
  }
}

/**
 * Busca la estructura de la tabla
 */
async function explorarEstructuraTabla() {
  try {
    console.log('\n=== Explorando Estructura de la Tabla de Actividad Semanal ===');
    
    // Obtener los primeros registros de la tabla sin filtros
    const registros = await airtable(actividadSemanalTableId)
      .select({
        maxRecords: 5
      })
      .all();
    
    console.log(`Registros encontrados para análisis: ${registros.length}`);
    
    if (registros.length === 0) {
      console.log('No se encontraron registros para analizar la estructura.');
      return;
    }
    
    // Analizar el primer registro
    const primerRegistro = registros[0];
    const campos = analizarEstructuraRegistro(primerRegistro);
    
    // Identificar los campos relacionados con empleados
    const camposEmpleado = campos.filter(campo => 
      campo.toLowerCase().includes('empleado') || 
      campo.toLowerCase().includes('employee'));
    
    console.log('\nPosibles campos de empleado identificados:', camposEmpleado);
    
    // Identificar los campos relacionados con semanas
    const camposSemana = campos.filter(campo => 
      campo.toLowerCase().includes('semana') || 
      campo.toLowerCase().includes('week'));
    
    console.log('Posibles campos de semana identificados:', camposSemana);
    
    // Mostrar un resumen de cuántos registros tienen cada campo
    console.log('\n=== Resumen de Campos ===');
    for (const campo of campos) {
      let conValor = 0;
      let sinValor = 0;
      
      registros.forEach(registro => {
        if (registro.fields[campo] && 
            ((Array.isArray(registro.fields[campo]) && registro.fields[campo].length > 0) || 
             (!Array.isArray(registro.fields[campo]) && registro.fields[campo] !== ''))) {
          conValor++;
        } else {
          sinValor++;
        }
      });
      
      console.log(`- ${campo}: ${conValor} con valor, ${sinValor} sin valor`);
    }
  } catch (error) {
    console.error('Error al explorar estructura de la tabla:', error);
  }
}

/**
 * Entrada principal del script
 */
async function main() {
  // Verificar si se proporcionaron parámetros
  const empleadoId = process.argv[2];
  const semanaId = process.argv[3]; // Segundo parámetro: ID de semana (opcional)
  
  if (!empleadoId) {
    console.error('\nError: Debe proporcionar un ID de empleado como primer argumento.');
    console.log('Uso: node test-buscar-semanas-empleado.js [ID_EMPLEADO] [ID_SEMANA_OPCIONAL]');
    console.log('Ejemplo 1: node test-buscar-semanas-empleado.js recABC123DEF456');
    console.log('Ejemplo 2: node test-buscar-semanas-empleado.js recABC123DEF456 recXYZ789UVW');
    return;
  }
  
  try {
    // Primero explorar la estructura general de la tabla si no tenemos semanaId
    if (!semanaId) {
      await explorarEstructuraTabla();
    }
    
    // Ejecutar la búsqueda de semanas (con o sin ID de semana específico)
    const resultado = await buscarSemanasEmpleado(empleadoId, semanaId);
    
    // Mostrar los resultados apropiados según el tipo de búsqueda
    if (!semanaId) {
      console.log('\n=== Resultado: Semanas del Empleado ===');
      if (resultado.length > 0) {
        console.log(`Se encontraron ${resultado.length} semanas generadas para el empleado ${empleadoId}:`);
        resultado.forEach((semanaId, index) => {
          console.log(`${index + 1}. ${semanaId}`);
        });
      } else {
        console.log(`No se encontraron semanas generadas para el empleado ${empleadoId}`);
      }
    } else {
      console.log('\n=== Resultado: Búsqueda Específica ===');
      if (Array.isArray(resultado) && resultado.length > 0) {
        console.log(`Se encontró la relación entre el empleado ${empleadoId} y la semana ${semanaId}`);
        console.log(`Total de registros encontrados: ${resultado.length}`);
      } else {
        console.log(`No se encontró ninguna relación entre el empleado ${empleadoId} y la semana ${semanaId}`);
      }
    }
    
    console.log('\nBúsqueda completada exitosamente.');
  } catch (error) {
    console.error('\nError al ejecutar la búsqueda:', error);
  }
}

// Ejecutar el script
main(); 