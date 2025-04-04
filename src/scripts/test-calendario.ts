// Script para probar la consulta a la tabla de actividad diaria por fecha y empleado
const Airtable = require('airtable');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

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
const anio = process.argv[4];       // Tercer argumento: año (ej. 2024)

if (!empleadoId || !mes || !anio) {
  console.error('Uso: ts-node src/scripts/test-calendario.ts [empleadoId] [mes] [año]');
  console.error('Ejemplo: ts-node src/scripts/test-calendario.ts recZX7pLmVnLBSW3K 5 2024');
  process.exit(1);
}

console.log(`Buscando actividades para empleado: ${empleadoId}, mes: ${mes}, año: ${anio}`);

// Definir interfaces para los tipos
interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: any;
  };
  _rawJson: any;
}

// Función para probar la consulta
async function testCalendarioQuery() {
  try {
    // Método 1: Buscar todas las actividades del empleado y filtrar por fecha
    console.log("\n=== MÉTODO 1: FIND en Empleados y filtrar por fechas ===");
    
    const formula1 = `FIND("${empleadoId}", {Empleados})`;
    console.log(`Formula: ${formula1}`);
    
    const allRecords = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formula1
      })
      .all();
    
    console.log(`Actividades totales encontradas: ${allRecords.length}`);
    
    // Mostrar campos del primer registro (si existe)
    if (allRecords.length > 0) {
      console.log('Muestra del primer registro:');
      console.log('ID:', allRecords[0].id);
      console.log('Campos disponibles:', Object.keys(allRecords[0].fields));
      console.log('Campo Fecha Format:', allRecords[0].fields['Fecha Format']);
      console.log('Campo Empleados:', allRecords[0].fields['Empleados']);
    }
    
    // Filtrar por mes/año
    const activitiesFiltered = allRecords.filter((record: AirtableRecord) => {
      const fechaFormat = record.fields['Fecha Format'];
      if (!fechaFormat) return false;
      
      // Formato DD/MM/YYYY
      const match = fechaFormat.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const dia = match[1];
        const recordMes = match[2];
        const recordAnio = match[3];
        return recordMes === mes && recordAnio === anio;
      }
      return false;
    });
    
    console.log(`Actividades filtradas para mes ${mes}/${anio}: ${activitiesFiltered.length}`);
    
    // Mostrar los primeros 5 registros filtrados
    console.log("Primeros registros filtrados:");
    activitiesFiltered.slice(0, 5).forEach((record: AirtableRecord, index: number) => {
      console.log(`[${index}] ID: ${record.id}, Fecha: ${record.fields['Fecha Format']}`);
    });
    
    // Método 2: Usar una fórmula combinada en la consulta
    console.log("\n=== MÉTODO 2: Fórmula combinada con AND y REGEX_MATCH ===");
    
    // Construir expresión para verificar que Fecha Format contenga /mes/año
    // Por ejemplo, buscar "5/2024" para encontrar cualquier día de mayo 2024
    const patronFecha = `${mes}\\/${anio}`;
    const formula2 = `AND(FIND("${empleadoId}", {Empleados}), REGEX_MATCH({Fecha Format}, "${patronFecha}"))`;
    console.log(`Formula: ${formula2}`);
    
    const recordsMethod2 = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formula2
      })
      .all();
    
    console.log(`Actividades encontradas con método 2: ${recordsMethod2.length}`);
    
    // Mostrar los primeros 5 registros del método 2
    console.log("Primeros registros (método 2):");
    recordsMethod2.slice(0, 5).forEach((record: AirtableRecord, index: number) => {
      console.log(`[${index}] ID: ${record.id}, Fecha: ${record.fields['Fecha Format']}`);
    });
    
    // Método 3: Buscar cada día del mes específicamente
    console.log("\n=== MÉTODO 3: Buscar por días específicos del mes ===");
    
    // Determinar el número de días en el mes
    const diasEnMes = new Date(parseInt(anio), parseInt(mes), 0).getDate();
    console.log(`Días en el mes ${mes}/${anio}: ${diasEnMes}`);
    
    // Construir un array de fórmulas de búsqueda para cada día
    const formulasPorDia = [];
    for (let dia = 1; dia <= diasEnMes; dia++) {
      // Formatear día con ceros iniciales si es necesario
      const diaStr = dia.toString().padStart(2, '0');
      const mesStr = mes.toString().padStart(2, '0');
      
      // Fecha en formato DD/MM/YYYY
      const fechaFormateada = `${diaStr}/${mesStr}/${anio}`;
      
      // Crear fórmula para buscar actividades de este empleado en esta fecha específica
      const formulaDia = `AND(FIND("${empleadoId}", {Empleados}), {Fecha Format}="${fechaFormateada}")`;
      formulasPorDia.push(formulaDia);
    }
    
    // Combinar todas las fórmulas con OR
    const formulaCompleta = `OR(${formulasPorDia.join(', ')})`;
    
    console.log("Ejecutando búsqueda por días específicos...");
    
    const recordsMethod3 = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formulaCompleta
      })
      .all();
    
    console.log(`Actividades encontradas con método 3: ${recordsMethod3.length}`);
    
    // Mostrar los primeros 5 registros del método 3
    console.log("Primeros registros (método 3):");
    recordsMethod3.slice(0, 5).forEach((record: AirtableRecord, index: number) => {
      console.log(`[${index}] ID: ${record.id}, Fecha: ${record.fields['Fecha Format']}`);
    });
    
    console.log("\n=== RESUMEN ===");
    console.log(`Método 1: ${activitiesFiltered.length} registros`);
    console.log(`Método 2: ${recordsMethod2.length} registros`);
    console.log(`Método 3: ${recordsMethod3.length} registros`);
    
  } catch (error) {
    console.error('Error al consultar datos:', error);
  }
}

// Ejecutar la consulta
testCalendarioQuery()
  .then(() => console.log('Prueba completada'))
  .catch(err => console.error('Error en la prueba:', err)); 