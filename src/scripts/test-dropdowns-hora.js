// Script para analizar los dropdown de horas en las actividades diarias
const Airtable = require('airtable');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuración de Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const actividadDiariaTableId = 'tblbkzixVwxZ8oVqb';
const tiendasTableId = 'tblPbxJkAqBQ1Qzcy'; // Tabla de tiendas para verificar el país

console.log('API Key:', apiKey ? 'Configurada correctamente' : 'No encontrada');
console.log('Base ID:', baseId ? 'Configurado correctamente' : 'No encontrado');

// Inicializar Airtable
const airtable = new Airtable({ apiKey }).base(baseId);

// Obtener los parámetros de la línea de comandos
const empleadoId = process.argv[2]; // Primer argumento: ID del empleado
const mes = process.argv[3];        // Segundo argumento: mes (1-12)
const year = process.argv[4];       // Tercer argumento: año (ej. 2024)
const tiendaId = process.argv[5];   // Cuarto argumento (opcional): ID de la tienda

if (!empleadoId || !mes || !year) {
  console.error('Uso: node src/scripts/test-dropdowns-hora.js [empleadoId] [mes] [año] [tiendaId]');
  console.error('Ejemplo: node src/scripts/test-dropdowns-hora.js rec0hQqSaGCveK9a0 4 2025 recPV8S2FVS1IH09Y');
  process.exit(1);
}

// Formatear el mes con ceros iniciales si es necesario
const mesFormateado = mes.padStart(2, '0');
// Construir el patrón para el mes y año (YYYY-MM)
const patronFecha = `${year}-${mesFormateado}`;

console.log(`Analizando dropdowns de hora para empleado: ${empleadoId}, mes: ${patronFecha}`);

// Patrón para detectar campos que podrían ser horas
const PATRON_HORA = /^(\d{1,2}):(\d{2})$/;
const INCREMENTOS_HORA = ["00", "15", "30", "45"];

// Verificar si un string parece una hora en formato HH:MM
function esFormatoHora(campo) {
  return PATRON_HORA.test(campo);
}

// Función principal para analizar dropdowns por hora
async function analizarDropdownsHora() {
  try {
    console.log('\n=== Verificando el país de la tienda ===');
    let esFrancia = false;

    if (tiendaId) {
      try {
        const tiendaRecord = await airtable(tiendasTableId).find(tiendaId);
        const paisTienda = tiendaRecord.fields['Pais'] || tiendaRecord.fields['País'] || '';
        
        esFrancia = paisTienda.toLowerCase().includes('francia') || 
                    paisTienda.toLowerCase().includes('france');
        
        console.log(`Tienda encontrada: ${tiendaRecord.fields['Nombre'] || 'Sin nombre'}`);
        console.log(`País: ${paisTienda}`);
        console.log(`Es Francia: ${esFrancia ? 'Sí' : 'No'}`);
        console.log(`Incremento en dropdowns: ${esFrancia ? '15 minutos' : '30 minutos'}`);
      } catch (error) {
        console.error('Error al obtener información de la tienda:', error.message);
      }
    }

    // Buscar todas las actividades del mes para este empleado
    console.log('\n=== Buscando actividades del mes ===');
    
    const formula = `REGEX_MATCH({Fecha Format}, "^${patronFecha}")`;
    console.log('Fórmula:', formula);
    
    const allRecords = await airtable(actividadDiariaTableId)
      .select({
        filterByFormula: formula
      })
      .all();
    
    console.log(`Total registros para ${patronFecha}: ${allRecords.length}`);
    
    // Filtrar por empleado
    const actividades = allRecords.filter(record => {
      const empleados = record.fields['Empleados'] || [];
      return Array.isArray(empleados) && empleados.includes(empleadoId);
    });
    
    console.log(`Actividades encontradas para empleado ${empleadoId}: ${actividades.length}`);
    
    if (actividades.length === 0) {
      console.log('No se encontraron actividades para este empleado en el mes especificado.');
      return { error: 'No se encontraron actividades' };
    }

    // Analizar todas las actividades y recopilar campos de hora
    const todosCamposHora = new Set();
    const camposConValoresConTrabajo = new Map();
    
    // Primera pasada: encontrar todos los campos con formato de hora
    actividades.forEach(actividad => {
      Object.keys(actividad.fields).forEach(campo => {
        if (esFormatoHora(campo)) {
          todosCamposHora.add(campo);
          
          const valor = actividad.fields[campo];
          if (typeof valor === 'string' && valor.toUpperCase().includes('TRABAJO')) {
            if (!camposConValoresConTrabajo.has(campo)) {
              camposConValoresConTrabajo.set(campo, []);
            }
            camposConValoresConTrabajo.get(campo).push({
              id: actividad.id,
              fecha: actividad.fields['Fecha Format'],
              valor
            });
          }
        }
      });
    });
    
    // Generar horas para verificar si existen como campos
    const horasPosibles = [];
    for (let hora = 0; hora < 24; hora++) {
      const h = hora.toString().padStart(2, '0');
      if (esFrancia) {
        // Si es Francia, incrementos de 15min (00, 15, 30, 45)
        INCREMENTOS_HORA.forEach(inc => {
          horasPosibles.push(`${h}:${inc}`);
        });
      } else {
        // Por defecto, incrementos de 30min (00, 30)
        horasPosibles.push(`${h}:00`, `${h}:30`);
      }
    }
    
    // Verificar todas las horas posibles
    console.log('\n=== Verificación de campos de hora en el primer registro ===');
    const primerActividad = actividades[0];
    console.log(`ID registro: ${primerActividad.id}`);
    console.log(`Fecha: ${primerActividad.fields['Fecha Format']}`);
    
    const camposHoraPrimerRegistro = [];
    
    horasPosibles.forEach(hora => {
      if (hora in primerActividad.fields) {
        const valor = primerActividad.fields[hora];
        camposHoraPrimerRegistro.push({
          campo: hora,
          valor,
          esTrabajo: typeof valor === 'string' && valor.toUpperCase().includes('TRABAJO')
        });
      }
    });
    
    // Ordenar los campos de hora
    camposHoraPrimerRegistro.sort((a, b) => a.campo.localeCompare(b.campo));
    
    console.log('Campos de hora encontrados en el primer registro:');
    if (camposHoraPrimerRegistro.length > 0) {
      camposHoraPrimerRegistro.forEach(({campo, valor, esTrabajo}) => {
        console.log(`- ${campo}: ${valor}${esTrabajo ? ' (ES TRABAJO)' : ''}`);
      });
    } else {
      console.log('No se encontraron campos de hora en el primer registro.');
    }
    
    // Revisar todos los registros
    console.log('\n=== Campos con valores TRABAJO ===');
    if (camposConValoresConTrabajo.size > 0) {
      for (const [campo, registros] of camposConValoresConTrabajo.entries()) {
        console.log(`Campo ${campo}: ${registros.length} registros con valor "TRABAJO"`);
        // Mostrar los primeros 3 registros como ejemplo
        registros.slice(0, 3).forEach(reg => {
          console.log(`  - ID: ${reg.id}, Fecha: ${reg.fecha}, Valor: ${reg.valor}`);
        });
      }
    } else {
      console.log('No se encontraron campos de hora con valor "TRABAJO".');
    }
    
    // Encontrar todos los valores posibles en los dropdowns
    const valoresDropdown = new Set();
    
    actividades.forEach(actividad => {
      Object.entries(actividad.fields).forEach(([campo, valor]) => {
        if (esFormatoHora(campo) && typeof valor === 'string') {
          valoresDropdown.add(valor);
        }
      });
    });
    
    console.log('\n=== Valores posibles en los dropdowns ===');
    if (valoresDropdown.size > 0) {
      console.log(`Se encontraron ${valoresDropdown.size} valores distintos:`);
      Array.from(valoresDropdown).sort().forEach(valor => {
        console.log(`- "${valor}"`);
      });
    } else {
      console.log('No se encontraron valores en los dropdowns de hora.');
    }
    
    // Calcular horas para un registro específico
    const registroParaCalcular = actividades[0];
    console.log('\n=== Cálculo de horas para el primer registro ===');
    console.log(`ID: ${registroParaCalcular.id}`);
    console.log(`Fecha: ${registroParaCalcular.fields['Fecha Format']}`);
    
    let horasTrabajadas = 0;
    let camposTrabajo = [];
    
    Object.entries(registroParaCalcular.fields).forEach(([campo, valor]) => {
      if (esFormatoHora(campo) && typeof valor === 'string' && valor.toUpperCase().includes('TRABAJO')) {
        camposTrabajo.push(campo);
        horasTrabajadas += esFrancia ? 0.25 : 0.5; // 15min o 30min según país
      }
    });
    
    console.log(`Campos con valor TRABAJO: ${camposTrabajo.length > 0 ? camposTrabajo.join(', ') : 'Ninguno'}`);
    console.log(`Horas trabajadas calculadas: ${horasTrabajadas} horas`);
    
    return {
      actividades,
      todosCamposHora: Array.from(todosCamposHora),
      camposConValoresConTrabajo: Object.fromEntries(camposConValoresConTrabajo),
      valoresDropdown: Array.from(valoresDropdown)
    };
  } catch (error) {
    console.error('Error general:', error);
    return { error: error.message };
  }
}

// Ejecutar el análisis
analizarDropdownsHora()
  .then(resultado => {
    if (resultado.error) {
      console.error('\nError en el análisis:', resultado.error);
    } else {
      console.log('\nAnálisis completado con éxito.');
      
      // Guardar estadísticas
      console.log('\n=== Resumen ===');
      console.log(`Total actividades analizadas: ${resultado.actividades.length}`);
      console.log(`Total campos de hora distintos: ${resultado.todosCamposHora.length}`);
      console.log(`Campos con valores "TRABAJO": ${Object.keys(resultado.camposConValoresConTrabajo).length}`);
      console.log(`Valores distintos en dropdowns: ${resultado.valoresDropdown.length}`);
    }
  })
  .catch(err => console.error('Error en la ejecución:', err)); 