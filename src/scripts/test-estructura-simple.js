// Script simple para revisar la estructura de la tabla de actividades diarias
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

// Función simple para analizar la estructura de la tabla
async function analizarTabla() {
  try {
    console.log('\n=== Obteniendo registros de la tabla de actividades diarias ===');
    
    // Obtener los primeros registros (sin filtros)
    const registros = await airtable(actividadDiariaTableId)
      .select({
        maxRecords: 10 // Limitamos a 10 para no sobrecargar
      })
      .firstPage();
    
    console.log(`Registros obtenidos: ${registros.length}`);
    
    if (registros.length === 0) {
      console.log('No se encontraron registros en la tabla.');
      return;
    }
    
    // Mostrar el primer registro con todos sus campos
    const primerRegistro = registros[0];
    console.log('\n=== Detalle del primer registro ===');
    console.log(`ID del registro: ${primerRegistro.id}`);
    
    // Mostrar todos los campos del registro
    console.log('\nCampos disponibles:');
    Object.keys(primerRegistro.fields).sort().forEach(campo => {
      const valor = primerRegistro.fields[campo];
      const tipo = Array.isArray(valor) ? 'Array' : typeof valor;
      const valorMostrar = Array.isArray(valor) ? 
                          `[${valor.length} elementos]` : 
                          (tipo === 'string' ? `"${valor}"` : valor);
      
      console.log(`- ${campo} (${tipo}): ${valorMostrar}`);
    });
    
    // Buscar campos que podrían ser horas (formato HH:MM)
    console.log('\n=== Buscando campos con formato de hora (HH:MM) ===');
    const patronHora = /^(\d{1,2}):(\d{2})$/;
    
    const camposHora = Object.keys(primerRegistro.fields).filter(campo => 
      patronHora.test(campo)
    );
    
    if (camposHora.length > 0) {
      console.log(`Se encontraron ${camposHora.length} campos con formato de hora:`);
      camposHora.sort().forEach(campo => {
        console.log(`- ${campo}: ${primerRegistro.fields[campo] || '(sin valor)'}`);
      });
    } else {
      console.log('No se encontraron campos con formato de hora.');
    }
    
    // Buscar campos relacionados con horas
    console.log('\n=== Campos relacionados con horas o actividades ===');
    const camposHoras = Object.keys(primerRegistro.fields).filter(campo => {
      const nombreCampo = campo.toLowerCase();
      return nombreCampo.includes('hora') || 
             nombreCampo.includes('time') || 
             nombreCampo.includes('actividad') ||
             nombreCampo.includes('trabajo');
    });
    
    if (camposHoras.length > 0) {
      console.log(`Se encontraron ${camposHoras.length} campos relacionados con horas/actividades:`);
      camposHoras.sort().forEach(campo => {
        const valor = primerRegistro.fields[campo];
        console.log(`- ${campo}: ${valor || '(sin valor)'}`);
      });
    } else {
      console.log('No se encontraron campos relacionados con horas.');
    }
    
    // Mostrar los nombres de todos los campos en todos los registros
    console.log('\n=== Todos los campos encontrados en todos los registros ===');
    const todosCampos = new Set();
    
    registros.forEach(registro => {
      Object.keys(registro.fields).forEach(campo => {
        todosCampos.add(campo);
      });
    });
    
    const camposOrdenados = Array.from(todosCampos).sort();
    console.log(`Total de campos distintos: ${camposOrdenados.length}`);
    console.log('Lista de todos los campos:');
    camposOrdenados.forEach(campo => {
      console.log(`- ${campo}`);
    });
    
  } catch (error) {
    console.error('Error al analizar la tabla:', error);
  }
}

// Ejecutar
analizarTabla()
  .then(() => console.log('\nAnálisis completado.'))
  .catch(err => console.error('Error en la ejecución:', err)); 