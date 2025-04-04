// Script para probar diferentes formas de buscar un empleado en un arreglo en Airtable
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
  console.error('Uso: node src/scripts/test-airtable-alternativo.js [empleadoId] [mes] [año]');
  console.error('Ejemplo: node src/scripts/test-airtable-alternativo.js rec0hQqSaGCveK9a0 4 2025');
  process.exit(1);
}

// Formatear el mes con ceros iniciales si es necesario
const mesFormateado = mes.padStart(2, '0');
// Construir el patrón para el mes y año (YYYY-MM)
const patronFecha = `${year}-${mesFormateado}`;

console.log(`Buscando actividades para empleado: ${empleadoId}, mes: ${patronFecha}`);

async function testBusquedaAlternativa() {
  try {
    console.log('\n=== Método 1: FIND() ===');
    // Crea la fórmula con FIND
    const formula1 = `AND(FIND("${empleadoId}", {Empleados}), REGEX_MATCH({Fecha Format}, "^${patronFecha}"))`;
    console.log('Fórmula:', formula1);
    
    const records1 = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formula1
      })
      .all();
    
    console.log(`Registros encontrados: ${records1.length}`);
    
    console.log('\n=== Método 2: = en Airtable ===');
    // Crea la fórmula con el operador =
    const formula2 = `AND({Empleados}="${empleadoId}", REGEX_MATCH({Fecha Format}, "^${patronFecha}"))`;
    console.log('Fórmula:', formula2);
    
    const records2 = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formula2
      })
      .all();
    
    console.log(`Registros encontrados: ${records2.length}`);
    
    console.log('\n=== Método 3: SEARCH() ===');
    // Crea la fórmula con SEARCH
    const formula3 = `AND(SEARCH("${empleadoId}", {Empleados}), REGEX_MATCH({Fecha Format}, "^${patronFecha}"))`;
    console.log('Fórmula:', formula3);
    
    const records3 = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formula3
      })
      .all();
    
    console.log(`Registros encontrados: ${records3.length}`);
    
    console.log('\n=== Método 4: Contiene valor en arreglo ===');
    // Crea la fórmula para buscar si el arreglo contiene el valor
    const formula4 = `AND(${empleadoId} = ARRAYJOIN({Empleados},','), REGEX_MATCH({Fecha Format}, "^${patronFecha}"))`;
    console.log('Fórmula:', formula4);
    
    try {
      const records4 = await airtable(actividadDiariaTableId)
        .select({
          filterByFormula: formula4
        })
        .all();
      
      console.log(`Registros encontrados: ${records4.length}`);
    } catch (error) {
      console.error('Error en método 4:', error.message);
    }
    
    console.log('\n=== Método 5: Traer todos y filtrar manualmente ===');
    // Crea la fórmula solo para filtrar por fecha
    const formula5 = `REGEX_MATCH({Fecha Format}, "^${patronFecha}")`;
    console.log('Fórmula:', formula5);
    
    const allRecords = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formula5
      })
      .all();
    
    console.log(`Total registros para ${patronFecha}: ${allRecords.length}`);
    
    // Filtrar manualmente por empleado
    const filteredRecords = allRecords.filter(record => {
      const empleados = record.fields['Empleados'] || [];
      return empleados.includes(empleadoId);
    });
    
    console.log(`Registros filtrados manualmente para empleado ${empleadoId}: ${filteredRecords.length}`);
    
    // Mostrar los registros encontrados
    if (filteredRecords.length > 0) {
      filteredRecords.forEach((record, index) => {
        console.log(`\n--- Registro #${index + 1} ---`);
        console.log('ID:', record.id);
        console.log('Fecha Format:', record.fields['Fecha Format'] || 'No disponible');
        console.log('Empleados:', record.fields['Empleados']);
      });
    }
    
    return { filteredRecords };
  } catch (error) {
    console.error('Error general:', error);
    return { error };
  }
}

// Ejecutar la prueba
testBusquedaAlternativa()
  .then(result => {
    console.log('\nPrueba completada. Resumen:');
    if (result.filteredRecords) {
      const fechas = result.filteredRecords.map(r => r.fields['Fecha Format']);
      console.log(`Se encontraron ${result.filteredRecords.length} registros para ${empleadoId} en ${patronFecha}`);
      console.log('Fechas encontradas:', fechas.join(', '));
    } else {
      console.log('No se encontraron registros o hubo un error.');
    }
  })
  .catch(err => console.error('Error en la prueba:', err)); 