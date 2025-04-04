// Script para probar la actualización de datos de tiendas
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Obtener configuración desde línea de comandos o valores por defecto
const recordId = process.argv[2];
const paisValue = process.argv[3] || 'ESPAÑA';

if (!recordId) {
  console.error('Error: Se requiere el ID de la tienda como primer parámetro');
  console.log('Uso: node src/scripts/test-update-tienda.js <recordId> [paisValue]');
  process.exit(1);
}

// URL de la API (siempre usamos localhost en desarrollo)
const baseUrl = 'http://localhost:3000';
const apiUrl = `${baseUrl}/api/tienda/${recordId}`;

async function main() {
  try {
    console.log(`\x1b[1mProbando actualización de tienda ${recordId}\x1b[0m`);
    console.log(`URL de la API: ${apiUrl}`);
    console.log(`Valor de PAIS a establecer: "${paisValue}"\n`);
    
    // Primero obtenemos los datos actuales
    console.log('1. Obteniendo datos actuales...');
    console.log('NOTA: Asegúrate de que el servidor de desarrollo esté ejecutándose con "npm run dev"');
    
    // Probar con API directa de Airtable para verificar que la tienda existe
    console.log('\nProbando acceso directo con Airtable SDK...');
    const Airtable = require('airtable');
    
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tiendaTableId = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID || 'tblpHRqsBrADEkeUL';
    
    if (!apiKey || !baseId) {
      throw new Error('Faltan variables de entorno de Airtable');
    }
    
    const base = new Airtable({ apiKey }).base(baseId);
    const tiendaTable = base(tiendaTableId);
    
    console.log('Obteniendo datos de la tienda desde Airtable...');
    
    try {
      const record = await tiendaTable.find(recordId);
      console.log('Datos actuales desde Airtable:');
      console.log(`  ID: ${record.id}`);
      console.log(`  Tienda: ${record.fields.TIENDA || '[Sin nombre]'}`);
      console.log(`  PAIS actual: ${record.fields.PAIS || '[VACÍO]'}`);
      
      // Probar actualización directa con Airtable SDK
      console.log('\nProbando actualización directa con Airtable SDK...');
      
      // Probar ambos formatos: valor directo y objeto con name
      try {
        // Formato directo
        console.log('Actualizando con valor directo:');
        const directResult = await tiendaTable.update(recordId, {
          'PAIS': paisValue
        });
        console.log('\x1b[32mActualización exitosa con valor directo\x1b[0m');
        console.log('PAIS actualizado a:', directResult.fields.PAIS);
        
        console.log('\nVerificando resultado final...');
        const finalRecord = await tiendaTable.find(recordId);
        console.log('Datos finales:');
        console.log(`  PAIS: ${finalRecord.fields.PAIS || '[VACÍO]'}`);
        
        if (finalRecord.fields.PAIS === paisValue) {
          console.log('\n\x1b[32m✓ ÉXITO: El campo PAIS se actualizó correctamente\x1b[0m');
        } else {
          console.log(`\n\x1b[31m✗ ERROR: El campo PAIS no se actualizó al valor esperado "${paisValue}"\x1b[0m`);
        }
      } catch (directError) {
        console.error('\x1b[31mError con valor directo:\x1b[0m', directError.message);
        
        // Intentar con formato objeto {name}
        try {
          console.log('\nProbando con objeto {name}:');
          const objectResult = await tiendaTable.update(recordId, {
            'PAIS': { name: paisValue }
          });
          console.log('\x1b[32mActualización exitosa con objeto {name}\x1b[0m');
          console.log('PAIS actualizado a:', objectResult.fields.PAIS);
          
          console.log('\nVerificando resultado final...');
          const finalRecord = await tiendaTable.find(recordId);
          console.log('Datos finales:');
          console.log(`  PAIS: ${finalRecord.fields.PAIS || '[VACÍO]'}`);
          
          if (finalRecord.fields.PAIS === paisValue) {
            console.log('\n\x1b[32m✓ ÉXITO: El campo PAIS se actualizó correctamente\x1b[0m');
          } else {
            console.log(`\n\x1b[31m✗ ERROR: El campo PAIS no se actualizó al valor esperado "${paisValue}"\x1b[0m`);
          }
        } catch (objectError) {
          console.error('\x1b[31mError con objeto {name}:\x1b[0m', objectError.message);
        }
      }
    } catch (error) {
      console.error('\x1b[31mError al obtener o actualizar la tienda:\x1b[0m', error.message);
    }
    
  } catch (error) {
    console.error('\n\x1b[31mError en la ejecución:\x1b[0m', error.message);
    process.exit(1);
  }
}

main(); 