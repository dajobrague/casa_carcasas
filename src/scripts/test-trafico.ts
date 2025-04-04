/**
 * Script de prueba para verificar la API de tráfico
 * 
 * Este script realiza una serie de llamadas a la API de tráfico
 * y verifica que los parámetros y respuestas sean correctos.
 * 
 * Uso:
 * 1. Ejecuta este script con ts-node: npx ts-node src/scripts/test-trafico.ts
 * 2. O compila y ejecuta: npx tsc src/scripts/test-trafico.ts && node src/scripts/test-trafico.js
 */

// Importar dependencias con sintaxis CommonJS
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// URL base para las pruebas (por defecto localhost, pero puede cambiarse con variables de entorno)
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

// Credenciales y datos para las pruebas
const TIENDA_ID = process.env.TEST_STORE_ID || '1'; // Código de tienda para pruebas
const FECHA_INICIO = process.env.TEST_START_DATE || '2024-04-01'; // Fecha de inicio para pruebas
const FECHA_FIN = process.env.TEST_END_DATE || '2024-04-07'; // Fecha de fin para pruebas

// Interfaces para tipar respuestas y errores
interface APIResponse {
  tiendaId: string;
  fechaInicio: string;
  fechaFin: string;
  entradasPorHora: Record<string, number>;
  simulado: boolean;
  timestamp: string;
  diasConsultados?: number;
}

/**
 * Función principal de prueba
 */
async function main() {
  console.log('=== Iniciando pruebas de API de tráfico ===');
  console.log(`URL base: ${BASE_URL}`);
  console.log(`Tienda ID: ${TIENDA_ID}`);
  console.log(`Rango de fechas: ${FECHA_INICIO} a ${FECHA_FIN}`);
  console.log('============================================');
  
  try {
    // 1. Prueba simple con todos los parámetros
    console.log('\n1. Prueba básica con todos los parámetros:');
    await probarAPI({
      tiendaId: TIENDA_ID,
      fechaInicio: FECHA_INICIO,
      fechaFin: FECHA_FIN
    });
    
    // 2. Prueba con una sola fecha (inicio = fin)
    console.log('\n2. Prueba con una sola fecha:');
    await probarAPI({
      tiendaId: TIENDA_ID,
      fechaInicio: FECHA_INICIO,
      fechaFin: FECHA_INICIO
    });
    
    // 3. Prueba con parámetros incorrectos
    console.log('\n3. Prueba con parámetros faltantes (debe fallar con 400):');
    
    // 3.1 Sin tiendaId
    try {
      await probarAPI({
        fechaInicio: FECHA_INICIO,
        fechaFin: FECHA_FIN
      });
    } catch (error) {
      console.log('Fallo esperado:', (error as Error).message);
    }
    
    // 3.2 Sin fechas
    try {
      await probarAPI({
        tiendaId: TIENDA_ID
      });
    } catch (error) {
      console.log('Fallo esperado:', (error as Error).message);
    }
    
    // 4. Prueba para múltiples días y guardar resultados
    console.log('\n4. Prueba para múltiples días:');
    const fechasInicio = [];
    const fechaInicial = new Date(FECHA_INICIO);
    const fechaFinal = new Date(FECHA_FIN);
    
    // Generar fechas para todo el rango
    for (let d = new Date(fechaInicial); d <= fechaFinal; d.setDate(d.getDate() + 1)) {
      fechasInicio.push(d.toISOString().split('T')[0]);
    }
    
    // Obtener datos para cada fecha
    const resultadosPorFecha = [];
    for (const fecha of fechasInicio) {
      console.log(`  - Fecha: ${fecha}`);
      try {
        const resultado = await probarAPI({
          tiendaId: TIENDA_ID,
          fechaInicio: fecha,
          fechaFin: fecha
        }, false); // No mostrar detalles
        
        resultadosPorFecha.push({
          fecha,
          resultado
        });
        
        console.log(`    ✓ Éxito: ${Object.keys(resultado.entradasPorHora || {}).length} horas obtenidas.`);
      } catch (error) {
        console.log(`    ✗ Error: ${(error as Error).message}`);
      }
    }
    
    // Guardar resultados en un archivo
    const resultadosPath = path.join(process.cwd(), 'resultados-trafico.json');
    fs.writeFileSync(resultadosPath, JSON.stringify(resultadosPorFecha, null, 2));
    console.log(`\nResultados guardados en: ${resultadosPath}`);
    
    console.log('\n=== Pruebas completadas ===');
  } catch (error) {
    console.error('Error durante las pruebas:', error);
    process.exit(1);
  }
}

/**
 * Función para probar la API con diferentes parámetros
 */
async function probarAPI(params: { 
  tiendaId?: string;
  fechaInicio?: string;
  fechaFin?: string;
}, mostrarDetalles = true): Promise<APIResponse> {
  // Construir la URL con los parámetros
  let url = `${BASE_URL}/api/trafico?`;
  
  if (params.tiendaId) url += `tiendaId=${params.tiendaId}&`;
  if (params.fechaInicio) url += `fechaInicio=${params.fechaInicio}&`;
  if (params.fechaFin) url += `fechaFin=${params.fechaFin}&`;
  
  // Eliminar el último & si existe
  url = url.endsWith('&') ? url.slice(0, -1) : url;
  
  console.log(`  URL: ${url}`);
  
  try {
    // Realizar la petición
    const response = await fetch(url);
    
    // Verificar si la petición fue exitosa
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }
    
    // Obtener y procesar la respuesta
    const data = await response.json() as APIResponse;
    
    // Mostrar información básica de la respuesta
    if (mostrarDetalles) {
      console.log('  Respuesta:');
      console.log(`    TiendaId: ${data.tiendaId}`);
      console.log(`    Fecha inicio: ${data.fechaInicio}`);
      console.log(`    Fecha fin: ${data.fechaFin}`);
      console.log(`    Datos simulados: ${data.simulado ? 'Sí' : 'No'}`);
      
      // Mostrar entradas por hora (resumidas)
      if (data.entradasPorHora) {
        console.log('    Entradas por hora:');
        Object.entries(data.entradasPorHora).slice(0, 3).forEach(([hora, entradas]) => {
          console.log(`      ${hora}: ${entradas}`);
        });
        
        if (Object.keys(data.entradasPorHora).length > 3) {
          console.log(`      ... y ${Object.keys(data.entradasPorHora).length - 3} más`);
        }
      }
    }
    
    return data;
  } catch (error) {
    console.error(`  ✗ Error: ${(error as Error).message}`);
    throw error;
  }
}

// Ejecutar la función principal
main().catch(console.error); 