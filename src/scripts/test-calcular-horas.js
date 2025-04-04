// Script para probar la utilidad calcularHoras con datos reales
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
const tiendasTableId = 'tblPbxJkAqBQ1Qzcy';

console.log('API Key:', apiKey ? 'Configurada correctamente' : 'No encontrada');
console.log('Base ID:', baseId ? 'Configurado correctamente' : 'No encontrado');

// Inicializar Airtable
const airtable = new Airtable({ apiKey }).base(baseId);

// Implementación manual de la función calcularHorasTrabajadas para pruebas
// (Es una versión JavaScript de la función TypeScript en calcularHoras.ts)
function calcularHorasTrabajadas(actividad, opciones = {}) {
  const { esFrancia = false } = opciones;
  const fields = actividad.fields;
  
  // Valor por defecto si no hay actividad de trabajo
  let resultado = {
    horasTotales: 0,
    tipoActividad: '',
    estado: 'Libre',
    esTrabajo: false
  };
  
  // 1. Comprobación del campo Horas Trabajadas
  if (typeof fields['Horas Trabajadas'] === 'number' && fields['Horas Trabajadas'] > 0) {
    resultado.horasTotales = fields['Horas Trabajadas'];
    resultado.esTrabajo = true;
  }
  
  // 2. Comprobar campos Horas + y Horas -
  const horasPlus = parseFloat(String(fields['Horas +'] || 0));
  const horasMinus = parseFloat(String(fields['Horas -'] || 0));
  
  if (horasPlus > 0 || horasMinus > 0) {
    resultado.horasTotales = horasPlus - horasMinus;
    resultado.esTrabajo = resultado.horasTotales > 0;
  }
  
  // 3. Buscar campo de tipo de actividad
  if (fields['Tipo Actividad']) {
    resultado.tipoActividad = String(fields['Tipo Actividad']);
    
    // Si el tipo incluye "Trabajo", es trabajo incluso si las horas son 0
    if (resultado.tipoActividad.toLowerCase().includes('trabajo')) {
      resultado.esTrabajo = true;
    }
  } else if (fields['Actividad Semanal']) {
    resultado.tipoActividad = 'Actividad Semanal';
  }
  
  // 4. Buscar campos con formato de hora (HH:MM) que podrían tener valor "TRABAJO"
  const camposHora = Object.keys(fields).filter(campo => {
    return /^\d{1,2}:\d{2}$/.test(campo);
  });
  
  if (camposHora.length > 0) {
    let slots = 0;
    
    camposHora.forEach(campo => {
      const valor = fields[campo];
      if (typeof valor === 'string' && valor.toUpperCase().includes('TRABAJO')) {
        slots++;
      }
    });
    
    // Calcular horas según el país (15min o 30min por slot)
    if (slots > 0) {
      const horasPorSlot = esFrancia ? 0.25 : 0.5;
      resultado.horasTotales = slots * horasPorSlot;
      resultado.esTrabajo = true;
    }
  }
  
  // Determinar el estado final
  if (resultado.esTrabajo) {
    resultado.estado = `Trabajo (${resultado.horasTotales}h)`;
  }
  
  return resultado;
}

// Buscar una tienda para obtener su país (para pruebas)
async function obtenerPaisTienda(tiendaId) {
  try {
    if (!tiendaId) return { esFrancia: false };
    
    const tienda = await airtable(tiendasTableId).find(tiendaId);
    const pais = tienda.fields['Pais'] || tienda.fields['País'] || '';
    const esFrancia = pais.toLowerCase().includes('francia') || pais.toLowerCase().includes('france');
    
    return { tienda, esFrancia, pais };
  } catch (error) {
    console.error('Error al obtener tienda:', error.message);
    return { esFrancia: false, error: error.message };
  }
}

// Agregar campo de hora con valor TRABAJO para pruebas
function agregarCampoHoraPrueba(actividad, horaInicio, minutosInicio, incremento = 30, cantidadSlots = 1) {
  const actividadModificada = JSON.parse(JSON.stringify(actividad));
  
  for (let i = 0; i < cantidadSlots; i++) {
    // Calcular la hora del slot
    let hora = horaInicio;
    let minutos = minutosInicio + (i * incremento);
    
    // Ajustar si los minutos pasan de 60
    if (minutos >= 60) {
      hora += Math.floor(minutos / 60);
      minutos = minutos % 60;
    }
    
    // Formatear hora y minutos
    const horaStr = hora.toString().padStart(2, '0');
    const minutosStr = minutos.toString().padStart(2, '0');
    const campoHora = `${horaStr}:${minutosStr}`;
    
    // Agregar el campo con valor TRABAJO
    actividadModificada.fields[campoHora] = 'TRABAJO';
  }
  
  return actividadModificada;
}

// Probar la función con registros reales
async function probarCalculoHoras() {
  try {
    console.log('\n=== Obteniendo registros de prueba ===');
    // Obtener 3 registros para pruebas
    const registros = await airtable(actividadDiariaTableId)
      .select({
        maxRecords: 3
      })
      .firstPage();
    
    if (registros.length === 0) {
      throw new Error('No se encontraron registros para pruebas');
    }
    
    console.log(`Obtenidos ${registros.length} registros para pruebas`);
    
    // Obtener una tienda si hay alguna en los registros
    let tiendaId = null;
    let tiendaInfo = { esFrancia: false };
    
    for (const registro of registros) {
      if (registro.fields['Tienda y Supervisor'] && registro.fields['Tienda y Supervisor'].length > 0) {
        tiendaId = registro.fields['Tienda y Supervisor'][0];
        break;
      }
    }
    
    if (tiendaId) {
      console.log(`Utilizando tienda ID: ${tiendaId}`);
      tiendaInfo = await obtenerPaisTienda(tiendaId);
      console.log(`Tienda en Francia: ${tiendaInfo.esFrancia ? 'Sí' : 'No'}`);
    }
    
    console.log('\n=== CASO 1: Registro original sin modificaciones ===');
    
    const registro1 = registros[0];
    console.log('ID del registro:', registro1.id);
    
    // Analizar el registro original
    const resultado1 = calcularHorasTrabajadas(registro1, { esFrancia: tiendaInfo.esFrancia });
    
    console.log('Resultado del cálculo:');
    console.log('- Horas totales:', resultado1.horasTotales);
    console.log('- Tipo actividad:', resultado1.tipoActividad);
    console.log('- Estado:', resultado1.estado);
    console.log('- Es trabajo:', resultado1.esTrabajo ? 'Sí' : 'No');
    
    console.log('\n=== CASO 2: Registro con campos Horas+ y Horas- modificados ===');
    
    const registro2 = JSON.parse(JSON.stringify(registros[1] || registros[0]));
    registro2.fields['Horas +'] = 4;
    registro2.fields['Horas -'] = 1;
    
    console.log('ID del registro:', registro2.id);
    console.log('Horas + modificado a:', registro2.fields['Horas +']);
    console.log('Horas - modificado a:', registro2.fields['Horas -']);
    
    // Analizar el registro con horas modificadas
    const resultado2 = calcularHorasTrabajadas(registro2, { esFrancia: tiendaInfo.esFrancia });
    
    console.log('Resultado del cálculo:');
    console.log('- Horas totales:', resultado2.horasTotales);
    console.log('- Tipo actividad:', resultado2.tipoActividad);
    console.log('- Estado:', resultado2.estado);
    console.log('- Es trabajo:', resultado2.esTrabajo ? 'Sí' : 'No');
    
    console.log('\n=== CASO 3: Registro con campos de hora (HH:MM) ===');
    
    // Crear un registro con campos de hora
    const registro3 = agregarCampoHoraPrueba(
      registros[2] || registros[0],
      9, // Hora inicio
      0,  // Minutos inicio
      tiendaInfo.esFrancia ? 15 : 30, // Incremento según país
      4   // Cantidad de slots (4 slots = 2h si incremento=30, 1h si incremento=15)
    );
    
    console.log('ID del registro:', registro3.id);
    console.log('Campos de hora agregados:');
    
    // Mostrar los campos de hora agregados
    Object.keys(registro3.fields).filter(campo => /^\d{1,2}:\d{2}$/.test(campo)).forEach(campo => {
      console.log(`- ${campo}: ${registro3.fields[campo]}`);
    });
    
    // Analizar el registro con campos de hora
    const resultado3 = calcularHorasTrabajadas(registro3, { esFrancia: tiendaInfo.esFrancia });
    
    console.log('Resultado del cálculo:');
    console.log('- Horas totales:', resultado3.horasTotales);
    console.log('- Tipo actividad:', resultado3.tipoActividad);
    console.log('- Estado:', resultado3.estado);
    console.log('- Es trabajo:', resultado3.esTrabajo ? 'Sí' : 'No');
    console.log(`- Horas esperadas: ${tiendaInfo.esFrancia ? 1 : 2} (${4} slots de ${tiendaInfo.esFrancia ? '15min' : '30min'})`);
    
    return {
      caso1: resultado1,
      caso2: resultado2,
      caso3: resultado3,
      tiendaInfo
    };
    
  } catch (error) {
    console.error('Error en las pruebas:', error);
    return { error: error.message };
  }
}

// Ejecutar las pruebas
probarCalculoHoras()
  .then(resultados => {
    console.log('\n=== Resumen de pruebas ===');
    
    if (resultados.error) {
      console.error('Error general:', resultados.error);
    } else {
      console.log('Caso 1 (Original):', resultados.caso1.estado);
      console.log('Caso 2 (Horas +/-):', resultados.caso2.estado);
      console.log('Caso 3 (Campos hora):', resultados.caso3.estado);
      
      console.log('\nTodos los casos completados con éxito.');
    }
  })
  .catch(err => console.error('Error en la ejecución:', err)); 