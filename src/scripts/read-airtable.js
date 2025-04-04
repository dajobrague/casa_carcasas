// Script para leer tablas de Airtable y mostrar su estructura
require('dotenv').config({ path: '.env.local' });
const Airtable = require('airtable');

// Configurar Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('Error: Se requieren las variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID');
  console.error('Por favor, asegúrate de que el archivo .env.local contiene estas variables.');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);

// Tablas de interés 
// Nota: Obtenemos los IDs directamente desde las variables de entorno
const TABLES = [
  { 
    name: 'Tienda y Supervisor', 
    id: process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID || 'tblpHRqsBrADEkeUL' 
  },
  { 
    name: 'Empleados', 
    id: process.env.AIRTABLE_EMPLEADOS_TABLE_ID || 'tblX55NaVxeYDkYGi' 
  }
];

// Obtener tabla específica o todas
const targetTableId = process.argv[2];
const tablesToProcess = targetTableId 
  ? TABLES.filter(t => t.id === targetTableId)
  : TABLES;

if (targetTableId && tablesToProcess.length === 0) {
  console.error(`Error: Tabla con ID ${targetTableId} no encontrada`);
  console.log('Tablas disponibles:');
  TABLES.forEach(t => console.log(`- ${t.name} (${t.id})`));
  process.exit(1);
}

// Función para analizar y mostrar la estructura de una tabla
async function analyzeTable(tableInfo) {
  console.log('\n========================================');
  console.log(`TABLA: ${tableInfo.name} (${tableInfo.id})`);
  console.log('========================================\n');

  const table = base(tableInfo.id);
  
  try {
    // Obtener los primeros 5 registros
    const records = await table.select({
      maxRecords: 5
    }).all();

    if (records.length === 0) {
      console.log('No hay registros en esta tabla.');
      return;
    }

    console.log(`Total registros de muestra: ${records.length}\n`);
    
    // Analizar campos
    const fields = {};
    
    records.forEach(record => {
      Object.entries(record.fields).forEach(([fieldName, fieldValue]) => {
        if (!fields[fieldName]) {
          fields[fieldName] = {
            type: typeof fieldValue,
            examples: [],
            possibleValues: new Set()
          };
        }
        
        // Añadir ejemplo si no hay muchos
        if (fields[fieldName].examples.length < 2 && 
            !fields[fieldName].examples.includes(fieldValue)) {
          fields[fieldName].examples.push(fieldValue);
        }
        
        // Para campos que parecen enumeraciones
        if (typeof fieldValue === 'string' && fieldValue.length < 50) {
          fields[fieldName].possibleValues.add(fieldValue);
        }
      });
    });

    // Mostrar información de campos
    console.log('CAMPOS:');
    console.log('-------\n');
    
    Object.entries(fields).forEach(([fieldName, fieldData]) => {
      console.log(`\x1b[1m${fieldName}\x1b[0m (${fieldData.type})`);
      
      // Mostrar ejemplos
      if (fieldData.examples.length > 0) {
        console.log('  Ejemplos:');
        fieldData.examples.forEach((example, i) => {
          const exampleStr = typeof example === 'object' 
            ? JSON.stringify(example) 
            : String(example);
          console.log(`    - ${exampleStr}`);
        });
      }
      
      // Mostrar valores posibles para enumeraciones
      if (fieldData.possibleValues.size > 0 && fieldData.possibleValues.size < 10) {
        console.log('  Valores posibles:');
        console.log(`    ${Array.from(fieldData.possibleValues).join(', ')}`);
      }
      
      console.log(''); // Espacio entre campos
    });

    // Mostrar un registro completo como ejemplo
    console.log('\nEJEMPLO DE REGISTRO COMPLETO:');
    console.log('---------------------------\n');
    console.log(`ID: ${records[0].id}`);
    console.log('Campos:');
    Object.entries(records[0].fields).forEach(([key, value]) => {
      console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    });
    
  } catch (error) {
    console.error(`Error al analizar la tabla ${tableInfo.name}:`, error);
  }
}

// Procesar las tablas
async function main() {
  console.log(`\x1b[1mAnalizando ${tablesToProcess.length} tabla(s) de Airtable\x1b[0m`);
  
  for (const tableInfo of tablesToProcess) {
    await analyzeTable(tableInfo);
  }
}

main().catch(error => {
  console.error('Error en la ejecución:', error);
  process.exit(1);
}); 