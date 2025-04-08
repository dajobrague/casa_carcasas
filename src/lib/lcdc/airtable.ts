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
  const updateResults = [];
  const createResults = [];
  const missingOptions = new Set();
  
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
          const result = await storeTable.update(batch);
          updateResults.push(result);
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
          const result = await storeTable.create(batch);
          createResults.push(result);
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
  
  return {
    updates: totalUpdates,
    creates: totalCreates,
    updateResults,
    createResults,
    missingOptions: Array.from(missingOptions)
  };
}

// Función para sincronizar usuarios
export async function syncUsers(usersData: any): Promise<any> {
  // Asegurar que tenemos un array de usuarios
  let users = usersData;
  if (users && users.data) {
    users = users.data;
  }
  
  if (!Array.isArray(users)) {
    throw new Error('Formato de datos de usuarios inválido');
  }
  
  // Referencia a las tablas
  const employeeTable = base(EMPLOYEE_TABLE_ID);
  const storeTable = base(STORE_TABLE_ID);
  
  // Obtener todas las tiendas para mapear códigos a IDs
  const storeQuery = await storeTable.select().all();
  
  console.log(`Se encontraron ${storeQuery.length} tiendas existentes en Airtable para mapeo de usuarios`);
  
  // Crear un mapa para relacionar códigos de tienda con IDs de registro
  const storeIdMap = new Map();
  storeQuery.forEach(record => {
    // Usar el campo "N°" que es el número de la tienda
    const tiendaNumero = record.get('N°');
    if (tiendaNumero) {
      // Convertir a string para hacer la comparación consistente
      storeIdMap.set(tiendaNumero.toString(), record.id);
    }
  });
  
  console.log(`Se mapearon ${storeIdMap.size} tiendas por código`);
  
  // Obtener todos los empleados
  const employeeQuery = await employeeTable.select().all();
  
  console.log(`Se encontraron ${employeeQuery.length} empleados existentes en Airtable`);
  
  // Crear un mapa para relacionar códigos de empleado con IDs de registro
  const employeeIdMap = new Map();
  employeeQuery.forEach(record => {
    employeeIdMap.set(record.get('CodigoEmpleado'), record.id);
  });
  
  // Preparar variables para resultados
  let totalUpdates = 0;
  let totalCreates = 0;
  const updateResults = [];
  const createResults = [];
  const tiendasNoEncontradas = new Set();
  
  console.log(`Procesando ${users.length} usuarios para sincronizar...`);
  
  // Dividir los usuarios en chunks de 250
  const CHUNK_SIZE = 250;
  const chunksCount = Math.ceil(users.length / CHUNK_SIZE);
  
  for (let chunkIndex = 0; chunkIndex < chunksCount; chunkIndex++) {
    // Obtener el chunk actual
    const startIndex = chunkIndex * CHUNK_SIZE;
    const endIndex = Math.min(startIndex + CHUNK_SIZE, users.length);
    const currentChunk = users.slice(startIndex, endIndex);
    
    console.log(`Procesando chunk ${chunkIndex + 1}/${chunksCount} (usuarios ${startIndex + 1}-${endIndex})`);
    
    // Preparar actualizaciones y creaciones para este chunk
    const updates = [];
    const creates = [];
    
    for (const user of currentChunk) {
      const codigoEmpleado = user.codigo_empleado;
      const nombre = user.nombre;
      const apellidos = user.apellidos;
      const perfil = user.perfil;
      const codigoDepartamento = user.codigo_departamento?.toString();
      const horasContrato = user.horas_contrato;
      
      // Obtener ID de registro de tienda a partir del código
      const tiendaRecordId = storeIdMap.get(codigoDepartamento);
      
      // Si no encontramos la tienda, registramos el código para reportarlo después
      if (codigoDepartamento && !tiendaRecordId) {
        tiendasNoEncontradas.add(codigoDepartamento);
      }
      
      // Verificar si existe un registro con el mismo código de empleado
      const existingEmployeeId = employeeIdMap.get(codigoEmpleado);
      
      if (existingEmployeeId) {
        // Si el registro existe, añadir a la lista de actualizaciones
        const updateFields: Record<string, any> = {
          "Perfil": perfil,
          "Horas Semanales": horasContrato
        };
        
        // Solo incluimos Tienda [Link] si tenemos un ID válido
        if (tiendaRecordId) {
          updateFields["Tienda [Link]"] = [tiendaRecordId];
        }
        
        updates.push({
          id: existingEmployeeId,
          fields: updateFields
        });
      } else {
        // Si el registro no existe, añadir a la lista de creaciones
        const createFields: Record<string, any> = {
          "CodigoEmpleado": codigoEmpleado,
          "Nombre": nombre,
          "Apellidos": apellidos,
          "Perfil": perfil,
          "Horas Semanales": horasContrato
        };
        
        // Solo incluimos Tienda [Link] si tenemos un ID válido
        if (tiendaRecordId) {
          createFields["Tienda [Link]"] = [tiendaRecordId];
        }
        
        creates.push({
          fields: createFields
        });
      }
    }
    
    // Reportar tiendas no encontradas para este chunk
    if (tiendasNoEncontradas.size > 0) {
      console.warn(`ADVERTENCIA: Algunos códigos de tienda no fueron encontrados en Airtable.`);
    }
    
    console.log(`Chunk ${chunkIndex + 1}: ${updates.length} actualizaciones, ${creates.length} creaciones`);
    
    // Procesar actualizaciones en lotes
    for (let i = 0; i < updates.length; i += 10) {
      const batch = updates.slice(i, i + 10);
      if (batch.length > 0) {
        try {
          // @ts-ignore - Ignoramos errores de tipo en llamadas a Airtable debido a complejidad de tipos
          const result = await employeeTable.update(batch);
          updateResults.push(result);
          console.log(`Actualizados con éxito ${batch.length} empleados (lote ${i/10 + 1}/${Math.ceil(updates.length/10)})`);
        } catch (error) {
          console.error('Error al actualizar empleados:', error);
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
          const result = await employeeTable.create(batch);
          createResults.push(result);
          console.log(`Creados con éxito ${batch.length} empleados (lote ${i/10 + 1}/${Math.ceil(creates.length/10)})`);
        } catch (error) {
          console.error('Error al crear empleados:', error);
          throw error;
        }
      }
    }
    
    // Actualizar totales
    totalUpdates += updates.length;
    totalCreates += creates.length;
    
    console.log(`Chunk ${chunkIndex + 1} completado. Total acumulado: ${totalUpdates} actualizaciones, ${totalCreates} creaciones`);
  }
  
  // Reportar todas las tiendas no encontradas al final
  if (tiendasNoEncontradas.size > 0) {
    console.warn(`ADVERTENCIA: ${tiendasNoEncontradas.size} códigos de tienda no fueron encontrados en Airtable:`);
    console.warn(Array.from(tiendasNoEncontradas).join(', '));
    console.warn('Estos usuarios no serán vinculados a ninguna tienda en Airtable.');
  }
  
  console.log(`Sincronización de usuarios completada: ${totalUpdates} actualizaciones, ${totalCreates} creaciones`);
  
  return {
    updates: totalUpdates,
    creates: totalCreates,
    updateResults,
    createResults,
    tiendasNoEncontradas: Array.from(tiendasNoEncontradas)
  };
}

/**
 * Sincroniza un lote de usuarios con Airtable
 * @param usersBatch Array de usuarios para sincronizar
 * @returns Resultado de la sincronización con número de actualizaciones y creaciones
 */
export async function syncUserBatch(usersBatch: any[]): Promise<{updates: number, creates: number, errors: string[]}> {
  if (!Array.isArray(usersBatch) || usersBatch.length === 0) {
    return { updates: 0, creates: 0, errors: ['No se proporcionaron datos de usuarios'] };
  }
  
  // Referencia a las tablas
  const employeeTable = base(EMPLOYEE_TABLE_ID);
  const storeTable = base(STORE_TABLE_ID);
  
  // Obtener tiendas existentes para obtener IDs
  const allStores = await storeTable.select({
    fields: ['N°']
  }).all();
  
  // Mapear códigos de tienda a IDs
  const storeIdMap = new Map();
  allStores.forEach(record => {
    const numero = record.get('N°');
    if (numero) {
      storeIdMap.set(numero.toString(), record.id);
    }
  });
  
  // Obtener empleados existentes
  const allEmployees = await employeeTable.select({
    fields: ['CodigoEmpleado']
  }).all();
  
  // Mapear códigos de empleado a IDs
  const employeeIdMap = new Map();
  allEmployees.forEach(record => {
    const codigo = record.get('CodigoEmpleado');
    if (codigo) {
      employeeIdMap.set(codigo.toString(), record.id);
    }
  });
  
  // Preparar actualizaciones y creaciones
  const usersToUpdate: any[] = [];
  const usersToCreate: any[] = [];
  const errors: string[] = [];
  
  // Clasificar usuarios en actualizaciones o creaciones
  for (const user of usersBatch) {
    try {
      const codigoEmpleado = user.codigo_empleado?.toString();
      if (!codigoEmpleado) continue;
      
      const existingId = employeeIdMap.get(codigoEmpleado);
      const nombre = user.nombre || '';
      const apellidos = user.apellidos || '';
      const perfil = user.perfil || '';
      const horasContrato = user.horas_contrato;
      const codigoDepartamento = user.codigo_departamento?.toString();
      
      // Obtener ID de tienda si existe
      const tiendaRecordId = codigoDepartamento ? storeIdMap.get(codigoDepartamento) : null;
      
      // Crear los campos a guardar
      const fields: Record<string, any> = {
        "Perfil": perfil,
        "Horas Semanales": horasContrato
      };
      
      // Añadir tienda solo si se encontró
      if (tiendaRecordId) {
        fields["Tienda [Link]"] = [tiendaRecordId];
      }
      
      if (existingId) {
        // Actualizar empleado existente
        usersToUpdate.push({
          id: existingId,
          fields
        });
      } else {
        // Crear empleado nuevo
        fields["CodigoEmpleado"] = codigoEmpleado;
        fields["Nombre"] = nombre;
        fields["Apellidos"] = apellidos;
        
        usersToCreate.push({
          fields
        });
      }
    } catch (error) {
      errors.push(`Error procesando usuario ${user.codigo_empleado}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  let updates = 0;
  let creates = 0;
  
  // Procesar actualizaciones
  if (usersToUpdate.length > 0) {
    try {
      const updateResults = await employeeTable.update(usersToUpdate);
      updates = updateResults.length;
    } catch (error) {
      errors.push(`Error actualizando empleados: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Procesar creaciones
  if (usersToCreate.length > 0) {
    try {
      const createResults = await employeeTable.create(usersToCreate);
      creates = createResults.length;
    } catch (error) {
      errors.push(`Error creando empleados: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return { updates, creates, errors };
}

/**
 * Sincroniza un lote de tiendas con Airtable
 * @param storesBatch Array de tiendas para sincronizar
 * @returns Resultado de la sincronización con número de actualizaciones y creaciones
 */
export async function syncStoreBatch(storesBatch: any[]): Promise<{updates: number, creates: number, errors: string[]}> {
  if (!Array.isArray(storesBatch) || storesBatch.length === 0) {
    return { updates: 0, creates: 0, errors: ['No se proporcionaron datos de tiendas'] };
  }
  
  // Referencia a la tabla de tiendas
  const storeTable = base(STORE_TABLE_ID);
  
  // Obtener tiendas existentes
  const allStores = await storeTable.select({
    fields: ['N°']
  }).all();
  
  // Crear un mapa para facilitar la búsqueda por número
  const existingStoresMap = new Map();
  allStores.forEach(record => {
    const numero = record.get('N°');
    if (numero) {
      existingStoresMap.set(numero.toString(), record.id);
    }
  });
  
  // Obtener todos los area managers válidos de Airtable
  const validAreaManagers = new Map();
  try {
    // Intentamos obtener la lista de area managers, si existe
    const areaManagerTable = process.env.AIRTABLE_AREA_MANAGER_TABLE_ID 
      ? base(process.env.AIRTABLE_AREA_MANAGER_TABLE_ID)
      : null;
    
    if (areaManagerTable) {
      const areaManagers = await areaManagerTable.select().all();
      areaManagers.forEach(manager => {
        const dni = manager.get('DNI') || manager.get('Identificador');
        if (dni) {
          validAreaManagers.set(dni.toString(), manager.id);
        }
      });
    }
  } catch (error) {
    console.warn('No se pudo obtener la lista de area managers:', error);
  }
  
  // Preparar actualizaciones y creaciones
  const storesToUpdate: any[] = [];
  const storesToCreate: any[] = [];
  const errors: string[] = [];
  
  // Clasificar tiendas en actualizaciones o creaciones
  for (const store of storesBatch) {
    try {
      const codigoDepartamento = store.codigo_departamento?.toString();
      if (!codigoDepartamento) continue;
      
      const existingId = existingStoresMap.get(codigoDepartamento);
      const nombreDepartamento = store.nombre_departamento?.replace(/^\d+\.\-\s*/, '') || '';
      const paisDepartamento = normalizeCountry(store.pais_departamento || 'España');
      
      // Obtener el area manager correcto si existe
      let areaManagerIds: string[] = [];
      const areaManagerDNI = store.area_manager?.toString();
      
      if (areaManagerDNI && validAreaManagers.has(areaManagerDNI)) {
        areaManagerIds = [validAreaManagers.get(areaManagerDNI)];
      }
      
      // Crear los campos a guardar
      const fields: Record<string, any> = {
        "TIENDA": nombreDepartamento,
        "PAIS": paisDepartamento
      };
      
      // Añadir el email si existe
      if (store.email_departamento) {
        fields["Email Supervisor"] = store.email_departamento;
      }
      
      // Añadir Area Manager si hay IDs válidos
      if (areaManagerIds.length > 0) {
        fields["Area Manager"] = areaManagerIds;
      }
      
      if (existingId) {
        // Actualizar tienda existente
        storesToUpdate.push({
          id: existingId,
          fields
        });
      } else {
        // Crear tienda nueva (aseguramos que tenga el número)
        const tiendaNumero = parseInt(codigoDepartamento, 10);
        if (isNaN(tiendaNumero)) continue;
        
        fields["N°"] = tiendaNumero;
        storesToCreate.push({
          fields
        });
      }
    } catch (error) {
      errors.push(`Error procesando tienda ${store.codigo_departamento}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  let updates = 0;
  let creates = 0;
  
  // Procesar actualizaciones
  if (storesToUpdate.length > 0) {
    try {
      const updateResults = await storeTable.update(storesToUpdate);
      updates = updateResults.length;
    } catch (error) {
      errors.push(`Error actualizando tiendas: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Procesar creaciones
  if (storesToCreate.length > 0) {
    try {
      const createResults = await storeTable.create(storesToCreate);
      creates = createResults.length;
    } catch (error) {
      errors.push(`Error creando tiendas: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return { updates, creates, errors };
} 