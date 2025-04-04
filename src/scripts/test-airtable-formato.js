// Script para probar específicamente el formato YYYY-MM-DD en actividades
const Airtable = require('airtable');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuración de Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const actividadDiariaTableId = 'tblbkzixVwxZ8oVqb';

console.log('API Key:', apiKey ? 'Configurada correctamente' : 'No encontrada');
console.log('Base ID:', baseId ? 'Configurado correctamente' : 'No encontrado');

// Inicializar Airtable
const airtable = new Airtable({ apiKey }).base(baseId);

// Obtener los parámetros de la línea de comandos
const empleadoId = process.argv[2]; // Primer argumento: ID del empleado
const mes = process.argv[3];        // Segundo argumento: mes (1-12)
const year = process.argv[4];       // Tercer argumento: año (ej. 2024)

if (!empleadoId || !mes || !year) {
  console.error('Uso: node src/scripts/test-airtable-formato.js [empleadoId] [mes] [año]');
  console.error('Ejemplo: node src/scripts/test-airtable-formato.js rec0hQqSaGCveK9a0 4 2025');
  process.exit(1);
}

// Formatear el mes con ceros iniciales si es necesario
const mesFormateado = mes.padStart(2, '0');

console.log(`Buscando actividades para empleado: ${empleadoId}, mes: ${mesFormateado}, año: ${year}`);

async function testBusquedaFormato() {
  try {
    // Construir el patrón para el mes y año (YYYY-MM)
    const patronFecha = `${year}-${mesFormateado}`;
    
    // Crea la fórmula con REGEX_MATCH para buscar registros que comiencen con el patrón
    const formula = `AND(FIND("${empleadoId}", {Empleados}), REGEX_MATCH({Fecha Format}, "^${patronFecha}"))`;
    
    console.log('Fórmula de búsqueda:', formula);
    
    // Ejecutar la consulta
    const records = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formula
      })
      .all();
    
    console.log(`Registros encontrados: ${records.length}`);
    
    // Mostrar detalles de los registros encontrados
    if (records.length > 0) {
      records.forEach((record, index) => {
        console.log(`\n--- Registro #${index + 1} ---`);
        console.log('ID:', record.id);
        console.log('Fecha Format:', record.fields['Fecha Format'] || 'No disponible');
        console.log('Empleados:', record.fields['Empleados'] || 'No disponible');
        console.log('Tipo de Actividad:', record.fields['Tipo Actividad'] || 'No disponible');
        console.log('Horas de Actividad:', record.fields['Horas Actividad'] || 'No disponible');
      });
    } else {
      console.log('No se encontraron registros con la fórmula especificada.');
      
      // Comprobar si el empleado existe en la tabla
      console.log('\nComprobando si el empleado existe en la tabla...');
      const checkEmpleado = `FIND("${empleadoId}", {Empleados})`;
      const empleadoRecords = await airtable(actividadDiariaTableId)
        .select({
          filterByFormula: checkEmpleado,
          maxRecords: 1
        })
        .all();
      
      if (empleadoRecords.length > 0) {
        console.log(`El empleado ${empleadoId} sí existe en la tabla, pero no tiene actividades para ${patronFecha}`);
      } else {
        console.log(`El empleado ${empleadoId} no existe en la tabla.`);
      }
      
      // Comprobar si hay registros para ese mes/año sin filtrar por empleado
      console.log('\nComprobando si hay registros para ese mes/año sin filtrar por empleado...');
      const checkFecha = `REGEX_MATCH({Fecha Format}, "^${patronFecha}")`;
      const fechaRecords = await airtable(actividadDiariaTableId)
        .select({
          filterByFormula: checkFecha,
          maxRecords: 10
        })
        .all();
      
      if (fechaRecords.length > 0) {
        console.log(`Hay ${fechaRecords.length} registros para la fecha ${patronFecha}. Ejemplo:`);
        console.log('ID:', fechaRecords[0].id);
        console.log('Fecha Format:', fechaRecords[0].fields['Fecha Format'] || 'No disponible');
        console.log('Empleados:', fechaRecords[0].fields['Empleados'] || 'No disponible');
      } else {
        console.log(`No hay registros para la fecha ${patronFecha}.`);
      }
    }
  } catch (error) {
    console.error('Error al ejecutar la consulta:', error);
  }
}

// Ejecutar la prueba
testBusquedaFormato()
  .then(() => console.log('\nPrueba completada'))
  .catch(err => console.error('Error en la prueba:', err)); 