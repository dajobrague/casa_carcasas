// Script para calcular las horas de trabajo basado en los campos de hora en actividades diarias
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
  console.error('Uso: node src/scripts/test-calculo-horas.js [empleadoId] [mes] [año] [tiendaId]');
  console.error('Ejemplo: node src/scripts/test-calculo-horas.js rec0hQqSaGCveK9a0 4 2025 recPV8S2FVS1IH09Y');
  process.exit(1);
}

// Formatear el mes con ceros iniciales si es necesario
const mesFormateado = mes.padStart(2, '0');
// Construir el patrón para el mes y año (YYYY-MM)
const patronFecha = `${year}-${mesFormateado}`;

console.log(`Calculando horas para empleado: ${empleadoId}, mes: ${patronFecha}, tienda: ${tiendaId || 'No especificada'}`);

// Función para calcular horas trabajadas en un día específico
async function calcularHorasTrabajadas(actividad, esFrancia) {
  const fields = actividad.fields;
  let horasTotales = 0;
  let slotsTrabajoEncontrados = 0;
  
  // Verificar todos los campos que podrían ser horas (formato HH:MM o HH:YY)
  for (const [campo, valor] of Object.entries(fields)) {
    // Verificar si el campo es una hora (patrón HH:MM o HH:YY)
    if (/^\d{1,2}:\d{2}$/.test(campo) && typeof valor === 'string') {
      if (valor.toUpperCase().includes('TRABAJO')) {
        slotsTrabajoEncontrados++;
        // Si es Francia, cada slot suma 15 minutos, de lo contrario suma 30 minutos
        horasTotales += esFrancia ? 0.25 : 0.5;
      }
    }
  }

  // Si tiene un campo Horas Actividad, usar ese valor directamente
  if (fields['Horas Actividad'] !== undefined && typeof fields['Horas Actividad'] === 'number') {
    console.log(`   - Usando campo 'Horas Actividad' directamente: ${fields['Horas Actividad']} horas`);
    return {
      horasTotales: fields['Horas Actividad'],
      slotsTrabajoEncontrados
    };
  }
  
  // Verificar un campo general de horas si está presente
  const horasCampo = fields['Horas'] || fields['Horas Trabajo'] || fields['Horas Trabajadas'];
  if (horasCampo !== undefined && (typeof horasCampo === 'number' || !isNaN(parseFloat(horasCampo)))) {
    console.log(`   - Usando campo general de horas: ${horasCampo} horas`);
    return {
      horasTotales: parseFloat(horasCampo),
      slotsTrabajoEncontrados
    };
  }

  return {
    horasTotales,
    slotsTrabajoEncontrados
  };
}

// Función principal que obtiene los datos y calcula las horas
async function calcularHorasDelMes() {
  try {
    console.log('\n=== Verificando el país de la tienda ===');
    let esFrancia = false;

    // Si se proporciona un ID de tienda, verificar el país
    if (tiendaId) {
      try {
        const tiendaRecord = await airtable(tiendasTableId).find(tiendaId);
        const paisTienda = tiendaRecord.fields['Pais'] || tiendaRecord.fields['País'] || '';
        
        esFrancia = paisTienda.toLowerCase().includes('francia') || 
                    paisTienda.toLowerCase().includes('france');
        
        console.log(`Tienda encontrada: ${tiendaRecord.fields['Nombre'] || 'Sin nombre'}`);
        console.log(`País: ${paisTienda}`);
        console.log(`Es Francia: ${esFrancia ? 'Sí' : 'No'}`);
        console.log(`Incremento por slot: ${esFrancia ? '15 minutos' : '30 minutos'}`);
      } catch (error) {
        console.error('Error al obtener información de la tienda:', error.message);
        console.log('Usando incremento predeterminado de 30 minutos por slot');
      }
    } else {
      console.log('No se proporcionó ID de tienda. Usando incremento predeterminado de 30 minutos por slot');
    }

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

    // Calcular horas para cada actividad
    console.log('\n=== Calculando horas trabajadas ===');
    const resultadosPorDia = [];
    let horasTotalesMes = 0;
    let diasConTrabajo = 0;

    for (const actividad of actividades) {
      const fecha = actividad.fields['Fecha Format'];
      console.log(`\nActividad del día ${fecha}:`);
      
      // Verificar tipo de actividad
      const tipoActividad = actividad.fields['Tipo Actividad'] || '';
      console.log(`Tipo de actividad: ${tipoActividad || 'No especificado'}`);
      
      // Calcular horas trabajadas para esta actividad
      const { horasTotales, slotsTrabajoEncontrados } = await calcularHorasTrabajadas(actividad, esFrancia);
      
      console.log(`Slots de trabajo encontrados: ${slotsTrabajoEncontrados}`);
      console.log(`Horas totales calculadas: ${horasTotales}`);
      
      // Determinar estado
      let estado = 'Libre';
      if (horasTotales > 0 || tipoActividad.includes('Trabajo')) {
        estado = `Trabajo (${horasTotales}h)`;
        diasConTrabajo++;
        horasTotalesMes += horasTotales;
      }
      
      resultadosPorDia.push({
        fecha,
        horasTotales,
        slotsTrabajoEncontrados,
        estado,
        tipoActividad
      });
    }

    console.log('\n=== Resumen del Mes ===');
    console.log(`Total días con actividades: ${actividades.length}`);
    console.log(`Días con trabajo: ${diasConTrabajo}`);
    console.log(`Horas totales trabajadas en el mes: ${horasTotalesMes}`);
    
    return {
      diasTotales: actividades.length,
      diasTrabajo: diasConTrabajo,
      horasTotalesMes,
      resultadosPorDia
    };
  } catch (error) {
    console.error('Error general:', error);
    return { error: error.message };
  }
}

// Ejecutar el cálculo
calcularHorasDelMes()
  .then(resultado => {
    if (resultado.error) {
      console.error('\nError en el cálculo:', resultado.error);
    } else {
      console.log('\n=== Detalle por día ===');
      resultado.resultadosPorDia.forEach((dia, index) => {
        console.log(`${index + 1}. ${dia.fecha}: ${dia.estado}`);
      });
    }
    console.log('\nProceso completado.');
  })
  .catch(err => console.error('Error en la ejecución:', err)); 