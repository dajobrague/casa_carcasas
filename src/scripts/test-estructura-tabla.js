// Script para obtener la estructura de la tabla de actividades diarias
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

// Función para analizar la estructura de la tabla
async function analizarEstructuraTabla() {
  try {
    console.log('\n=== Analizando estructura de la tabla de actividades diarias ===');
    
    // Obtener los primeros 100 registros para analizar estructura
    const registros = await airtable(actividadDiariaTableId)
      .select({
        maxRecords: 100,
        view: 'Grid view'
      })
      .firstPage();
    
    console.log(`Registros obtenidos para análisis: ${registros.length}`);
    
    if (registros.length === 0) {
      return { error: 'No se encontraron registros en la tabla' };
    }
    
    // Recopilar todos los campos encontrados en los registros
    const todosCampos = new Set();
    const camposTipos = new Map();
    const camposHora = new Set();
    const valoresPorCampo = new Map();
    
    // Patrón para detectar campos con formato de hora
    const patronHora = /^(\d{1,2}):(\d{2})$/;
    
    // Analizar todos los registros
    registros.forEach(registro => {
      Object.entries(registro.fields).forEach(([campo, valor]) => {
        // Agregar a la lista de todos los campos
        todosCampos.add(campo);
        
        // Guardar el tipo de valor
        const tipo = Array.isArray(valor) ? 'array' : typeof valor;
        camposTipos.set(campo, tipo);
        
        // Verificar si es un campo con formato de hora (HH:MM)
        if (patronHora.test(campo)) {
          camposHora.add(campo);
          
          // Guardar los valores posibles para este campo
          if (!valoresPorCampo.has(campo)) {
            valoresPorCampo.set(campo, new Set());
          }
          
          if (valor) {
            valoresPorCampo.get(campo).add(valor);
          }
        }
      });
    });
    
    // Ordenar campos alfabéticamente
    const camposOrdenados = Array.from(todosCampos).sort();
    
    console.log('\n=== Todos los campos encontrados ===');
    console.log(`Total campos: ${camposOrdenados.length}`);
    
    console.log('\n=== Campos con formato de hora (HH:MM) ===');
    if (camposHora.size > 0) {
      const camposHoraOrdenados = Array.from(camposHora).sort();
      console.log(`Se encontraron ${camposHoraOrdenados.length} campos con formato de hora:`);
      
      camposHoraOrdenados.forEach(campo => {
        const valores = valoresPorCampo.get(campo);
        console.log(`- ${campo} (${camposTipos.get(campo)}): ${valores && valores.size > 0 ? `${valores.size} valores distintos` : 'Sin valores'}`);
        
        // Mostrar los valores para este campo
        if (valores && valores.size > 0) {
          console.log('  Valores:');
          Array.from(valores).slice(0, 10).forEach(v => {
            console.log(`    * "${v}"`);
          });
          
          if (valores.size > 10) {
            console.log(`    * ... y ${valores.size - 10} más`);
          }
        }
      });
    } else {
      console.log('No se encontraron campos con formato de hora (HH:MM).');
    }
    
    // Buscar otros campos que podrían contener información de horas
    console.log('\n=== Otros campos relacionados con horas ===');
    const camposRelacionadosHoras = camposOrdenados.filter(campo => {
      const nombreCampo = campo.toLowerCase();
      return !patronHora.test(campo) && (
        nombreCampo.includes('hora') || 
        nombreCampo.includes('time') || 
        nombreCampo.includes('turno')
      );
    });
    
    if (camposRelacionadosHoras.length > 0) {
      console.log(`Se encontraron ${camposRelacionadosHoras.length} campos relacionados con horas:`);
      camposRelacionadosHoras.forEach(campo => {
        console.log(`- ${campo} (${camposTipos.get(campo)})`);
      });
    } else {
      console.log('No se encontraron otros campos relacionados con horas.');
    }
    
    // Análisis específico: buscar campos con nombres de horas en formato amigable
    console.log('\n=== Búsqueda alternativa: campos que podrían ser horas ===');
    
    // Generar nombres de horas en formatos alternativos
    const formatosHoraPosibles = [];
    for (let h = 0; h < 24; h++) {
      formatosHoraPosibles.push(
        `${h}:00`, `${h}:30`,
        `${h.toString().padStart(2, '0')}:00`, `${h.toString().padStart(2, '0')}:30`,
        `${h}h`, `${h}h30`,
        `${h} AM`, `${h} PM`,
        `${h}:00 AM`, `${h}:00 PM`,
        `${h}:30 AM`, `${h}:30 PM`
      );
    }
    
    const camposFormatoAlternativo = camposOrdenados.filter(campo => 
      formatosHoraPosibles.some(formato => campo.includes(formato) || campo === formato)
    );
    
    if (camposFormatoAlternativo.length > 0) {
      console.log(`Se encontraron ${camposFormatoAlternativo.length} campos con posible formato alternativo de hora:`);
      camposFormatoAlternativo.forEach(campo => {
        console.log(`- ${campo} (${camposTipos.get(campo)})`);
      });
    } else {
      console.log('No se encontraron campos con formato alternativo de hora.');
    }
    
    // Examinar un registro específico para ver todos sus campos
    const primerRegistro = registros[0];
    console.log('\n=== Detalle del primer registro ===');
    console.log(`ID: ${primerRegistro.id}`);
    
    if ('Fecha Format' in primerRegistro.fields) {
      console.log(`Fecha: ${primerRegistro.fields['Fecha Format']}`);
    }
    
    console.log('Campos:');
    Object.entries(primerRegistro.fields).forEach(([campo, valor]) => {
      const valorStr = Array.isArray(valor) ? `[${valor.join(', ')}]` : valor;
      console.log(`- ${campo}: ${valorStr}`);
    });
    
    return {
      camposTotal: camposOrdenados.length,
      camposHora: Array.from(camposHora),
      camposRelacionadosHoras,
      camposFormatoAlternativo
    };
  } catch (error) {
    console.error('Error general:', error);
    return { error: error.message };
  }
}

// Ejecutar el análisis
analizarEstructuraTabla()
  .then(resultado => {
    if (resultado.error) {
      console.error('\nError en el análisis:', resultado.error);
    } else {
      console.log('\nAnálisis de estructura completado con éxito.');
    }
  })
  .catch(err => console.error('Error en la ejecución:', err)); 