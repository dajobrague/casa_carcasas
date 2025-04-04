// Script para verificar y corregir el formato del campo PAIS en Airtable
require('dotenv').config({ path: '.env.local' });
const Airtable = require('airtable');

// Configurar Airtable
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const tiendaTableId = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID || 'tblpHRqsBrADEkeUL';

if (!apiKey || !baseId) {
  console.error('Error: Se requieren las variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID');
  console.error('Por favor, asegúrate de que el archivo .env.local contiene estas variables.');
  process.exit(1);
}

const base = new Airtable({ apiKey }).base(baseId);
const tiendaTable = base(tiendaTableId);

// Mapeo de valores correctos para el campo PAIS
const PAISES_NORMALIZADOS = {
  // Español
  'ESPAÑA': 'ESPAÑA',
  'ESPANA': 'ESPAÑA',
  'ESPANYA': 'ESPAÑA',
  'ESP': 'ESPAÑA',
  'ES': 'ESPAÑA',
  'SPAIN': 'ESPAÑA',
  
  // Italiano
  'ITALIA': 'ITALIA',
  'IT': 'ITALIA',
  'ITALIE': 'ITALIA',
  'ITALY': 'ITALIA',
  
  // Portugués
  'PORTUGAL': 'PORTUGAL',
  'PT': 'PORTUGAL',
  
  // Francés
  'FRANCIA': 'FRANCIA',
  'FRANCE': 'FRANCIA',
  'FR': 'FRANCIA',
  
  // Alemán
  'ALEMANIA': 'ALEMANIA',
  'GERMANY': 'ALEMANIA',
  'DE': 'ALEMANIA',
  
  // Mexicano
  'MEXICO': 'MEXICO',
  'MÉXICO': 'MEXICO',
  'MX': 'MEXICO',
  
  // Chile (nuevo)
  'CHILE': 'CHILE',
  'CL': 'CHILE',
  
  // Colombia (nuevo)
  'COLOMBIA': 'COLOMBIA',
  'CO': 'COLOMBIA',
  
  // Polonia (nuevo)
  'POLONIA': 'POLONIA',
  'POLAND': 'POLONIA',
  'PL': 'POLONIA',
  
  // República Checa (nuevo)
  'REPUBLICA CHECA': 'REPUBLICA CHECA',
  'REPÚBLICA CHECA': 'REPUBLICA CHECA',
  'CZECH REPUBLIC': 'REPUBLICA CHECA',
  'CZ': 'REPUBLICA CHECA',
  
  // Rumania (nuevo)
  'RUMANIA': 'RUMANIA',
  'RUMANÍA': 'RUMANIA',
  'ROMANIA': 'RUMANIA',
  'RO': 'RUMANIA',
  
  // Turquía (nuevo)
  'TURQUIA': 'TURQUIA',
  'TURQUÍA': 'TURQUIA',
  'TURKEY': 'TURQUIA',
  'TR': 'TURQUIA',
  
  // Grecia (nuevo)
  'GRECIA': 'GRECIA',
  'GREECE': 'GRECIA',
  'GR': 'GRECIA'
};

// Modo de operación (verificar o corregir)
const shouldFix = process.argv.includes('--fix');
const onlyEmpty = process.argv.includes('--empty');
const force = process.argv.includes('--force');
const defaultPais = 'ESPAÑA'; // País por defecto para campos vacíos si no se puede inferir

async function processTiendas() {
  console.log(`\x1b[1mVerificando el campo PAIS en la tabla de Tiendas...\x1b[0m`);
  console.log(`Modo: ${shouldFix ? 'CORREGIR' : 'SÓLO VERIFICAR'}${onlyEmpty ? ' (solo campos vacíos)' : ''}${force ? ' (forzado)' : ''}\n`);
  
  try {
    // Obtener todos los registros
    const records = await tiendaTable.select().all();
    console.log(`Total de registros: ${records.length}`);
    
    // Estadísticas
    const stats = {
      correctos: 0,
      problematicos: 0,
      corregidos: 0,
      errores: 0,
      valoresUnicos: new Set()
    };
    
    // Problemas encontrados
    const problemas = [];
    
    // Procesar registros
    for (const record of records) {
      const id = record.id;
      const tienda = record.get('TIENDA') || '[Sin nombre]';
      const paisActual = record.get('PAIS');
      
      // Registrar valor único
      if (paisActual) {
        stats.valoresUnicos.add(paisActual);
      }
      
      // Verificar formato
      if (!paisActual) {
        problemas.push({
          id,
          tienda,
          paisActual: '[VACÍO]',
          problema: 'Campo vacío',
          sugerencia: null
        });
        stats.problematicos++;
        
        // Intentar inferir el país por el nombre de la tienda
        if (shouldFix && (onlyEmpty || force)) {
          let paisInferido = null;
          
          const nombreTienda = tienda.toUpperCase();
          if (nombreTienda.includes("CHILE") || nombreTienda.includes("CHILLAN") || nombreTienda.includes("VESPUCIO") || 
              nombreTienda.includes("MAIPU") || nombreTienda.includes("ARICA") || nombreTienda.includes("CALAMA") || 
              nombreTienda.includes("PUERTO MONTT") || nombreTienda.includes("VALDIVIA")) {
            paisInferido = "CHILE";
          } else if (nombreTienda.includes("COLOMBIA") || nombreTienda.includes("BOGOTA") || 
                    nombreTienda.includes("MEDELLIN") || nombreTienda.includes("CALI") || 
                    nombreTienda.includes("BARRANQUILLA") || nombreTienda.includes("CARTAGENA")) {
            paisInferido = "COLOMBIA";
          } else if (nombreTienda.includes("ESPAÑA") || nombreTienda.includes("MADRID") || 
                    nombreTienda.includes("BARCELONA") || nombreTienda.includes("VALENCIA") || 
                    nombreTienda.includes("MÁLAGA") || nombreTienda.includes("FUENCARRAL")) {
            paisInferido = "ESPAÑA";
          } else if (force) {
            // Si forzamos y no podemos inferir, usamos el valor por defecto
            paisInferido = defaultPais;
          }
          
          if (paisInferido) {
            try {
              // Actualizar usando el formato correcto para single select field
              await tiendaTable.update(id, {
                'PAIS': paisInferido
              });
              console.log(`✅ Corregido: "[VACÍO]" → "${paisInferido}" para tienda ${tienda} ${force && paisInferido === defaultPais ? '(usando valor por defecto)' : '(inferido por nombre)'}`);
              stats.corregidos++;
            } catch (error) {
              console.error(`❌ Error al corregir tienda ${tienda} (${id}):`, error.message);
              stats.errores++;
            }
          }
        }
        
      } else if (!PAISES_NORMALIZADOS[paisActual.toUpperCase()]) {
        problemas.push({
          id,
          tienda,
          paisActual,
          problema: 'Valor no reconocido',
          sugerencia: null
        });
        stats.problematicos++;
      } else if (paisActual !== PAISES_NORMALIZADOS[paisActual.toUpperCase()]) {
        const valorCorrecto = PAISES_NORMALIZADOS[paisActual.toUpperCase()];
        problemas.push({
          id,
          tienda,
          paisActual,
          problema: 'Formato incorrecto',
          sugerencia: valorCorrecto
        });
        stats.problematicos++;
        
        // Corregir si está en modo fix
        if (shouldFix && (!onlyEmpty || force)) {
          try {
            // Actualizar usando el formato correcto para single select field
            await tiendaTable.update(id, {
              'PAIS': valorCorrecto
            });
            console.log(`✅ Corregido: "${paisActual}" → "${valorCorrecto}" para tienda ${tienda}`);
            stats.corregidos++;
          } catch (error) {
            console.error(`❌ Error al corregir tienda ${tienda} (${id}):`, error.message);
            stats.errores++;
          }
        }
      } else {
        stats.correctos++;
      }
    }
    
    // Mostrar resultados
    console.log('\n--- RESUMEN ---');
    console.log(`Registros correctos: ${stats.correctos}`);
    console.log(`Registros con problemas: ${stats.problematicos}`);
    if (shouldFix) {
      console.log(`Registros corregidos: ${stats.corregidos}`);
      console.log(`Errores al corregir: ${stats.errores}`);
    }
    
    console.log('\nValores únicos encontrados:');
    Array.from(stats.valoresUnicos).sort().forEach(valor => {
      const esValido = PAISES_NORMALIZADOS[valor.toUpperCase()] === valor;
      console.log(`  ${esValido ? '✅' : '❌'} "${valor}"`);
    });
    
    // Mostrar problemas si no estamos en modo corrección
    if (!shouldFix && problemas.length > 0) {
      console.log('\n--- PROBLEMAS ENCONTRADOS ---');
      problemas.forEach(problema => {
        console.log(`\nTienda: ${problema.tienda} (${problema.id})`);
        console.log(`  Valor actual: "${problema.paisActual}"`);
        console.log(`  Problema: ${problema.problema}`);
        if (problema.sugerencia) {
          console.log(`  Sugerencia: "${problema.sugerencia}"`);
        }
      });
      
      console.log('\nPara corregir estos problemas, ejecuta:');
      console.log('  node src/scripts/fix-pais-field.js --fix');
      console.log('Para corregir solo campos vacíos:');
      console.log('  node src/scripts/fix-pais-field.js --fix --empty');
      console.log('Para forzar la corrección y asignar un país por defecto:');
      console.log('  node src/scripts/fix-pais-field.js --fix --force');
    }
    
  } catch (error) {
    console.error('Error al procesar registros:', error);
    process.exit(1);
  }
}

processTiendas(); 