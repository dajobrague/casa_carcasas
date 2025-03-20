require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Configuración
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_BASE_URL = 'https://api.airtable.com/v0';

const WEEK_ID = process.argv[2] || 'recP2CKu5FeS3SV8m'; // ID de semana por defecto
const STORE_ID = process.argv[3] || 'recStNjMwX64kTFsA'; // ID de tienda por defecto

// Rutas de API
const airtableApiUrl = `${AIRTABLE_BASE_URL}/${AIRTABLE_BASE_ID}`;
const localApiUrl = 'http://localhost:3000/api';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Verificar configuración
async function verificarConfiguracion() {
  console.log(`${colors.blue}${colors.bright}=== VERIFICANDO CONFIGURACIÓN ===${colors.reset}`);
  
  // Verificar variables de entorno
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error(`${colors.red}Error: Faltan variables de entorno AIRTABLE_API_KEY o AIRTABLE_BASE_ID${colors.reset}`);
    process.exit(1);
  }
  
  // Verificar conexión a Airtable
  try {
    const response = await fetch(`${airtableApiUrl}/Tiendas?maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error de conexión a Airtable: ${response.status} ${response.statusText}`);
    }
    
    console.log(`${colors.green}✓ Conexión a Airtable verificada${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error al conectar con Airtable: ${error.message}${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✓ Configuración correcta${colors.reset}`);
}

// Obtener datos de la tienda
async function obtenerTienda(tiendaId) {
  console.log(`${colors.blue}${colors.bright}=== OBTENIENDO DATOS DE TIENDA ===${colors.reset}`);
  console.log(`ID de tienda: ${tiendaId}`);
  
  try {
    const response = await fetch(`${airtableApiUrl}/Tiendas/${tiendaId}`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener tienda: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`${colors.green}✓ Tienda encontrada: ${data.fields.Name}${colors.reset}`);
    
    // Extraer datos relevantes
    const tienda = {
      id: data.id,
      nombre: data.fields.Name,
      idExterno: data.fields.Id || null,
      crecimiento: data.fields.Crecimiento ? parseFloat(data.fields.Crecimiento) / 100 : 0,
      atencionDeseada: data.fields['Atención Deseada'] || null,
      pais: data.fields.País || 'España',
      horario: data.fields.Horario || '10:00-21:00'
    };
    
    console.log(`${colors.cyan}Detalles de la tienda:${colors.reset}`);
    console.log(`  Nombre: ${tienda.nombre}`);
    console.log(`  ID Externo: ${tienda.idExterno}`);
    console.log(`  Crecimiento: ${(tienda.crecimiento * 100).toFixed(2)}%`);
    console.log(`  Atención Deseada: ${tienda.atencionDeseada}`);
    console.log(`  País: ${tienda.pais}`);
    console.log(`  Horario: ${tienda.horario}`);
    
    return tienda;
  } catch (error) {
    console.error(`${colors.red}Error al obtener datos de tienda: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Obtener datos de la semana
async function obtenerSemana(semanaId) {
  console.log(`${colors.blue}${colors.bright}=== OBTENIENDO DATOS DE SEMANA ===${colors.reset}`);
  console.log(`ID de semana: ${semanaId}`);
  
  try {
    const response = await fetch(`${airtableApiUrl}/Semanas/${semanaId}`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener semana: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`${colors.green}✓ Semana encontrada: ${data.fields.Name}${colors.reset}`);
    
    // Extraer datos relevantes
    const semana = {
      id: data.id,
      nombre: data.fields.Name,
      fechaInicio: data.fields['Fecha Inicio'],
      fechaFin: data.fields['Fecha Fin']
    };
    
    console.log(`${colors.cyan}Detalles de la semana:${colors.reset}`);
    console.log(`  Nombre: ${semana.nombre}`);
    console.log(`  Fecha Inicio: ${semana.fechaInicio}`);
    console.log(`  Fecha Fin: ${semana.fechaFin}`);
    
    return semana;
  } catch (error) {
    console.error(`${colors.red}Error al obtener datos de semana: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Obtener datos de tráfico
async function obtenerTrafico(tiendaId, fechaInicio, fechaFin) {
  console.log(`${colors.blue}${colors.bright}=== OBTENIENDO DATOS DE TRÁFICO ===${colors.reset}`);
  console.log(`Tienda: ${tiendaId}`);
  console.log(`Rango de fechas: ${fechaInicio} a ${fechaFin}`);
  
  try {
    // Construir URL para el endpoint local
    const url = new URL(`${localApiUrl}/trafico`);
    url.searchParams.append('tiendaId', tiendaId);
    url.searchParams.append('fechaInicio', fechaInicio);
    url.searchParams.append('fechaFin', fechaFin);
    
    console.log(`URL: ${url.toString()}`);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al obtener tráfico: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const data = await response.json();
    
    // Verificar si tenemos datos
    if (!data.entradasPorHora || Object.keys(data.entradasPorHora).length === 0) {
      console.warn(`${colors.yellow}⚠ No se encontraron datos de tráfico para el período seleccionado${colors.reset}`);
      return {};
    }
    
    console.log(`${colors.green}✓ Datos de tráfico obtenidos: ${Object.keys(data.entradasPorHora).length} horas${colors.reset}`);
    
    return data.entradasPorHora;
  } catch (error) {
    console.error(`${colors.red}Error al obtener datos de tráfico: ${error.message}${colors.reset}`);
    return {};
  }
}

// Calcular recomendaciones basadas en tráfico y fórmula
function calcularRecomendaciones(entradasPorHora, atencionDeseada, crecimiento) {
  console.log(`${colors.blue}${colors.bright}=== CALCULANDO RECOMENDACIONES ===${colors.reset}`);
  
  // Validar parámetros
  if (!entradasPorHora || Object.keys(entradasPorHora).length === 0) {
    console.error(`${colors.red}Error: No hay datos de tráfico${colors.reset}`);
    return {};
  }
  
  if (!atencionDeseada || atencionDeseada <= 0) {
    console.error(`${colors.red}Error: Atención Deseada inválida (${atencionDeseada})${colors.reset}`);
    return {};
  }
  
  // Inicializar resultados
  const recomendaciones = {};
  
  console.log(`${colors.cyan}Aplicando fórmula: (Entradas * (1 + Crecimiento)) / (Atención Deseada / 2)${colors.reset}`);
  console.log(`  Crecimiento: ${(crecimiento * 100).toFixed(2)}%`);
  console.log(`  Atención Deseada: ${atencionDeseada}`);
  
  // Calcular para cada hora
  for (const [hora, entradas] of Object.entries(entradasPorHora)) {
    // Aplicar fórmula: (Entradas * (1 + Crecimiento)) / (Atención Deseada / 2)
    // Esto calculará cuántos empleados se necesitan por hora
    
    const factor = (1 + crecimiento);
    const divisor = (atencionDeseada / 2);
    const recomendacion = Math.round((entradas * factor) / divisor * 100) / 100;
    
    recomendaciones[hora] = {
      entradas,
      recomendacion,
      // Detalles del cálculo para depuración
      detalles: {
        formula: `(${entradas} * (1 + ${(crecimiento * 100).toFixed(2)}%)) / (${atencionDeseada} / 2)`,
        factor: factor.toFixed(2),
        divisor: divisor.toFixed(2),
        calculoCompleto: `(${entradas} * ${factor.toFixed(2)}) / ${divisor.toFixed(2)} = ${recomendacion}`
      }
    };
  }
  
  return recomendaciones;
}

// Formatear los datos para visualización en consola
function mostrarResultados(recomendaciones, horarioTienda) {
  console.log(`${colors.blue}${colors.bright}=== RESULTADOS ===${colors.reset}`);
  
  if (Object.keys(recomendaciones).length === 0) {
    console.log(`${colors.yellow}No hay resultados para mostrar${colors.reset}`);
    return;
  }
  
  // Extraer horario de la tienda
  let horaApertura = 10;
  let horaCierre = 22;
  
  if (horarioTienda) {
    const partes = horarioTienda.split('-');
    if (partes.length === 2) {
      horaApertura = parseInt(partes[0].split(':')[0]);
      horaCierre = parseInt(partes[1].split(':')[0]);
    }
  }
  
  console.log(`${colors.cyan}Horario de la tienda: ${horaApertura}:00 - ${horaCierre}:00${colors.reset}`);
  
  // Ordenar horas
  const horasOrdenadas = Object.keys(recomendaciones).sort();
  
  // Crear tabla para la consola
  console.log('┌────────┬─────────────┬─────────────────┬───────────────────────────────┐');
  console.log('│  Hora  │   Entradas  │  Recomendación  │           Fórmula             │');
  console.log('├────────┼─────────────┼─────────────────┼───────────────────────────────┤');
  
  for (const hora of horasOrdenadas) {
    const horaNum = parseInt(hora.split(':')[0]);
    
    // Solo mostrar horas dentro del horario de la tienda
    if (horaNum >= horaApertura && horaNum < horaCierre) {
      const { entradas, recomendacion, detalles } = recomendaciones[hora];
      
      console.log(`│ ${hora} │ ${entradas.toString().padStart(11)} │ ${recomendacion.toFixed(2).padStart(15)} │ ${detalles.calculoCompleto.padEnd(31)} │`);
    }
  }
  
  console.log('└────────┴─────────────┴─────────────────┴───────────────────────────────┘');
  
  // Guardar resultados en un archivo para referencia
  const resultados = {
    timestamp: new Date().toISOString(),
    parametros: {
      horaApertura,
      horaCierre
    },
    recomendaciones
  };
  
  const rutaArchivo = path.join(__dirname, 'resultados-trafico.json');
  fs.writeFileSync(rutaArchivo, JSON.stringify(resultados, null, 2));
  
  console.log(`${colors.green}✓ Resultados guardados en ${rutaArchivo}${colors.reset}`);
}

// Función principal
async function main() {
  console.log(`${colors.bright}============================================================${colors.reset}`);
  console.log(`${colors.bright}      CÁLCULO DE RECOMENDACIONES BASADAS EN TRÁFICO        ${colors.reset}`);
  console.log(`${colors.bright}============================================================${colors.reset}`);
  
  // Verificar que el servidor local esté corriendo
  try {
    const response = await fetch(`${localApiUrl}/health`);
    if (!response.ok) {
      console.error(`${colors.red}Error: El servidor local no está disponible${colors.reset}`);
      console.error(`${colors.yellow}Asegúrate de que el servidor esté corriendo con 'npm run dev'${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Error: No se puede conectar con el servidor local (${localApiUrl})${colors.reset}`);
    console.error(`${colors.yellow}Asegúrate de que el servidor esté corriendo con 'npm run dev'${colors.reset}`);
    process.exit(1);
  }
  
  // Verificar configuración
  await verificarConfiguracion();
  
  // Obtener datos de la tienda y semana
  const tienda = await obtenerTienda(STORE_ID);
  const semana = await obtenerSemana(WEEK_ID);
  
  // Obtener datos de tráfico
  const trafico = await obtenerTrafico(
    tienda.idExterno || tienda.id,
    semana.fechaInicio,
    semana.fechaFin
  );
  
  // Calcular recomendaciones
  const recomendaciones = calcularRecomendaciones(
    trafico,
    tienda.atencionDeseada,
    tienda.crecimiento
  );
  
  // Mostrar resultados
  mostrarResultados(recomendaciones, tienda.horario);
  
  console.log(`${colors.bright}============================================================${colors.reset}`);
  console.log(`${colors.green}Proceso completado con éxito${colors.reset}`);
}

// Ejecutar programa principal
main().catch(error => {
  console.error(`${colors.red}Error inesperado: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1); 