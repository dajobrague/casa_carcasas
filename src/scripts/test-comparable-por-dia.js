/**
 * Script de prueba para validar la funcionalidad "Comparable por Día"
 * Este script prueba las nuevas funciones implementadas
 */

const { obtenerDatosTraficoConLogicaHistorica } = require('../lib/api');
const { obtenerConfiguracionHistoricaPorSemana, obtenerFormatoSemana } = require('../lib/airtable');
const { obtenerTraficoPorDia } = require('../lib/historical-traffic');

// Configuración de prueba
const TIENDA_EJEMPLO = {
  recordId: 'recXXXX', // Reemplazar con un ID real de tienda
  name: 'Tienda de Prueba'
};

async function probarConfiguracionPorDia() {
  console.log('\n🎯 === PRUEBAS DE CONFIGURACIÓN COMPARABLE POR DÍA ===\n');
  
  try {
    // 1. Probar obtenerFormatoSemana
    console.log('📅 1. Probando obtenerFormatoSemana...');
    const fechaEjemplo = new Date('2025-06-23'); // Lunes
    const semanaFormato = obtenerFormatoSemana(fechaEjemplo);
    console.log(`   Fecha: ${fechaEjemplo.toISOString().split('T')[0]} → Semana: ${semanaFormato}`);
    
    // 2. Crear configuración de ejemplo por día
    console.log('\n🔧 2. Simulando configuración por día...');
    const configuracionEjemplo = {
      type: 'comparable_por_dia',
      mapping: {
        '2025-06-23': '2024-06-24', // Lunes 2025 → Lunes 2024
        '2025-06-24': '2024-06-25', // Martes 2025 → Martes 2024
        '2025-06-25': '2024-06-26', // Miércoles 2025 → Miércoles 2024
        '2025-06-26': '2024-06-27', // Jueves 2025 → Jueves 2024
        '2025-06-27': '2024-06-28', // Viernes 2025 → Viernes 2024
        '2025-06-28': '2024-06-29', // Sábado 2025 → Sábado 2024
        '2025-06-29': '2024-06-30'  // Domingo 2025 → Domingo 2024
      }
    };
    
    console.log('   Configuración creada:', JSON.stringify(configuracionEjemplo, null, 2));
    
    // 3. Probar función obtenerTraficoPorDia
    console.log('\n📊 3. Probando obtenerTraficoPorDia...');
    const fechaObjetivo = '2025-06-23';
    
    try {
      const resultado = await obtenerTraficoPorDia(
        configuracionEjemplo.mapping,
        TIENDA_EJEMPLO.recordId,
        fechaObjetivo
      );
      
      if (resultado && resultado.esDatoHistorico) {
        console.log('   ✅ obtenerTraficoPorDia exitoso:');
        console.log(`      📊 Horas: ${Object.keys(resultado.horas || {}).length}`);
        console.log(`      🌅 Mañana: ${resultado.totalMañana?.entradas || 0} entradas`);
        console.log(`      🌆 Tarde: ${resultado.totalTarde?.entradas || 0} entradas`);
        console.log(`      📅 Fecha inicio: ${resultado.fechaInicio}`);
        console.log(`      📅 Fecha fin: ${resultado.fechaFin}`);
        console.log(`      🏷️  Semanas referencia: ${resultado.semanasReferencia?.join(', ') || 'N/A'}`);
      } else {
        console.log('   ❌ obtenerTraficoPorDia no retornó datos históricos válidos');
      }
    } catch (error) {
      console.log(`   ⚠️ Error en obtenerTraficoPorDia: ${error.message}`);
      console.log('   ℹ️ Esto es esperado si no hay datos reales para las fechas de referencia');
    }
    
    // 4. Probar función principal con configuración por día
    console.log('\n🔄 4. Probando obtenerDatosTraficoConLogicaHistorica...');
    
    try {
      const resultado = await obtenerDatosTraficoConLogicaHistorica(
        `dia_${fechaObjetivo}`,
        TIENDA_EJEMPLO.recordId,
        true, // Es histórica
        fechaObjetivo,
        semanaFormato
      );
      
      if (resultado && 'esDatoHistorico' in resultado && resultado.esDatoHistorico) {
        console.log('   ✅ Función principal exitosa:');
        console.log(`      📊 Tipo de datos: ${resultado.esDatoHistorico ? 'Histórico' : 'Estándar'}`);
        console.log(`      📊 Horas: ${Object.keys(resultado.horas || {}).length}`);
        console.log(`      🎯 Semana objetivo: ${resultado.semanaObjetivo || 'No especificada'}`);
        console.log(`      📋 Semanas referencia: ${resultado.semanasReferencia?.join(', ') || 'No especificadas'}`);
      } else {
        console.log('   ℹ️ Función principal retornó datos estándar (esperado si no hay configuración)');
      }
    } catch (error) {
      console.log(`   ⚠️ Error en función principal: ${error.message}`);
    }
    
    // 5. Comparar con configuración por semanas
    console.log('\n📋 5. Comparando configuraciones por semana vs por día...');
    
    const configuracionPorSemanas = ['W26 2024', 'W25 2024'];
    console.log(`   Por semanas: ${configuracionPorSemanas.join(', ')}`);
    console.log(`   Por días: ${Object.keys(configuracionEjemplo.mapping).length} días mapeados`);
    console.log('   💡 Diferencia: Por semanas = promedio, Por días = fecha exacta');
    
    console.log('\n✅ === PRUEBAS COMPLETADAS ===');
    console.log('🔍 Para probar completamente, necesitas:');
    console.log('   1. Una tienda con configuración "Comparable por Día" en Airtable');
    console.log('   2. Datos de tráfico reales para las fechas de referencia');
    console.log('   3. Abrir un modal de día en el frontend y verificar los logs');
    
  } catch (error) {
    console.error('❌ Error general en las pruebas:', error);
  }
}

// Función para probar los type guards
function probarTypeGuards() {
  console.log('\n🔍 === PRUEBAS DE TYPE GUARDS ===\n');
  
  const { isConfiguracionPorDia, isConfiguracionPorSemanas } = require('../lib/airtable');
  
  // Configuración por semanas
  const configSemanas = ['W26 2024', 'W25 2024'];
  console.log('📋 Configuración por semanas:', configSemanas);
  console.log(`   isConfiguracionPorSemanas: ${isConfiguracionPorSemanas(configSemanas)}`);
  console.log(`   isConfiguracionPorDia: ${isConfiguracionPorDia(configSemanas)}`);
  
  // Configuración por día
  const configDia = {
    type: 'comparable_por_dia',
    mapping: {
      '2025-06-23': '2024-06-24'
    }
  };
  console.log('\n🎯 Configuración por día:', configDia);
  console.log(`   isConfiguracionPorSemanas: ${isConfiguracionPorSemanas(configDia)}`);
  console.log(`   isConfiguracionPorDia: ${isConfiguracionPorDia(configDia)}`);
  
  // Configuración inválida
  const configInvalida = { some: 'invalid config' };
  console.log('\n❌ Configuración inválida:', configInvalida);
  console.log(`   isConfiguracionPorSemanas: ${isConfiguracionPorSemanas(configInvalida)}`);
  console.log(`   isConfiguracionPorDia: ${isConfiguracionPorDia(configInvalida)}`);
}

// Ejecutar pruebas
async function ejecutarPruebas() {
  try {
    probarTypeGuards();
    await probarConfiguracionPorDia();
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  ejecutarPruebas();
}

module.exports = {
  probarConfiguracionPorDia,
  probarTypeGuards,
  ejecutarPruebas
}; 