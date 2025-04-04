// Script para inspeccionar los campos de un registro de actividad
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
  console.error('Uso: node src/scripts/test-campos-hora.js [empleadoId] [mes] [año]');
  console.error('Ejemplo: node src/scripts/test-campos-hora.js rec0hQqSaGCveK9a0 4 2025');
  process.exit(1);
}

// Formatear el mes con ceros iniciales si es necesario
const mesFormateado = mes.padStart(2, '0');
// Construir el patrón para el mes y año (YYYY-MM)
const patronFecha = `${year}-${mesFormateado}`;

console.log(`Analizando registros para empleado: ${empleadoId}, mes: ${patronFecha}`);

async function analizarCamposActividad() {
  try {
    console.log('\n=== Buscando actividades del mes ===');
    // Obtener todas las actividades del mes
    const formula = `REGEX_MATCH({Fecha Format}, "^${patronFecha}")`;
    console.log('Fórmula:', formula);
    
    const allRecords = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formula
      })
      .all();
    
    console.log(`Total registros para ${patronFecha}: ${allRecords.length}`);
    
    // Filtrar manualmente por empleado
    const actividades = allRecords.filter(record => {
      const empleados = record.fields['Empleados'] || [];
      return empleados.includes(empleadoId);
    });
    
    console.log(`Actividades encontradas para empleado ${empleadoId}: ${actividades.length}`);
    
    if (actividades.length === 0) {
      return { error: 'No se encontraron actividades para el empleado en el mes especificado' };
    }

    // Analizar el primer registro en detalle
    console.log('\n=== Análisis del primer registro ===');
    const primerRegistro = actividades[0];
    
    console.log('ID del registro:', primerRegistro.id);
    console.log('Fecha Format:', primerRegistro.fields['Fecha Format']);
    
    // Mostrar todos los campos disponibles
    console.log('\nTodos los campos en el registro:');
    const campos = Object.keys(primerRegistro.fields);
    campos.sort().forEach(campo => {
      const valor = primerRegistro.fields[campo];
      const tipoValor = Array.isArray(valor) ? 'Array' : typeof valor;
      
      // Mostrar de manera especial los campos que parecen horas
      const esHora = /^\d{1,2}:\d{2}$/.test(campo);
      
      console.log(`- ${campo} (${tipoValor}): ${esHora ? '⭐ ' : ''}${JSON.stringify(valor)}`);
    });
    
    // Buscar campos que podrían contener horas
    console.log('\nCampos potenciales de horas:');
    const camposHora = campos.filter(campo => /^\d{1,2}:\d{2}$/.test(campo));
    
    if (camposHora.length > 0) {
      console.log(`Se encontraron ${camposHora.length} campos de hora:`);
      camposHora.forEach(campo => {
        console.log(`- ${campo}: ${JSON.stringify(primerRegistro.fields[campo])}`);
      });
    } else {
      console.log('No se encontraron campos con formato de hora (HH:MM)');
    }
    
    // Buscar campos relacionados con tipos de actividad
    console.log('\nCampos potenciales de tipo de actividad:');
    const tiposActividad = campos.filter(campo => {
      const nombreCampo = campo.toLowerCase();
      return nombreCampo.includes('tipo') || 
             nombreCampo.includes('actividad') || 
             nombreCampo.includes('estado');
    });
    
    tiposActividad.forEach(campo => {
      console.log(`- ${campo}: ${JSON.stringify(primerRegistro.fields[campo])}`);
    });
    
    // Buscar campos relacionados con horas totales
    console.log('\nCampos potenciales de horas totales:');
    const camposHorasTotales = campos.filter(campo => {
      const nombreCampo = campo.toLowerCase();
      return nombreCampo.includes('hora') || nombreCampo.includes('time');
    });
    
    camposHorasTotales.forEach(campo => {
      console.log(`- ${campo}: ${JSON.stringify(primerRegistro.fields[campo])}`);
    });
    
    return { actividades, campos };
  } catch (error) {
    console.error('Error general:', error);
    return { error: error.message };
  }
}

// Ejecutar el análisis
analizarCamposActividad()
  .then(resultado => {
    if (resultado.error) {
      console.error('\nError en el análisis:', resultado.error);
    } else {
      console.log('\nAnálisis completado con éxito.');
    }
  })
  .catch(err => console.error('Error en la ejecución:', err)); 