/**
 * Script para probar el endpoint de recomendaciones
 * 
 * Para usar: node scripts/test-recomendaciones.js
 */

const fetch = require('node-fetch');

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

// Parámetros de prueba
const params = {
  storeCode: '42',
  startDate: '2024-03-18',
  endDate: '2024-03-24',
  atencionDeseada: '25',
  crecimiento: '0.15',
  horarioApertura: '10:00',
  horarioCierre: '21:00',
  redondear: 'false'
};

async function testRecomendaciones() {
  try {
    console.log(`${colors.bright}============================================================${colors.reset}`);
    console.log(`${colors.bright}       PRUEBA DE ENDPOINT DE RECOMENDACIONES DE TRÁFICO     ${colors.reset}`);
    console.log(`${colors.bright}============================================================${colors.reset}`);
    
    // Construir URL
    const url = new URL('http://localhost:3000/api/recomendaciones');
    
    // Agregar todos los parámetros a la URL
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
    
    console.log(`${colors.cyan}URL: ${url.toString()}${colors.reset}`);
    
    // Realizar la petición
    console.log(`${colors.blue}Realizando petición...${colors.reset}`);
    const response = await fetch(url.toString());
    
    // Manejar respuesta
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        console.error(`${colors.red}Error ${response.status}: ${errorData.error || response.statusText}${colors.reset}`);
      } else {
        const text = await response.text();
        console.error(`${colors.red}Error ${response.status}: ${response.statusText}${colors.reset}`);
        console.error(`${colors.dim}${text.substring(0, 500)}...${colors.reset}`);
      }
      process.exit(1);
    }
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`${colors.red}La respuesta no es JSON válido:${colors.reset}`);
      console.error(`${colors.dim}${text.substring(0, 500)}...${colors.reset}`);
      process.exit(1);
    }
    
    const data = await response.json();
    
    console.log(`${colors.green}✓ Respuesta recibida con éxito${colors.reset}`);
    console.log(`${colors.blue}Información general:${colors.reset}`);
    console.log(`  Tienda: ${data.storeCode}`);
    console.log(`  Rango de fechas: ${data.startDate} a ${data.endDate}`);
    
    // Mostrar parámetros
    console.log(`${colors.blue}Parámetros utilizados:${colors.reset}`);
    console.log(`  Atención Deseada: ${data.resultados.parametros.atencionDeseada}`);
    console.log(`  Crecimiento: ${(data.resultados.parametros.crecimiento * 100).toFixed(2)}%`);
    
    if (data.resultados.parametros.horaApertura) {
      console.log(`  Horario: ${data.resultados.parametros.horaApertura} - ${data.resultados.parametros.horaCierre}`);
    }
    
    // Mostrar resultados
    const recomendaciones = data.resultados.recomendaciones;
    const horasOrdenadas = Object.keys(recomendaciones).sort();
    
    console.log(`${colors.blue}Resultados:${colors.reset}`);
    console.log('┌────────┬─────────────┬─────────────────┬───────────────────────────────┐');
    console.log('│  Hora  │   Entradas  │  Recomendación  │           Fórmula             │');
    console.log('├────────┼─────────────┼─────────────────┼───────────────────────────────┤');
    
    for (const hora of horasOrdenadas) {
      const { entradas, recomendacion, detalles } = recomendaciones[hora];
      console.log(`│ ${hora} │ ${entradas.toString().padStart(11)} │ ${recomendacion.toFixed(2).padStart(15)} │ ${detalles.calculoCompleto.padEnd(31)} │`);
    }
    
    console.log('└────────┴─────────────┴─────────────────┴───────────────────────────────┘');
    
    console.log(`${colors.bright}============================================================${colors.reset}`);
    console.log(`${colors.green}Prueba completada con éxito${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error inesperado: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
testRecomendaciones(); 