/**
 * Archivo de ejemplo para probar la funcionalidad de tráfico histórico
 * Incluye pruebas para el nuevo formato JSON con semanas específicas
 */

import { 
  obtenerSemanasHistoricas,
  obtenerSemanasHistoricasPorSemana,
  obtenerFormatoSemana
} from '@/lib/airtable';
import { 
  obtenerDatosTraficoConLogicaHistorica
} from '@/lib/api';
import {
  obtenerTraficoHistorico,
  obtenerDiaSemana
} from '@/lib/historical-traffic';

// Configuración de prueba
const TIENDA_EJEMPLO = {
  recordId: 'recKr4mYwTRGbs29H', // Store #2 (ARENAL)
  nombre: 'ARENAL',
  numero: 2
};

/**
 * Función principal para probar el tráfico histórico con formato JSON
 */
export async function probarTraficoHistoricoJSON() {
  console.log('🧪 === INICIANDO PRUEBAS DE TRÁFICO HISTÓRICO JSON ===');
  console.log(`📍 Tienda de prueba: ${TIENDA_EJEMPLO.nombre} (ID: ${TIENDA_EJEMPLO.recordId})`);
  
  try {
    // 1. Verificar configuración JSON actual
    console.log('\n📋 1. Verificando configuración JSON actual...');
    const configuracionJSON = await obtenerSemanasHistoricas(TIENDA_EJEMPLO.recordId);
    
    if (configuracionJSON) {
      console.log('✅ Configuración JSON encontrada:', configuracionJSON);
      
      // Mostrar todas las configuraciones
      Object.entries(configuracionJSON).forEach(([semanaObj, semanasRef]) => {
        console.log(`   📅 ${semanaObj} → [${semanasRef.join(', ')}]`);
      });
    } else {
      console.log('❌ No se encontró configuración JSON válida');
      console.log('ℹ️  Para probar, configure manualmente un JSON como:');
      console.log('   {"W3 2025": ["W25 2024", "W26 2024", "W27 2024"]}');
      return;
    }

    // 2. Probar búsqueda de semanas específicas
    console.log('\n🔍 2. Probando búsqueda de semanas específicas...');
    
    const semanasParaProbar = Object.keys(configuracionJSON);
    
    for (const semanaObjetivo of semanasParaProbar.slice(0, 2)) { // Solo probar las primeras 2
      console.log(`\n   📌 Probando semana objetivo: ${semanaObjetivo}`);
      
      const semanasReferencia = await obtenerSemanasHistoricasPorSemana(
        TIENDA_EJEMPLO.recordId,
        semanaObjetivo
      );
      
      if (semanasReferencia) {
        console.log(`   ✅ Semanas de referencia: [${semanasReferencia.join(', ')}]`);
        
        // 3. Probar cálculo de tráfico histórico para esta configuración
        console.log(`   📈 Calculando tráfico histórico...`);
        
        const diasPrueba = ['lunes', 'martes', 'miércoles'];
        
        for (const diaPrueba of diasPrueba) {
          try {
            const traficoHistorico = await obtenerTraficoHistorico(
              semanasReferencia,
              TIENDA_EJEMPLO.recordId,
              diaPrueba
            );
            
            if (traficoHistorico) {
              console.log(`     📊 ${diaPrueba}: ${Object.keys(traficoHistorico.horas || {}).length} horas, Total: ${traficoHistorico.totalMañana + traficoHistorico.totalTarde}`);
            } else {
              console.log(`     ❌ ${diaPrueba}: No se obtuvieron datos`);
            }
          } catch (error) {
            console.log(`     ⚠️ ${diaPrueba}: Error - ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        }
      } else {
        console.log(`   ❌ No se encontraron semanas de referencia para ${semanaObjetivo}`);
      }
    }

    // 4. Probar función principal con semana específica
    console.log('\n🎯 3. Probando función principal con semana específica...');
    
    const primeraConfiguracion = Object.keys(configuracionJSON)[0];
    if (primeraConfiguracion) {
      // Simular fecha correspondiente a la semana objetivo
      const [weekPart, yearStr] = primeraConfiguracion.split(' ');
      const weekNumber = parseInt(weekPart.replace('W', ''));
      const year = parseInt(yearStr);
      
      // Calcular fecha aproximada (lunes de esa semana)
      const primerEnero = new Date(year, 0, 1);
      const diasHastaLunes = (weekNumber - 1) * 7;
      const fechaObjetivo = new Date(primerEnero.getTime() + diasHastaLunes * 24 * 60 * 60 * 1000);
      const fechaStr = fechaObjetivo.toISOString().split('T')[0];
      
      console.log(`   📅 Simulando fecha: ${fechaStr} para semana ${primeraConfiguracion}`);
      
      const resultado = await obtenerDatosTraficoConLogicaHistorica(
        `dia_${fechaStr}`,
        TIENDA_EJEMPLO.recordId,
        true, // Es histórica
        fechaStr,
        primeraConfiguracion // Semana objetivo específica
      );
      
      if (resultado && 'esDatoHistorico' in resultado && resultado.esDatoHistorico) {
        console.log('   ✅ Función principal exitosa:');
        console.log(`      📊 Horas: ${Object.keys(resultado.horas || {}).length}`);
        console.log(`      🌅 Mañana: ${resultado.totalMañana}`);
        console.log(`      🌆 Tarde: ${resultado.totalTarde}`);
        console.log(`      🎯 Semana objetivo: ${'semanaObjetivo' in resultado ? resultado.semanaObjetivo || 'No especificada' : 'No especificada'}`);
        console.log(`      📋 Semanas referencia: [${('semanasReferencia' in resultado && Array.isArray(resultado.semanasReferencia)) ? resultado.semanasReferencia.join(', ') : 'No especificadas'}]`);
      } else {
        console.log('   ❌ No se obtuvieron datos históricos de la función principal');
      }
    }

    // 5. Probar semana no configurada (debería usar lógica estándar)
    console.log('\n🚫 4. Probando semana no configurada...');
    
    const semanaNoConfigurada = obtenerFormatoSemana(new Date()); // Semana actual
    
    if (!configuracionJSON[semanaNoConfigurada]) {
      console.log(`   📅 Probando semana no configurada: ${semanaNoConfigurada}`);
      
      const resultado = await obtenerDatosTraficoConLogicaHistorica(
        `dia_${new Date().toISOString().split('T')[0]}`,
        TIENDA_EJEMPLO.recordId,
        true, // Es histórica
        new Date().toISOString().split('T')[0],
        semanaNoConfigurada
      );
      
      if (resultado && 'esDatoHistorico' in resultado) {
        console.log(`   📊 Resultado obtenido (histórico: ${resultado.esDatoHistorico})`);
        console.log(`      📊 Horas: ${Object.keys(resultado.horas || {}).length}`);
        console.log(`      📋 Tipo: ${resultado.esDatoHistorico ? 'Histórico' : 'Estándar'}`);
      } else {
        console.log('   ❌ No se obtuvo resultado');
      }
    } else {
      console.log(`   ℹ️  Semana actual (${semanaNoConfigurada}) está configurada, saltando prueba`);
    }

    console.log('\n✅ === PRUEBAS DE TRÁFICO HISTÓRICO JSON COMPLETADAS ===');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

/**
 * Función para probar casos específicos de formato JSON
 */
export async function probarFormatoJSON() {
  console.log('\n🧪 === PRUEBAS DE FORMATO JSON ===');
  
  try {
    // Simular diferentes formatos JSON
    const formatosTest = [
      '{"W3 2025": ["W25 2024", "W26 2024"], "W10 2025": ["W32 2024", "W33 2024"]}',
      '{}', // Vacío
      'formato_incorrecto', // No JSON
      '{"W3 2025": []}', // Array vacío
    ];
    
    console.log('📋 Probando parsing de diferentes formatos...');
    
    formatosTest.forEach((formato, index) => {
      console.log(`\n   Formato ${index + 1}: ${formato.substring(0, 50)}${formato.length > 50 ? '...' : ''}`);
      
      try {
        const parsed = JSON.parse(formato);
        const isValid = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
        console.log(`      ✅ Parseado: ${isValid ? 'Válido' : 'Inválido'}`);
        
        if (isValid) {
          Object.entries(parsed).forEach(([key, value]) => {
            const keyValid = typeof key === 'string' && key.match(/^W\d{1,2} \d{4}$/);
            const valueValid = Array.isArray(value) && value.every(v => typeof v === 'string' && v.match(/^W\d{1,2} \d{4}$/));
            console.log(`         ${key}: ${keyValid && valueValid ? '✅' : '❌'} [${Array.isArray(value) ? value.join(', ') : 'No array'}]`);
          });
        }
      } catch (error) {
        console.log(`      ❌ Error de parsing: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error en pruebas de formato:', error);
  }
}

/**
 * Función para probar el cálculo de semanas y verificar la W19 2025
 */
export async function probarCalculoSemanas() {
  console.log('\n🧪 === PRUEBA DE CÁLCULO DE SEMANAS ===');
  
  const { obtenerFormatoSemana } = await import('@/lib/airtable');
  
  // Fechas para probar W19 2025 (aproximadamente mayo 2025)
  const fechasPrueba = [
    new Date('2025-05-05'), // Lunes
    new Date('2025-05-06'), // Martes 
    new Date('2025-05-07'), // Miércoles
    new Date('2025-05-08'), // Jueves
    new Date('2025-05-09'), // Viernes
    new Date('2025-05-10'), // Sábado
    new Date('2025-05-11'), // Domingo
  ];
  
  console.log('📅 Probando fechas para W19 2025:');
  fechasPrueba.forEach(fecha => {
    const formatoSemana = obtenerFormatoSemana(fecha);
    const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
    console.log(`  ${fecha.toISOString().split('T')[0]} (${diaSemana}) -> ${formatoSemana}`);
  });
  
  // Probar algunas semanas específicas de 2025
  const fechasEspecificas = [
    { fecha: new Date('2025-01-06'), esperado: 'W02 2025' }, // Primera semana completa
    { fecha: new Date('2025-04-28'), esperado: 'W18 2025' }, // Semana anterior a W19
    { fecha: new Date('2025-05-05'), esperado: 'W19 2025' }, // W19 que estamos probando
    { fecha: new Date('2025-05-12'), esperado: 'W20 2025' }, // Semana siguiente
    { fecha: new Date('2025-12-29'), esperado: 'W53 2025' }, // Última semana
  ];
  
  console.log('\n📋 Verificación de fechas específicas:');
  let errores = 0;
  fechasEspecificas.forEach(({ fecha, esperado }) => {
    const resultado = obtenerFormatoSemana(fecha);
    const correcto = resultado === esperado;
    if (!correcto) errores++;
    
    console.log(`  ${fecha.toISOString().split('T')[0]} -> ${resultado} ${correcto ? '✅' : '❌ (esperado: ' + esperado + ')'}`);
  });
  
  console.log(`\n📊 Resultado: ${errores === 0 ? '✅ Todos los cálculos correctos' : `❌ ${errores} errores encontrados`}`);
  
  return errores === 0;
}

/**
 * Función para probar específicamente la configuración JSON de la tienda
 */
export async function probarConfiguracionTienda() {
  console.log('\n🏪 === PRUEBA DE CONFIGURACIÓN DE TIENDA ===');
  
  const storeId = 'recKr4mYwTRGbs29H'; // Store #2
  const semanaObjetivo = 'W19 2025';
  
  try {
    const { obtenerSemanasHistoricas, obtenerSemanasHistoricasPorSemana } = await import('@/lib/airtable');
    
    // Obtener toda la configuración
    console.log(`📋 Obteniendo configuración completa para tienda ${storeId}...`);
    const configuracionCompleta = await obtenerSemanasHistoricas(storeId);
    
    if (configuracionCompleta) {
      console.log('✅ Configuración JSON encontrada:');
      console.log(JSON.stringify(configuracionCompleta, null, 2));
      
      // Verificar semana específica
      console.log(`\n🎯 Verificando configuración para ${semanaObjetivo}...`);
      const semanasReferencia = await obtenerSemanasHistoricasPorSemana(storeId, semanaObjetivo);
      
      if (semanasReferencia) {
        console.log(`✅ Semanas de referencia para ${semanaObjetivo}:`, semanasReferencia);
        return true;
      } else {
        console.log(`❌ No se encontró configuración para ${semanaObjetivo}`);
        return false;
      }
    } else {
      console.log('❌ No se encontró configuración JSON para la tienda');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error al probar configuración:', error);
    return false;
  }
}

/**
 * Función para probar el flujo completo de lógica histórica
 */
export async function probarFlujoCompletoW19() {
  console.log('\n🔄 === PRUEBA DE FLUJO COMPLETO W19 2025 ===');
  
  const storeId = 'recKr4mYwTRGbs29H';
  const fechaW19 = new Date('2025-05-07'); // Miércoles de W19 2025
  const fechaStr = fechaW19.toISOString().split('T')[0];
  
  try {
    // 1. Verificar cálculo de semana
    const { obtenerFormatoSemana } = await import('@/lib/airtable');
    const semanaCalculada = obtenerFormatoSemana(fechaW19);
    console.log(`📅 Fecha: ${fechaStr} -> Semana calculada: ${semanaCalculada}`);
    
    if (semanaCalculada !== 'W19 2025') {
      console.log(`❌ Error: Se esperaba W19 2025, se obtuvo ${semanaCalculada}`);
      return false;
    }
    
    // 2. Verificar configuración de tienda
    const { obtenerSemanasHistoricasPorSemana } = await import('@/lib/airtable');
    const semanasReferencia = await obtenerSemanasHistoricasPorSemana(storeId, semanaCalculada);
    
    if (!semanasReferencia) {
      console.log(`❌ No se encontró configuración para ${semanaCalculada}`);
      return false;
    }
    
    console.log(`✅ Configuración encontrada para ${semanaCalculada}:`, semanasReferencia);
    
    // 3. Probar lógica histórica completa
    const { obtenerDatosTraficoConLogicaHistorica } = await import('@/lib/api');
    const resultado = await obtenerDatosTraficoConLogicaHistorica(
      'reckZGb2taDZfkptp', // Un día específico
      storeId,
      true, // esHistorica
      fechaStr,
      semanaCalculada
    );
    
    if (resultado && 'esDatoHistorico' in resultado && resultado.esDatoHistorico) {
      console.log('✅ Datos históricos obtenidos exitosamente');
      console.log(`   - Semanas de referencia: ${(resultado as any).semanasReferencia}`);
      console.log(`   - Fecha inicio: ${resultado.fechaInicio}`);
      console.log(`   - Fecha fin: ${resultado.fechaFin}`);
      return true;
    } else {
      console.log('❌ No se obtuvieron datos históricos o no están marcados como históricos');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error en el flujo completo:', error);
    return false;
  }
}

/**
 * Función principal que ejecuta todas las pruebas relacionadas con W19 2025
 */
export async function ejecutarPruebasW19() {
  console.log('🧪 ===============================================');
  console.log('🧪 INICIANDO PRUEBAS PARA W19 2025');
  console.log('🧪 ===============================================');
  
  const resultados = [];
  
  // Prueba 1: Cálculo de semanas
  console.log('\n📋 Prueba 1: Cálculo de semanas');
  const calculoOk = await probarCalculoSemanas();
  resultados.push({ prueba: 'Cálculo de semanas', resultado: calculoOk });
  
  // Prueba 2: Configuración de tienda
  console.log('\n📋 Prueba 2: Configuración de tienda');
  const configuracionOk = await probarConfiguracionTienda();
  resultados.push({ prueba: 'Configuración de tienda', resultado: configuracionOk });
  
  // Prueba 3: Flujo completo
  console.log('\n📋 Prueba 3: Flujo completo');
  const flujoOk = await probarFlujoCompletoW19();
  resultados.push({ prueba: 'Flujo completo', resultado: flujoOk });
  
  // Resumen
  console.log('\n🧪 ===============================================');
  console.log('🧪 RESUMEN DE PRUEBAS');
  console.log('🧪 ===============================================');
  
  resultados.forEach(({ prueba, resultado }) => {
    console.log(`${resultado ? '✅' : '❌'} ${prueba}`);
  });
  
  const todosOk = resultados.every(r => r.resultado);
  console.log(`\n🏆 Resultado final: ${todosOk ? '✅ TODAS LAS PRUEBAS PASARON' : '❌ ALGUNAS PRUEBAS FALLARON'}`);
  
  return todosOk;
}

/**
 * Función principal para ejecutar todas las pruebas
 */
export async function ejecutarTodasLasPruebas() {
  await probarFormatoJSON();
  await probarTraficoHistoricoJSON();
  await ejecutarPruebasW19();
}

// Exportar configuración para uso en otros archivos
export { TIENDA_EJEMPLO }; 