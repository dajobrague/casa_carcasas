import Airtable from 'airtable';

// Configuración de Airtable (usando variables ya existentes)
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID || '');

// IDs de tablas en Airtable (usando variables ya existentes)
const STORE_TABLE_ID = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID || '';
const EMPLOYEE_TABLE_ID = process.env.AIRTABLE_EMPLEADOS_TABLE_ID || '';

// Lista de países válidos en Airtable (debe coincidir con las opciones configuradas)
const VALID_COUNTRIES = [
  'ESPAÑA', 'ITALIA', 'PORTUGAL', 'FRANCIA', 'ALEMANIA', 'MEXICO', 
  'CHILE', 'COLOMBIA', 'POLONIA', 'REPUBLICA CHECA', 'RUMANIA', 'TURQUIA', 'GRECIA'
];

// Función para normalizar el país al formato esperado por Airtable
function normalizeCountry(country: string): string {
  // Convertir a mayúsculas
  const upperCountry = country.toUpperCase();
  
  // Normalizar acentos y caracteres especiales
  const normalizedMap: {[key: string]: string} = {
    'ESPAÑA': 'ESPAÑA',
    'ESPANA': 'ESPAÑA',
    'SPAIN': 'ESPAÑA',
    'ITALIA': 'ITALIA',
    'ITALY': 'ITALIA',
    'PORTUGAL': 'PORTUGAL',
    'FRANCIA': 'FRANCIA',
    'FRANCE': 'FRANCIA',
    'ALEMANIA': 'ALEMANIA',
    'GERMANY': 'ALEMANIA',
    'MEXICO': 'MEXICO',
    'MÉXICO': 'MEXICO',
    'CHILE': 'CHILE',
    'COLOMBIA': 'COLOMBIA',
    'POLONIA': 'POLONIA',
    'POLAND': 'POLONIA',
    'REPUBLICA CHECA': 'REPUBLICA CHECA',
    'REPÚBLICA CHECA': 'REPUBLICA CHECA',
    'CZECH REPUBLIC': 'REPUBLICA CHECA',
    'RUMANIA': 'RUMANIA',
    'RUMANÍA': 'RUMANIA',
    'ROMANIA': 'RUMANIA',
    'TURQUIA': 'TURQUIA',
    'TURQUÍA': 'TURQUIA',
    'TURKEY': 'TURQUIA',
    'GRECIA': 'GRECIA',
    'GREECE': 'GRECIA'
  };
  
  return normalizedMap[upperCountry] || (VALID_COUNTRIES.includes(upperCountry) ? upperCountry : 'ESPAÑA');
}

// Función para sincronizar tiendas
export async function syncStores(storesData: any): Promise<any> {
  // Asegurar que tenemos un array de tiendas
  let stores = storesData;
  if (stores && stores.data) {
    stores = stores.data;
  }
  
  if (!Array.isArray(stores)) {
    throw new Error('Formato de datos de tiendas inválido');
  }
  
  // Referencia a la tabla de tiendas
  const storeTable = base(STORE_TABLE_ID);
  
  // Obtener todas las tiendas existentes
  const query = await storeTable.select().all();
  
  console.log(`Se encontraron ${query.length} tiendas existentes en Airtable`);
  
  // Crear un mapa para relacionar códigos de tienda con IDs de registro
  const storeIdMap = new Map();
  query.forEach(record => {
    // Usar el campo "N°" que es el número de la tienda
    const tiendaNumero = record.get('N°');
    if (tiendaNumero) {
      // Convertir a string para hacer la comparación consistente
      storeIdMap.set(tiendaNumero.toString(), record.id);
    }
  });
  
  // Preparar variables para resultados
  let totalUpdates = 0;
  let totalCreates = 0;
  
  // Obtener todos los area managers válidos de Airtable
  // Para usar sus IDs en lugar de los DNIs o identificadores
  const validAreaManagers = new Map();
  try {
    // Intentamos obtener la lista de area managers, si no existe la tabla o hay errores
    // simplemente continuamos con un mapa vacío
    const areaManagerTable = process.env.AIRTABLE_AREA_MANAGER_TABLE_ID 
      ? base(process.env.AIRTABLE_AREA_MANAGER_TABLE_ID)
      : null;
    
    if (areaManagerTable) {
      const areaManagers = await areaManagerTable.select().all();
      areaManagers.forEach(manager => {
        // Almacenamos la relación entre DNI y el ID de Airtable
        const dni = manager.get('DNI') || manager.get('Identificador');
        if (dni) {
          validAreaManagers.set(dni.toString(), manager.id);
        }
      });
    }
  } catch (error) {
    console.warn('No se pudo obtener la lista de area managers:', error);
  }

  console.log(`Sincronizando ${stores.length} tiendas con Airtable...`);
  
  // Dividir las tiendas en chunks de 250
  const CHUNK_SIZE = 250;
  const chunksCount = Math.ceil(stores.length / CHUNK_SIZE);
  
  for (let chunkIndex = 0; chunkIndex < chunksCount; chunkIndex++) {
    // Obtener el chunk actual
    const startIndex = chunkIndex * CHUNK_SIZE;
    const endIndex = Math.min(startIndex + CHUNK_SIZE, stores.length);
    const currentChunk = stores.slice(startIndex, endIndex);
    
    console.log(`Procesando chunk ${chunkIndex + 1}/${chunksCount} (registros ${startIndex + 1}-${endIndex})`);
    
    // Preparar actualizaciones y creaciones para este chunk
    const updates = [];
    const creates = [];
    
    for (const store of currentChunk) {
      const codigoDepartamento = store.codigo_departamento?.toString();
      if (!codigoDepartamento) {
        continue; // Saltamos tiendas sin código
      }
      
      const nombreDepartamento = store.nombre_departamento?.replace(/^\d+\.\-\s*/, '') || '';
      
      // Normalizar el país al formato esperado por Airtable
      const paisRaw = store.pais_departamento || 'España';
      const paisDepartamento = normalizeCountry(paisRaw);
      
      // Obtener el area manager correcto
      // Si tenemos un DNI, intentamos encontrar su ID en Airtable
      let areaManagerIds: string[] = [];
      const areaManagerDNI = store.area_manager?.toString();
      
      if (areaManagerDNI && validAreaManagers.has(areaManagerDNI)) {
        // Si encontramos un ID válido para este DNI, lo usamos
        areaManagerIds = [validAreaManagers.get(areaManagerDNI)];
      }
      
      // Verificar si existe un registro con el mismo número de tienda
      const existingRecordId = storeIdMap.get(codigoDepartamento.toString());
      
      if (existingRecordId) {
        // Si el registro existe, añadir a la lista de actualizaciones
        const updateFields: Record<string, any> = {
          "TIENDA": nombreDepartamento,
          "PAIS": paisDepartamento
        };
        
        // Añadir el email del departamento si existe
        if (store.email_departamento) {
          updateFields["Email Supervisor"] = store.email_departamento;
        }
        
        // Añadir horas aprobadas si existe, asegurando que sea un número
        if (store.horas_aprobadas !== undefined) {
          // Convertir a número si es string o asegurarse que sea un número válido
          const horasAprobadas = typeof store.horas_aprobadas === 'string' 
            ? parseFloat(store.horas_aprobadas) 
            : Number(store.horas_aprobadas);
          
          // Solo incluir si es un número válido (no NaN)
          if (!isNaN(horasAprobadas)) {
            updateFields["Horas Aprobadas Value"] = horasAprobadas;
          }
        }
        
        // Solo incluimos Area Manager si tenemos IDs válidos
        if (areaManagerIds.length > 0) {
          updateFields["Area Manager"] = areaManagerIds;
        }
        
        updates.push({
          id: existingRecordId,
          fields: updateFields
        });
      } else {
        // Si el registro no existe, añadir a la lista de creaciones
        const tiendaNumero = parseInt(codigoDepartamento, 10);
        
        // Verificar que el código de tienda sea un número válido
        if (isNaN(tiendaNumero)) {
          console.warn(`Código de tienda inválido: ${codigoDepartamento}. No se creará el registro.`);
          continue; // Saltamos esta tienda
        }
        
        const createFields: Record<string, any> = {
          "N°": tiendaNumero, // Usar el valor ya convertido
          "TIENDA": nombreDepartamento,
          "PAIS": paisDepartamento
        };
        
        // Añadir el email del departamento si existe
        if (store.email_departamento) {
          createFields["Email Supervisor"] = store.email_departamento;
        }
        
        // Añadir horas aprobadas si existe, asegurando que sea un número
        if (store.horas_aprobadas !== undefined) {
          // Convertir a número si es string o asegurarse que sea un número válido
          const horasAprobadas = typeof store.horas_aprobadas === 'string' 
            ? parseFloat(store.horas_aprobadas) 
            : Number(store.horas_aprobadas);
          
          // Solo incluir si es un número válido (no NaN)
          if (!isNaN(horasAprobadas)) {
            createFields["Horas Aprobadas Value"] = horasAprobadas;
          }
        }
        
        // Solo incluimos Area Manager si tenemos IDs válidos
        if (areaManagerIds.length > 0) {
          createFields["Area Manager"] = areaManagerIds;
        }
        
        creates.push({
          fields: createFields
        });
      }
    }
    
    console.log(`Chunk ${chunkIndex + 1}: ${updates.length} actualizaciones, ${creates.length} creaciones`);
    
    // Procesar actualizaciones en lotes
    for (let i = 0; i < updates.length; i += 10) {
      const batch = updates.slice(i, i + 10);
      if (batch.length > 0) {
        try {
          // @ts-ignore - Ignoramos errores de tipo en llamadas a Airtable debido a complejidad de tipos
          await storeTable.update(batch);
          // No almacenamos los resultados detallados
        } catch (error) {
          console.error('Error al actualizar tiendas:', error);
          throw error;
        }
      }
    }
    
    // Procesar creaciones en lotes
    for (let i = 0; i < creates.length; i += 10) {
      const batch = creates.slice(i, i + 10);
      if (batch.length > 0) {
        try {
          // @ts-ignore - Ignoramos errores de tipo en llamadas a Airtable debido a complejidad de tipos
          await storeTable.create(batch);
          // No almacenamos los resultados detallados
        } catch (error) {
          console.error('Error al crear tiendas:', error);
          throw error;
        }
      }
    }
    
    // Actualizar totales
    totalUpdates += updates.length;
    totalCreates += creates.length;
    
    console.log(`Chunk ${chunkIndex + 1} completado. Total acumulado: ${totalUpdates} actualizaciones, ${totalCreates} creaciones`);
  }
  
  console.log(`Sincronización completada: ${totalUpdates} actualizaciones, ${totalCreates} creaciones`);
  
  // Retornar inmediatamente los resultados, sin mantener estado de sesión
  // y sin almacenar resultados detallados para evitar timeouts
  return {
    updates: totalUpdates,
    creates: totalCreates
  };
}

// Función para sincronizar usuarios
export async function syncUsers(usersData: any): Promise<any> {
  console.time('syncUsers');
  // Asegurar que tenemos un array de usuarios
  let users = usersData;
  if (users && users.data) {
    users = users.data;
  }
  
  if (!Array.isArray(users)) {
    throw new Error('Formato de datos de usuarios inválido');
  }
  
  console.log(`Procesando ${users.length} usuarios para sincronizar...`);
  
  // Referencia a las tablas
  const employeeTable = base(EMPLOYEE_TABLE_ID);
  const storeTable = base(STORE_TABLE_ID);
  
  // Lanzar en paralelo las consultas iniciales para mejorar el rendimiento
  console.time('consultasIniciales');
  
  // Primero, extraer solo los códigos de tienda únicos que necesitamos
  const tiendaCodigosSet = new Set<string>();
  const dniSet = new Set<string>();
  
  users.forEach(user => {
    if (user.codigo_departamento) {
      tiendaCodigosSet.add(user.codigo_departamento.toString());
    }
    if (user.dni) {
      dniSet.add(user.dni);
    }
  });
  
  const tiendaCodigos = Array.from(tiendaCodigosSet);
  const dniList = Array.from(dniSet);
  
  console.log(`Se encontraron ${tiendaCodigos.length} códigos de tienda únicos en los datos de usuarios`);
  console.log(`Se procesarán ${dniList.length} DNIs únicos`);
  
  // Lanzar ambas consultas en paralelo
  const [storeIdMap, employeeData] = await Promise.all([
    // Obtener tiendas en lotes
    (async () => {
      const storeIdMap = new Map<string, string>();
      
      if (tiendaCodigos.length > 0) {
        // Buscar tiendas en lotes para no exceder límites de Airtable
        const STORE_BATCH_SIZE = 100;
        const storePromises = [];
        
        for (let i = 0; i < tiendaCodigos.length; i += STORE_BATCH_SIZE) {
          const batchCodigos = tiendaCodigos.slice(i, i + STORE_BATCH_SIZE);
          
          // Construir fórmula para filtro
          const formula = `OR(${batchCodigos.map(code => `{N°} = "${code}"`).join(',')})`;
          
          // Crear promesa para consultar este lote
          const batchPromise = (async () => {
            try {
              console.log(`Buscando tiendas con fórmula: ${formula}`);
              const storeRecords = await storeTable.select({
                filterByFormula: formula,
                fields: ['N°'] // Solo pedir el campo que necesitamos
              }).all();
              
              console.log(`Se encontraron ${storeRecords.length} tiendas para este lote`);
              
              // Mapear códigos a IDs
              return storeRecords.map(record => {
                const numero = record.get('N°');
                if (numero) {
                  return [numero.toString(), record.id];
                }
                return null;
              }).filter(Boolean) as [string, string][];
            } catch (error) {
              console.error(`Error al consultar lote de tiendas: ${error}`);
              return [];
            }
          })();
          
          storePromises.push(batchPromise);
        }
        
        // Esperar a que se completen todas las consultas de tiendas
        const results = await Promise.all(storePromises);
        
        // Combinar todos los resultados en un solo mapa
        results.forEach(mappings => {
          mappings.forEach(([codigo, id]) => {
            storeIdMap.set(codigo, id);
          });
        });
        
        console.log(`Se mapearon ${storeIdMap.size} tiendas por código (${tiendaCodigos.length - storeIdMap.size} no encontradas)`);
      }
      
      return storeIdMap;
    })(),
    
    // Obtener solo los empleados que necesitamos por DNI
    (async () => {
      const employeeIdMap = new Map();
      const employeeDataMap = new Map();
      
      if (dniList.length > 0) {
        // Buscar empleados en lotes para no exceder límites de Airtable
        const EMPLOYEE_BATCH_SIZE = 100;
        
        for (let i = 0; i < dniList.length; i += EMPLOYEE_BATCH_SIZE) {
          const batchDNIs = dniList.slice(i, i + EMPLOYEE_BATCH_SIZE);
          
          // Construir fórmula para filtro
          const formula = `OR(${batchDNIs.map(dni => `{CodigoEmpleado} = "${dni}"`).join(',')})`;
          
          console.log(`Buscando empleados con fórmula: ${formula}`);
          
          try {
            const employeeRecords = await employeeTable.select({
              filterByFormula: formula,
              fields: ['CodigoEmpleado', 'Perfil', 'Horas Semanales', 'Tienda [Link]']
            }).all();
            
            console.log(`Se encontraron ${employeeRecords.length} empleados para este lote`);
            
            // Mapear DNIs a IDs y datos
            employeeRecords.forEach(record => {
              const dni = record.get('CodigoEmpleado');
              if (dni) {
                employeeIdMap.set(dni, record.id);
                
                // Guardar los datos actuales para compararlos después
                employeeDataMap.set(dni, {
                  perfil: record.get('Perfil'),
                  horasSemanales: record.get('Horas Semanales'),
                  tiendaLink: record.get('Tienda [Link]')
                });
              }
            });
          } catch (error) {
            console.error(`Error al consultar lote de empleados: ${error}`);
          }
        }
        
        console.log(`Se encontraron ${employeeIdMap.size} empleados existentes de los ${dniList.length} buscados`);
      }
      
      return { employeeIdMap, employeeDataMap };
    })()
  ]);
  
  console.timeEnd('consultasIniciales');
  
  // Extraer mapas de la consulta de empleados
  const { employeeIdMap, employeeDataMap } = employeeData;
  
  // Identificar tiendas no encontradas
  const tiendasNoEncontradas = new Set(
    tiendaCodigos.filter(codigo => !storeIdMap.has(codigo))
  );
  
  if (tiendasNoEncontradas.size > 0) {
    console.warn(`ADVERTENCIA: ${tiendasNoEncontradas.size} códigos de tienda no fueron encontrados en Airtable`);
    console.warn(Array.from(tiendasNoEncontradas).join(', '));
  }
  
  // Preparar variables para resultados
  let totalUpdates = 0;
  let totalCreates = 0;
  let skippedUpdates = 0; // Para contar actualizaciones evitadas
  
  // Dividir los usuarios en chunks para procesamiento
  console.time('procesarUsuarios');
  
  // Preparar actualizaciones y creaciones para este chunk
  const updates = [];
  const creates = [];
  
  for (const user of users) {
    const dni = user.dni;
    const nombre = user.nombre;
    const apellidos = user.apellidos;
    const perfil = user.perfil;
    const codigoDepartamento = user.codigo_departamento?.toString();
    const horasContrato = user.horas_contrato;
    
    // Obtener ID de registro de tienda a partir del código
    const tiendaRecordId = storeIdMap.get(codigoDepartamento);
    
    // Verificar si existe un registro con el mismo DNI
    const existingEmployeeId = employeeIdMap.get(dni);
    
    if (existingEmployeeId) {
      // Si el registro existe, verificar si hay cambios reales
      const currentData = employeeDataMap.get(dni);
      const tiendaLinkActual = currentData?.tiendaLink;
      const tiendaLinkActualID = Array.isArray(tiendaLinkActual) && tiendaLinkActual.length > 0 
        ? tiendaLinkActual[0] : undefined;
      
      // Solo actualizar si hay cambios reales
      const perfilCambio = currentData?.perfil !== perfil;
      const horasCambio = currentData?.horasSemanales !== horasContrato;
      const tiendaCambio = tiendaRecordId && tiendaLinkActualID !== tiendaRecordId;
      
      if (perfilCambio || horasCambio || tiendaCambio) {
        // Si hay cambios, añadir a la lista de actualizaciones
        const updateFields: Record<string, any> = {};
        
        if (perfilCambio) updateFields["Perfil"] = perfil;
        if (horasCambio) updateFields["Horas Semanales"] = horasContrato;
        
        // Solo incluimos Tienda [Link] si ha cambiado y tenemos un ID válido
        if (tiendaCambio && tiendaRecordId) {
          updateFields["Tienda [Link]"] = [tiendaRecordId];
        }
        
        console.log(`Actualizando empleado ${dni} con campos:`, updateFields);
        
        updates.push({
          id: existingEmployeeId,
          fields: updateFields
        });
      } else {
        // No hay cambios, saltamos este registro
        skippedUpdates++;
      }
    } else {
      // Si el registro no existe, añadir a la lista de creaciones
      const createFields: Record<string, any> = {
        "CodigoEmpleado": dni,
        "Nombre": nombre,
        "Apellidos": apellidos,
        "Perfil": perfil,
        "Horas Semanales": horasContrato
      };
      
      // Solo incluimos Tienda [Link] si tenemos un ID válido
      if (tiendaRecordId) {
        createFields["Tienda [Link]"] = [tiendaRecordId];
      }
      
      console.log(`Creando nuevo empleado ${dni}`);
      
      creates.push({
        fields: createFields
      });
    }
  }
  
  console.log(`Procesamiento: ${updates.length} actualizaciones, ${creates.length} creaciones, ${skippedUpdates} sin cambios`);
  
  // Procesar actualizaciones en lotes
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    if (batch.length > 0) {
      try {
        const result = await employeeTable.update(batch);
        // No almacenamos los resultados detallados
      } catch (error) {
        console.error(`Error al actualizar lote ${i/10 + 1}:`, error);
        throw error;
      }
    }
  }
  
  // Procesar creaciones en lotes
  for (let i = 0; i < creates.length; i += 10) {
    const batch = creates.slice(i, i + 10);
    if (batch.length > 0) {
      try {
        const result = await employeeTable.create(batch);
        // No almacenamos los resultados detallados
      } catch (error) {
        console.error(`Error al crear lote ${i/10 + 1}:`, error);
        throw error;
      }
    }
  }
  
  // Actualizar totales
  totalUpdates += updates.length;
  totalCreates += creates.length;
  
  // Reportar todas las tiendas no encontradas al final
  if (tiendasNoEncontradas.size > 0) {
    console.warn(`ADVERTENCIA: ${tiendasNoEncontradas.size} códigos de tienda no fueron encontrados en Airtable:`);
    console.warn(Array.from(tiendasNoEncontradas).join(', '));
    console.warn('Estos usuarios no serán vinculados a ninguna tienda en Airtable.');
  }
  
  console.log(`Sincronización de usuarios completada: ${totalUpdates} actualizaciones, ${totalCreates} creaciones, ${skippedUpdates} sin cambios`);
  console.timeEnd('procesarUsuarios');
  
  // Retornar solo resultados esenciales
  return {
    updates: totalUpdates,
    creates: totalCreates,
    skipped: skippedUpdates,
    tiendasNoEncontradas: Array.from(tiendasNoEncontradas)
  };
} 