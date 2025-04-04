// Script para verificar si hay datos en la tabla de actividades diarias
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

async function verifyActividades() {
  try {
    console.log('Consultando tabla de actividades diarias...');
    
    // Obtener los primeros 10 registros sin filtros
    const records = await airtable(actividadDiariaTableId)
      .select({
        maxRecords: 10
      })
      .all();
    
    console.log(`Total registros encontrados: ${records.length}`);
    
    // Mostrar detalles de cada registro
    if (records.length > 0) {
      records.forEach((record, index) => {
        console.log(`\n--- Registro #${index + 1} ---`);
        console.log('ID:', record.id);
        console.log('Campos:', Object.keys(record.fields).join(', '));
        
        // Detalles específicos importantes
        console.log('Fecha Format:', record.fields['Fecha Format'] || 'No disponible');
        console.log('Empleados:', record.fields['Empleados'] || 'No disponible');
        
        // Si hay empleados, contar cuántos
        if (record.fields['Empleados'] && Array.isArray(record.fields['Empleados'])) {
          console.log('Número de empleados:', record.fields['Empleados'].length);
          console.log('IDs de empleados:', record.fields['Empleados'].join(', '));
        }
      });
      
      // Obtener lista única de todos los empleados
      const empleadosSet = new Set();
      records.forEach(record => {
        if (record.fields['Empleados'] && Array.isArray(record.fields['Empleados'])) {
          record.fields['Empleados'].forEach(empId => empleadosSet.add(empId));
        }
      });
      
      console.log('\n=== Empleados únicos encontrados ===');
      const empleadosArray = Array.from(empleadosSet);
      console.log(`Total: ${empleadosArray.length}`);
      console.log('IDs:', empleadosArray.join(', '));
      
    } else {
      console.log('No se encontraron registros en la tabla de actividades diarias.');
    }
    
  } catch (error) {
    console.error('Error al consultar la tabla:', error);
  }
}

// Ejecutar la verificación
verifyActividades()
  .then(() => console.log('\nVerificación completada'))
  .catch(err => console.error('Error en la verificación:', err)); 