import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import Airtable from 'airtable';

// Marcar la ruta como dinámica explícitamente
export const dynamic = 'force-dynamic';

// Configuración de Airtable
const apiKey = process.env.AIRTABLE_API_KEY || '';
const baseId = process.env.AIRTABLE_BASE_ID || '';
const semanasLaboralesTableId = process.env.AIRTABLE_SEMANAS_LABORALES_TABLE_ID || '';
const tiendaSupervisorTableId = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID || '';
const actividadDiariaTableId = process.env.AIRTABLE_ACTIVIDAD_DIARIA_TABLE_ID || '';
const diasLaboralesTableId = process.env.AIRTABLE_DIAS_LABORALES_TABLE_ID || '';
const empleadosTableId = process.env.AIRTABLE_EMPLEADOS_TABLE_ID || '';
const datosSemanalesTableId = process.env.AIRTABLE_DATOS_SEMANALES_TABLE_ID || '';

// Inicializar Airtable
const airtable = new Airtable({ apiKey }).base(baseId);



/**
 * Manejador de peticiones GET para Airtable
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro "action"' },
        { status: 400 }
      );
    }

    // Manejar diferentes acciones
    switch (action) {
      case 'obtenerDatosTienda': {
        const storeId = searchParams.get('storeId');
        if (!storeId) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "storeId"' },
            { status: 400 }
          );
        }
        
        try {
          const record = await airtable(tiendaSupervisorTableId).find(storeId);
          return NextResponse.json(record);
        } catch (error) {
          console.error('Debug - Error detallado al obtener tienda:', error);
          logger.error('Error al obtener datos de tienda:', error);
          return NextResponse.json(
            { error: 'Error al obtener datos de tienda' },
            { status: 500 }
          );
        }
      }

      case 'obtenerActividadesDiarias': {
        const storeId = searchParams.get('storeId');
        const diaId = searchParams.get('diaId');
        
        if (!storeId || !diaId) {
          return NextResponse.json(
            { error: 'Se requieren los parámetros "storeId" y "diaId"' },
            { status: 400 }
          );
        }

        try {
          const records = await airtable(actividadDiariaTableId)
            .select({
              filterByFormula: `AND({record_Id (from Tienda y Supervisor)}='${storeId}',{recordId (from Fecha)}='${diaId}')`
            })
            .all();
            
          return NextResponse.json({ records });
        } catch (error) {
          console.error('Debug - Error detallado al obtener actividades:', error);
          logger.error('Error al obtener actividades diarias:', error);
          return NextResponse.json(
            { error: 'Error al obtener actividades diarias' },
            { status: 500 }
          );
        }
      }

      case 'obtenerDiasLaboralesSemana': {
        const semanaId = searchParams.get('semanaId');
        
        if (!semanaId) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "semanaId"' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Obteniendo días laborales para semana: ${semanaId}`);

        try {
          const records = await airtable(diasLaboralesTableId)
            .select({
              filterByFormula: `FIND('${semanaId}', {Semanas Laborales})`
            })
            .all();
          
          console.log(`Debug - API route: Días laborales encontrados: ${records.length}`);
          return NextResponse.json({ records });
        } catch (error) {
          console.error('Debug - Error detallado al obtener días laborales:', error);
          logger.error('Error al obtener días laborales:', error);
          return NextResponse.json(
            { error: 'Error al obtener días laborales' },
            { status: 500 }
          );
        }
      }

      case 'obtenerDiaLaboralPorId': {
        const diaId = searchParams.get('diaId');
        
        if (!diaId) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "diaId"' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Obteniendo día laboral con ID: ${diaId}`);

        try {
          const record = await airtable(diasLaboralesTableId).find(diaId);
          console.log('Debug - API route: Día laboral encontrado con éxito');
          return NextResponse.json(record);
        } catch (error) {
          console.error('Debug - Error detallado al obtener día laboral:', error);
          logger.error('Error al obtener día laboral:', error);
          return NextResponse.json(
            { error: 'Error al obtener día laboral' },
            { status: 500 }
          );
        }
      }

      case 'obtenerSemanaPorId': {
        const semanaId = searchParams.get('semanaId');
        
        if (!semanaId) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "semanaId"' },
            { status: 400 }
          );
        }

        try {
          const record = await airtable(semanasLaboralesTableId).find(semanaId);
          return NextResponse.json(record);
        } catch (error) {
          console.error('Debug - Error detallado al obtener semana:', error);
          logger.error('Error al obtener semana:', error);
          return NextResponse.json(
            { error: 'Error al obtener semana' },
            { status: 500 }
          );
        }
      }

      case 'obtenerSemanasLaborales': {
        const formula = searchParams.get('formula');
        const mes = searchParams.get('mes');
        const año = searchParams.get('año');
        
        console.log(`Debug - API route: Parámetros recibidos: mes=${mes}, año=${año}, formula=${formula}`);
        
        // Si tenemos mes y año, pero no formula, vamos a construir la formula
        if (mes && año && !formula) {
          // Construir la fórmula para filtrar por mes y año
          let formulaGenerada = '';
          
          if (mes.toLowerCase() === 'all') {
            // Si el mes es 'all', filtrar solo por año
            formulaGenerada = `{Year}="${año}"`;
          } else if (año.toLowerCase() === 'all') {
            // Si el año es 'all', filtrar solo por mes
            formulaGenerada = `LOWER({Mes})="${mes.toLowerCase()}"`;
          } else {
            // Filtrar por mes y año
            formulaGenerada = `AND(LOWER({Mes})="${mes.toLowerCase()}",{Year}="${año}")`;
          }
          
          console.log(`Debug - API route: Fórmula generada para mes=${mes}, año=${año}: ${formulaGenerada}`);
          
          // Usar la fórmula generada
          const records = await obtenerSemanasConFormula(formulaGenerada);
          return NextResponse.json({ records });
        }
        
        if (!formula) {
          console.log('Debug - API route: No se proporcionó una fórmula, obteniendo todas las semanas laborales');
          try {
            // Obtener todas las semanas sin filtro
            const records = await obtenerSemanasConFormula('TRUE()');
            return NextResponse.json({ records });
          } catch (error) {
            console.error('Debug - Error detallado al obtener todas las semanas laborales:', error);
            logger.error('Error al obtener todas las semanas laborales:', error);
            return NextResponse.json(
              { error: 'Error al obtener semanas laborales' },
              { status: 500 }
            );
          }
        }

        console.log(`Debug - API route: Obteniendo semanas laborales con fórmula: ${formula}`);
        
        // Usar la función auxiliar para obtener registros
        const records = await obtenerSemanasConFormula(formula);
        return NextResponse.json({ records });
      }

      case 'obtenerActividadesSemanales': {
        const formula = searchParams.get('formula');
        
        if (!formula) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "formula"' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Obteniendo actividades semanales con fórmula: ${formula}`);

        try {
          // Tabla de actividades semanales (usar la tabla adecuada para actividades)
          // En este caso, podemos usar una tabla predefinida o pasarla como parámetro
          const actividadSemanalTableId = 'tblHbmJZEPCB7fAMo'; // ID de la tabla de actividades semanales
          
          const records = await airtable(actividadSemanalTableId)
            .select({
              filterByFormula: formula
            })
            .all();
          
          console.log(`Debug - API route: Actividades semanales encontradas: ${records.length}`);
          return NextResponse.json({ records });
        } catch (error) {
          console.error('Debug - Error detallado al obtener actividades semanales:', error);
          logger.error('Error al obtener actividades semanales:', error);
          return NextResponse.json(
            { error: 'Error al obtener actividades semanales' },
            { status: 500 }
          );
        }
      }

      case 'verificarConexion': {
        try {
          await airtable(semanasLaboralesTableId)
            .select({
              maxRecords: 1,
              fields: ['Name']
            })
            .firstPage();
          
          return NextResponse.json({ connected: true });
        } catch (error) {
          console.error('Debug - Error detallado al verificar conexión:', error);
          logger.error('Error al verificar conexión con Airtable:', error);
          return NextResponse.json({ 
            connected: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
            details: error instanceof Error ? error.stack : undefined
          }, { status: 200 });
        }
      }

      case 'obtenerEmpleados': {
        const formula = searchParams.get('formula');
        if (!formula) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "formula"' },
            { status: 400 }
          );
        }
        
        try {
          // Asegurarse de que la tabla de empleados existe
          if (!empleadosTableId) {
            console.error('Debug - Error: ID de tabla de empleados no configurado');
            return NextResponse.json(
              { error: 'Configuración de Airtable incompleta: ID de tabla de empleados no configurado' },
              { status: 500 }
            );
          }

          // Utilizar la tabla de tiendas/supervisores si el ID de la tabla de empleados es igual
          const tableId = empleadosTableId === tiendaSupervisorTableId ? tiendaSupervisorTableId : empleadosTableId;

          // Usar la librería Airtable en lugar de curl
          const records = await airtable(tableId)
            .select({
              filterByFormula: decodeURIComponent(formula)
            })
            .all();
          
          // Transformar los registros al formato esperado por el cliente
          const formattedRecords = records.map(record => ({
            id: record.id,
            fields: record.fields,
            createdTime: record._rawJson.createdTime
          }));
          
          return NextResponse.json({ records: formattedRecords });
        } catch (error) {
          console.error('Debug - Error detallado al obtener empleados:', error);
          logger.error('Error al obtener empleados:', error);
          return NextResponse.json(
            { error: 'Error al obtener empleados' },
            { status: 500 }
          );
        }
      }

      case 'buscarEmpleados': {
        const formula = searchParams.get('formula');
        if (!formula) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "formula"' },
            { status: 400 }
          );
        }
        
        console.log(`Debug - API route: Buscando empleados con fórmula: ${formula}`);
        
        try {
          if (!empleadosTableId) {
            console.error('Debug - Error: ID de tabla de empleados no configurado');
            return NextResponse.json(
              { error: 'Configuración de Airtable incompleta: ID de tabla de empleados no configurado' },
              { status: 500 }
            );
          }
          
          // Usar la librería Airtable para buscar empleados
          const records = await airtable(empleadosTableId)
            .select({
              filterByFormula: decodeURIComponent(formula),
              maxRecords: 20 // Limitar a 20 resultados para evitar exceder límites de API
            })
            .all();
          
          console.log(`Debug - API route: Empleados encontrados en búsqueda: ${records.length}`);
          
          // Transformar los registros al formato esperado por el cliente
          const formattedRecords = records.map(record => ({
            id: record.id,
            fields: record.fields,
            createdTime: record._rawJson.createdTime
          }));
          
          return NextResponse.json({ records: formattedRecords });
        } catch (error) {
          console.error('Debug - Error detallado al buscar empleados:', error);
          logger.error('Error al buscar empleados:', error);
          return NextResponse.json(
            { error: 'Error al buscar empleados' },
            { status: 500 }
          );
        }
      }

      case 'obtenerMesesDisponibles': {
        console.log('Debug - API route: Obteniendo meses disponibles');
        
        try {
          // Usar la librería Airtable en lugar de curl
          const records = await airtable(semanasLaboralesTableId)
            .select({
              fields: ['Mes', 'Year']
            })
            .all();
          
          // Extraer meses únicos
          const mesesSet = new Set<string>();
          
          records.forEach((record) => {
            if (record.fields.Mes && record.fields.Year) {
              mesesSet.add(`${record.fields.Mes} ${record.fields.Year}`);
            }
          });
          
          const meses = Array.from(mesesSet);
          console.log(`Debug - API route: Meses disponibles encontrados: ${meses.length}`);
          
          return NextResponse.json({ meses });
        } catch (error) {
          console.error('Debug - Error detallado al obtener meses disponibles:', error);
          logger.error('Error al obtener meses disponibles:', error);
          return NextResponse.json(
            { error: 'Error al obtener meses disponibles' },
            { status: 500 }
          );
        }
      }

      case 'obtenerMesesGestor': {
        console.log('Debug - API route: Obteniendo meses para gestor mensual');
        const mesesTableId = 'tblY4azExiLi7dbcw';
        
        try {
          // Usar la librería Airtable en lugar de curl
          const records = await airtable(mesesTableId)
            .select({
              fields: ['Mes']
            })
            .all();
          
          // Extraer meses
          const meses = records
            .map(record => record.fields.Mes as string)
            .filter(Boolean);
          
          console.log(`Debug - API route: Meses para gestor mensual encontrados: ${meses.length}`);
          
          return NextResponse.json({ meses });
        } catch (error) {
          console.error('Debug - Error detallado al obtener meses para gestor mensual:', error);
          logger.error('Error al obtener meses para gestor mensual:', error);
          return NextResponse.json(
            { error: 'Error al obtener meses para gestor mensual' },
            { status: 500 }
          );
        }
      }

      case 'obtenerMesesEditor': {
        console.log('Debug - API route: Obteniendo meses para el editor');
        
        try {
          // Usar la librería Airtable en lugar de curl
          const records = await airtable(semanasLaboralesTableId)
            .select({
              fields: ['Mes', 'Year']
            })
            .all();
          
          // Extraer meses únicos con formato correcto
          const mesesSet = new Set<string>();
          
          records.forEach((record) => {
            if (record.fields.Mes && record.fields.Year) {
              const mesTexto = String(record.fields.Mes).trim();
              const yearTexto = String(record.fields.Year).trim();
              
              // Función para normalizar el nombre del mes (solo el nombre sin el año)
              const normalizarMes = (mesCompleto: string): string => {
                // Extraer solo el nombre del mes (primera palabra)
                const soloMes = mesCompleto.split(/\s+/)[0].toLowerCase();
                // Lista de meses válidos en español
                const mesesValidos = [
                  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
                ];
                // Si el mes está en la lista, usarlo; si no, devolver el original
                return mesesValidos.includes(soloMes) ? soloMes : soloMes;
              };
              
              // Normalizar el nombre del mes
              const nombreMesNormalizado = normalizarMes(mesTexto);
              
              // Formato final: "nombreMes año"
              mesesSet.add(`${nombreMesNormalizado} ${yearTexto}`);
            }
          });
          
          const meses = Array.from(mesesSet);
          console.log(`Debug - API route: Meses para editor encontrados: ${meses.length}`);
          
          return NextResponse.json({ meses });
        } catch (error) {
          console.error('Debug - Error detallado al obtener meses para editor:', error);
          logger.error('Error al obtener meses para editor:', error);
          return NextResponse.json(
            { error: 'Error al obtener meses para editor' },
            { status: 500 }
          );
        }
      }

      case 'obtenerEmpleadosTienda': {
        const storeId = searchParams.get('storeId');
        const status = searchParams.get('status');
        
        // Permitir obtener todos los empleados sin filtrar por tienda
        const getAllEmployees = !storeId;
        
        console.log(`Debug - API route: Obteniendo empleados ${getAllEmployees ? 'de todas las tiendas' : `para tienda: ${storeId}`}${status ? ` con status: ${status}` : ' (todos los status)'}`);
        console.log(`Debug - API route: Usando tabla de empleados: ${empleadosTableId}`);

        try {
          // Asegurarse de que el ID de la tabla de empleados está definido
          if (!empleadosTableId) {
            throw new Error('ID de la tabla de empleados no configurado');
          }
          
          // Preparar el filtro para Airtable
          let filterByFormula = '';
          
          if (status) {
            // Si se proporciona status, filtrar por status
            filterByFormula = `{Status Empleado}='${status}'`;
          } else {
            // Si no se proporciona status, obtener todos los empleados sin filtrar por status
            filterByFormula = 'NOT({CodigoEmpleado}="")';
          }
          
          console.log(`Debug - API route: Filtro utilizado: ${filterByFormula}`);
          
          // Usar la librería Airtable en lugar de curl
          const records = await airtable(empleadosTableId)
            .select({
              filterByFormula
            })
            .all();
          
          console.log(`Debug - API route: Empleados encontrados (total): ${records.length}`);
          
          // Verificar los nombres de los campos que tiene cada registro
          if (records.length > 0) {
            console.log(`Debug - API route: Campos del primer registro: ${Object.keys(records[0].fields).join(', ')}`);
          }
          
          // Filtrar manualmente por tienda solo si se proporcionó un storeId
          let filteredRecords = records;
          if (!getAllEmployees && storeId && records.length > 0) {
            console.log('Debug - API route: Filtrando manualmente por tienda');
            
            // Buscar en todos los campos posibles para localizar el ID de tienda
            filteredRecords = records.filter((record) => {
              // Comprobar varios campos posibles donde podría estar la tienda
              const tiendaIds = record.fields['Tienda [Link]'] || 
                                record.fields['record_Id (from Tienda y Supervisor)'] || 
                                record.fields['Tienda'] || [];
              
              // Verificar si es un array y contiene el storeId, o si es un string y coincide
              if (Array.isArray(tiendaIds)) {
                return tiendaIds.includes(storeId);
              } else if (typeof tiendaIds === 'string') {
                return tiendaIds === storeId;
              }
              return false;
            });
            
            console.log(`Debug - API route: Empleados filtrados por tienda: ${filteredRecords.length}`);
          } else if (getAllEmployees) {
            console.log('Debug - API route: No se proporcionó storeId, devolviendo todos los empleados');
          }
          
          // Transformar los registros al formato esperado por el cliente
          const formattedRecords = filteredRecords.map(record => ({
            id: record.id,
            fields: record.fields,
            createdTime: record._rawJson.createdTime
          }));
          
          return NextResponse.json({ records: formattedRecords });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          console.error('Debug - Error detallado al obtener empleados:', error);
          logger.error('Error al obtener empleados:', errorMessage);
          return NextResponse.json(
            { 
              error: 'Error al obtener empleados',
              message: errorMessage,
              details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
          );
        }
      }

      case 'obtenerEmpleadosPorIds': {
        const idsParam = searchParams.get('ids');
        
        if (!idsParam) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "ids"' },
            { status: 400 }
          );
        }

        try {
          // Asegurarse de que el ID de la tabla de empleados está definido
          if (!empleadosTableId) {
            throw new Error('ID de la tabla de empleados no configurado');
          }
          
          // Decodificar el array de IDs
          const empleadosIds = JSON.parse(decodeURIComponent(idsParam)) as string[];
          
          console.log(`Debug - API route: Obteniendo ${empleadosIds.length} empleados por IDs directamente`);
          
          if (empleadosIds.length === 0) {
            return NextResponse.json({ records: [] });
          }
          
          // Crear un array de promesas para obtener cada empleado
          const promesas = empleadosIds.map(id => {
            return airtable(empleadosTableId).find(id)
              .catch(error => {
                console.error(`Error al obtener empleado con ID ${id}:`, error);
                return null; // Devolvemos null para empleados que no se puedan encontrar
              });
          });
          
          // Resolver todas las promesas en paralelo
          const resultados = await Promise.all(promesas);
          
          // Filtrar los resultados nulos y formatear la respuesta
          const records = resultados
            .filter((record): record is any => record !== null) // Eliminar los nulls y asegurar el tipo
            .map(record => ({
              id: record.id,
              fields: record.fields,
              createdTime: record._rawJson.createdTime
            }));
          
          console.log(`Debug - API route: Se encontraron ${records.length} de ${empleadosIds.length} empleados solicitados`);
          
          return NextResponse.json({ records });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          console.error('Debug - Error detallado al obtener empleados por IDs:', error);
          logger.error('Error al obtener empleados por IDs:', errorMessage);
          return NextResponse.json(
            { 
              error: 'Error al obtener empleados por IDs',
              message: errorMessage,
              details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
          );
        }
      }

      case 'verificarEsVacante': {
        const empleadoId = searchParams.get('empleadoId');
        
        if (!empleadoId) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "empleadoId"' },
            { status: 400 }
          );
        }
        
        console.log(`Debug - API route: Verificando rápidamente si ${empleadoId} es una vacante`);
        
        try {
          // Consulta ligera para determinar si es una vacante basada en status
          const empleado = await airtable(empleadosTableId).find(empleadoId);
          
          // Verificar si es una vacante (tiene Status Empleado = Pendiente)
          const esVacante = empleado.fields['Status Empleado'] === 'Pendiente';
          console.log(`Debug - API route: ID ${empleadoId} es${esVacante ? '' : ' NO'} una vacante`);
          
          return NextResponse.json({ 
            esVacante,
            tieneNombreVacante: empleado.fields['Nombre'] === 'VACANTE'
          });
        } catch (error) {
          console.log(`Debug - API route: Error al verificar si es vacante, asumiendo que no lo es:`, error);
          return NextResponse.json({ esVacante: false });
        }
      }

      case 'verificarActividadesGeneradas': {
        const empleadoId = searchParams.get('empleadoId');
        
        if (!empleadoId) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "empleadoId"' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Verificando actividades generadas para empleado: ${empleadoId}`);

        try {
          // Tabla de actividades semanales
          const actividadSemanalTableId = 'tblrrsQqHdJOF6xdy';
          const semanasLaboralesTableId = process.env.AIRTABLE_SEMANAS_LABORALES_TABLE_ID || 'tblY4azExiLi7dbcw';
          
          // Set para almacenar IDs únicos de semanas
          const semanasUnicas = new Set<string>();
          
          // Método 1: Búsqueda directa - Buscar actividades donde el empleado esté asignado
          console.log(`Debug - API route: Realizando búsqueda directa para empleado ${empleadoId}`);
          
          // Construir fórmula para buscar por el ID del empleado en cualquier campo
          const formula = `OR(FIND("${empleadoId}", {Empleados}), FIND("${empleadoId}", {record_Id (from Empleados)}))`;
          
          const actividadesDirectas = await airtable(actividadSemanalTableId)
            .select({
              filterByFormula: formula
            })
            .all();
          
          console.log(`Debug - API route: Actividades encontradas por método directo: ${actividadesDirectas.length}`);
          
          // Extraer semanas de las actividades encontradas directamente
          actividadesDirectas.forEach(record => {
            if (record.fields['Semanas Laborales'] && Array.isArray(record.fields['Semanas Laborales'])) {
              record.fields['Semanas Laborales'].forEach(semanaId => {
                semanasUnicas.add(semanaId);
              });
            }
          });
          
          console.log(`Debug - API route: Semanas encontradas por método directo: ${semanasUnicas.size}`);
          
          // Método 2: Verificación inversa - Buscar en todas las semanas laborales
          // Si el número de semanas es muy grande, limitamos a las más recientes
          console.log(`Debug - API route: Realizando verificación inversa para empleado ${empleadoId}`);
          
          // Obtener todas las semanas recientes (último año)
          const añoActual = new Date().getFullYear();
          const formulaSemanas = `OR({Year}="${añoActual}", {Year}="${añoActual - 1}")`;
          
          const semanas = await airtable(semanasLaboralesTableId)
            .select({
              filterByFormula: formulaSemanas,
              sort: [{ field: 'Fecha de Inicio', direction: 'desc' }],
              maxRecords: 100 // Limitamos para evitar consultas demasiado grandes
            })
            .all();
          
          console.log(`Debug - API route: Semanas laborales recientes encontradas: ${semanas.length}`);
          
          // Para cada semana, verificar si tienen actividades asociadas con el empleado
          let semanasVerificadas = 0;
          
          for (const semana of semanas) {
            // Si ya tenemos esta semana en el set, no es necesario verificarla
            if (semanasUnicas.has(semana.id)) {
              continue;
            }
            
            // Verificar si la semana tiene actividades semanales asociadas
            const actividadesSemana = semana.fields['Actividad Semanal'];
            if (actividadesSemana && Array.isArray(actividadesSemana) && actividadesSemana.length > 0) {
              // Verificar hasta 5 actividades por semana para limitar el número de consultas
              const actividadesToCheck = actividadesSemana.slice(0, 5);
              semanasVerificadas++;
              
              for (let i = 0; i < actividadesToCheck.length; i++) {
                const actividadId = actividadesToCheck[i];
                if (typeof actividadId !== 'string') continue;

                try {
                  const actividad = await airtable(actividadSemanalTableId).find(actividadId);
                  
                  // Manejar tipos de campos de manera segura
                  let encontrado = false;
                  
                  // Verificar empleados directos
                  const empleadosField = actividad.fields['Empleados'];
                  if (empleadosField && Array.isArray(empleadosField)) {
                    for (let j = 0; j < empleadosField.length; j++) {
                      if (empleadosField[j] === empleadoId) {
                        encontrado = true;
                        break;
                      }
                    }
                  }
                  
                  // Verificar empleados vinculados si aún no se ha encontrado
                  if (!encontrado) {
                    const vinculadosField = actividad.fields['record_Id (from Empleados)'];
                    if (vinculadosField && Array.isArray(vinculadosField)) {
                      for (let j = 0; j < vinculadosField.length; j++) {
                        if (vinculadosField[j] === empleadoId) {
                          encontrado = true;
                          break;
                        }
                      }
                    }
                  }
                  
                  if (encontrado) {
                    console.log(`Debug - API route: Encontrada relación inversa en semana ${semana.id} (actividad ${actividadId})`);
                    semanasUnicas.add(semana.id);
                    break; // Una vez encontrada la relación, no es necesario seguir buscando
                  }
                } catch (error) {
                  console.log(`Debug - API route: Error al verificar actividad ${actividadId}: ${error}`);
                  // Continuar con la siguiente actividad
                }
              }
            }
            
            // Si hemos verificado suficientes semanas, detenemos la búsqueda
            if (semanasVerificadas >= 20) {
              console.log(`Debug - API route: Límite de verificación inversa alcanzado (20 semanas)`);
              break;
            }
          }
          
          const semanasArray = Array.from(semanasUnicas);
          console.log(`Debug - API route: Total de semanas únicas encontradas: ${semanasUnicas.size}`);
          
          return NextResponse.json({ semanasIds: semanasArray });
        } catch (error) {
          console.error('Debug - Error detallado al verificar actividades:', error);
          logger.error('Error al verificar actividades:', error);
          return NextResponse.json(
            { error: 'Error al verificar actividades' },
            { status: 500 }
          );
        }
      }

      case 'obtenerCalendarioEmpleado': {
        const empleadoId = searchParams.get('empleadoId');
        const mes = searchParams.get('mes');
        const year = searchParams.get('year');
        
        if (!empleadoId) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "empleadoId"' },
            { status: 400 }
          );
        }
        
        if (!mes || !year) {
          return NextResponse.json(
            { error: 'Se requieren los parámetros "mes" y "year"' },
            { status: 400 }
          );
        }
        
        console.log(`Debug - API route: Obteniendo calendario para empleado: ${empleadoId}, mes: ${mes}, año: ${year}`);
        
        try {
          // Tabla de actividades diarias
          const actividadDiariaTableId = 'tblbkzixVwxZ8oVqb';
          
          // El formato de fecha en la base de datos es YYYY-MM-DD
          // Formatear el mes con ceros a la izquierda si es necesario
          const mesFormateado = mes.padStart(2, '0');
          
          // Construir el patrón para el mes y año (YYYY-MM)
          const patronFecha = `${year}-${mesFormateado}`;
          
          // SOLO filtrar por fecha, no por empleado (que es un array y no se puede filtrar correctamente con FIND)
          const formula = `REGEX_MATCH({Fecha Format}, "^${patronFecha}")`;
          
          console.log(`Debug - API route: Fórmula de filtro por fecha: ${formula}`);
          
          const allRecords = await airtable(actividadDiariaTableId)
            .select({
              filterByFormula: formula
            })
            .all();
          
          console.log(`Debug - API route: Total registros para mes ${mesFormateado}/${year}: ${allRecords.length}`);
          
          // Filtrar manualmente por empleado, que está en un array
          const filteredRecords = allRecords.filter(record => {
            const empleados = record.fields['Empleados'] as any[];
            // Verificar si empleados es un array
            if (Array.isArray(empleados)) {
              return empleados.includes(empleadoId);
            }
            return false;
          });
          
          console.log(`Debug - API route: Registros filtrados para empleado ${empleadoId}: ${filteredRecords.length}`);
          
          if (filteredRecords.length > 0) {
            console.log(`Debug - API route: Encontradas ${filteredRecords.length} actividades.`);
            console.log('Debug - API route: Ejemplo de primer registro encontrado:');
            console.log('Fecha Format:', filteredRecords[0].fields['Fecha Format']);
            console.log('Empleados:', filteredRecords[0].fields['Empleados']);
          } else {
            console.log(`Debug - API route: No se encontraron actividades para empleado ${empleadoId} en mes ${mesFormateado}/${year}`);
          }
          
          return NextResponse.json({ records: filteredRecords });
        } catch (error) {
          console.error('Debug - Error detallado al obtener calendario de empleado:', error);
          logger.error('Error al obtener calendario de empleado:', error);
          return NextResponse.json(
            { error: 'Error al obtener calendario de empleado' },
            { status: 500 }
          );
        }
      }

      case 'obtenerTienda': {
        const recordId = searchParams.get('recordId');
        if (!recordId) {
          return NextResponse.json(
            { error: 'Se requiere el parámetro "recordId"' },
            { status: 400 }
          );
        }
        
        console.log(`Debug - API route: Obteniendo tienda con ID: ${recordId}`);
        
        try {
          const record = await airtable(tiendaSupervisorTableId).find(recordId);
          console.log('Debug - API route: Tienda encontrada con éxito');
          return NextResponse.json({ record });
        } catch (error) {
          console.error('Debug - Error detallado al obtener tienda:', error);
          logger.error('Error al obtener datos de tienda:', error);
          return NextResponse.json(
            { error: 'Error al obtener datos de tienda' },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: `Acción no soportada: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Debug - Error general en API route:', error);
    logger.error('Error en API de Airtable:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Manejador de peticiones POST para Airtable
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Debug - API route: Recibida petición POST');
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Se requiere el campo "action"' },
        { status: 400 }
      );
    }

    console.log(`Debug - API route: Acción POST solicitada: ${action}`);

    switch (action) {
      case 'actualizarActividad': {
        const { actividadId, campos } = body;
        if (!actividadId || !campos) {
          return NextResponse.json(
            { error: 'Se requieren los campos "actividadId" y "campos"' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Actualizando actividad con ID: ${actividadId}`);

        try {
          // Actualizar directamente con los campos sin el wrapper 'fields'
          const updatedRecord = await airtable(actividadDiariaTableId)
            .update(actividadId, campos);
          
          console.log('Debug - API route: Actividad actualizada con éxito');
          return NextResponse.json(updatedRecord);
        } catch (error) {
          console.error('Debug - Error detallado al actualizar actividad:', error);
          logger.error('Error al actualizar actividad:', error);
          return NextResponse.json(
            { error: 'Error al actualizar actividad' },
            { status: 500 }
          );
        }
      }

      case 'agregarVacante': {
        const { tiendaId, tipoJornada, horasContrato } = body;
        
        if (!tiendaId || !tipoJornada) {
          return NextResponse.json(
            { error: 'Se requieren los campos "tiendaId" y "tipoJornada"' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Agregando vacante para tienda: ${tiendaId}, tipo: ${tipoJornada}`);

        // Determinar las horas según el tipo de jornada si no se provee
        let horas = horasContrato;
        if (!horas) {
          switch (tipoJornada) {
            case 'Tiempo Completo':
              horas = 40;
              break;
            case 'Medio Tiempo':
              horas = 30;
              break;
            case 'Temporal':
              horas = 20;
              break;
            default:
              horas = 40;
          }
        }

        try {
          // Crear la vacante (empleado con status Pendiente)
          const newRecord = await airtable(empleadosTableId).create({
            Nombre: 'VACANTE',
            Apellidos: 'VACANTE',
            CodigoEmpleado: 'VACANTE',
            'Status Empleado': 'Pendiente',
            'Tipo de Jornada': tipoJornada,
            'Horas Semanales': horas,
            'Tienda [Link]': [tiendaId]
          });
          
          console.log('Debug - API route: Vacante creada con éxito');
          return NextResponse.json(newRecord);
        } catch (error) {
          console.error('Debug - Error detallado al agregar vacante:', error);
          logger.error('Error al agregar vacante:', error);
          return NextResponse.json(
            { error: 'Error al agregar vacante' },
            { status: 500 }
          );
        }
      }

      case 'asignarEmpleado': {
        const { vacanteId, datosEmpleado } = body;
        
        if (!vacanteId || !datosEmpleado) {
          return NextResponse.json(
            { error: 'Se requieren los campos "vacanteId" y "datosEmpleado"' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Asignando empleado a vacante con ID: ${vacanteId}`);
        console.log('Debug - API route: Datos del empleado:', datosEmpleado);

        try {
          // Actualizar la vacante con los datos del empleado
          const updatedRecord = await airtable(empleadosTableId).update(vacanteId, {
            Nombre: datosEmpleado.Nombre,
            Apellidos: datosEmpleado.Apellidos,
            CodigoEmpleado: datosEmpleado.CodigoEmpleado,
            'Status Empleado': datosEmpleado['Status Empleado'] || 'Activo',
            'Perfil': datosEmpleado.Perfil || 'Vendedor'
          });
          
          console.log('Debug - API route: Empleado asignado a vacante con éxito');
          return NextResponse.json(updatedRecord);
        } catch (error) {
          console.error('Debug - Error detallado al asignar empleado a vacante:', error);
          logger.error('Error al asignar empleado a vacante:', error);
          return NextResponse.json(
            { error: 'Error al asignar empleado a vacante' },
            { status: 500 }
          );
        }
      }

      case 'eliminarVacante': {
        const { vacanteId } = body;
        
        if (!vacanteId) {
          return NextResponse.json(
            { error: 'Se requiere el campo "vacanteId"' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Eliminando vacante con ID: ${vacanteId}`);

        try {
          await airtable(empleadosTableId).destroy(vacanteId);
          console.log('Debug - API route: Vacante eliminada con éxito');
          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Debug - Error detallado al eliminar vacante:', error);
          logger.error('Error al eliminar vacante:', error);
          return NextResponse.json(
            { error: 'Error al eliminar vacante' },
            { status: 500 }
          );
        }
      }

      case 'actualizarCampo': {
        const { recordId, tableName, fields } = body;
        
        if (!recordId || !tableName || !fields) {
          return NextResponse.json(
            { error: 'Se requieren los campos "recordId", "tableName" y "fields"' },
            { status: 400 }
          );
        }

        try {
          // Determinar el ID de la tabla según el nombre
          let tableId: string;
          switch (tableName) {
            case 'tiendaSupervisor':
              tableId = tiendaSupervisorTableId;
              break;
            case 'empleados':
              tableId = empleadosTableId;
              break;
            case 'actividadDiaria':
              tableId = actividadDiariaTableId;
              break;
            case 'semanasLaborales':
              tableId = semanasLaboralesTableId;
              break;
            case 'diasLaborales':
              tableId = diasLaboralesTableId;
              break;
            default:
              return NextResponse.json(
                { error: `Tabla no soportada: ${tableName}` },
                { status: 400 }
              );
          }

          // Actualizar el registro
          const updatedRecord = await airtable(tableId).update(recordId, fields);
          
          return NextResponse.json({ 
            success: true, 
            record: updatedRecord 
          });
        } catch (error) {
          console.error('Error al actualizar campo:', error);
          logger.error('Error al actualizar campo:', error);
          return NextResponse.json(
            { error: 'Error al actualizar el campo' },
            { status: 500 }
          );
        }
      }

      case 'generarActividades': {
        const { empleadoId, semanasIds, tiendaId } = body;
        
        if (!empleadoId || !semanasIds || !Array.isArray(semanasIds) || semanasIds.length === 0 || !tiendaId) {
          return NextResponse.json(
            { error: 'Se requieren los campos "empleadoId", "tiendaId" y "semanasIds" (array no vacío)' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Generando actividades para empleado: ${empleadoId}, semanas: ${semanasIds.length}`);

        try {
          // IDs de las tablas necesarias
          const actividadSemanalTableId = 'tblrrsQqHdJOF6xdy'; // Tabla de actividad semanal
          const diasLaboralesTableId = 'tblZHaVWLq5KKEmgW';    // Tabla de días laborales
          const actividadDiariaTableId = 'tblbkzixVwxZ8oVqb';  // Tabla de actividad diaria
          
          // Resultados para reportar
          const resultados = {
            actividadesSemanales: 0,
            actividadesDiarias: 0,
            errores: [] as string[]
          };
          
          // 1. Procesar cada semana secuencialmente
          for (const semanaId of semanasIds) {
            console.log(`Debug - API route: Procesando semana: ${semanaId}`);
            
            try {
              // 1.1 Crear registro de actividad semanal
              const actividadSemanal = await airtable(actividadSemanalTableId).create({
                'Empleados': [empleadoId],
                'Semanas Laborales': [semanaId]
              });
              
              resultados.actividadesSemanales++;
              console.log(`Debug - API route: Actividad semanal creada: ${actividadSemanal.id}`);
              
              // 1.2 Obtener la semana laboral para acceder a sus días laborales
              const semanaLaboral = await airtable('tblY4azExiLi7dbcw').find(semanaId);
              
              // Verificar si la semana tiene días laborales
              const diasLaboralesIds = semanaLaboral.fields['Dias Laborales'] || [];
              
              console.log(`Debug - API route: Días laborales encontrados en la semana: ${Array.isArray(diasLaboralesIds) ? diasLaboralesIds.length : 0}`);
              
              // 1.3 Crear actividades diarias para cada día laboral
              if (Array.isArray(diasLaboralesIds) && diasLaboralesIds.length > 0) {
                for (const diaLaboralId of diasLaboralesIds) {
                  try {
                    const actividadDiaria = await airtable(actividadDiariaTableId).create({
                      'Empleados': [empleadoId],
                      'Fecha': [diaLaboralId],
                      'Actividad Semanal': [actividadSemanal.id],
                      'Tienda y Supervisor': [tiendaId]
                    });
                    
                    resultados.actividadesDiarias++;
                    console.log(`Debug - API route: Actividad diaria creada: ${actividadDiaria.id}`);
                  } catch (errorDia) {
                    console.error(`Error al crear actividad diaria para día ${diaLaboralId}:`, errorDia);
                    if (errorDia instanceof Error) {
                      resultados.errores.push(`Error en día ${diaLaboralId}: ${errorDia.message}`);
                    } else {
                      resultados.errores.push(`Error en día ${diaLaboralId}: Error desconocido`);
                    }
                  }
                }
              } else {
                console.log(`Debug - API route: La semana ${semanaId} no tiene días laborales asociados`);
              }
              
            } catch (errorSemana) {
              console.error(`Error al procesar semana ${semanaId}:`, errorSemana);
              if (errorSemana instanceof Error) {
                resultados.errores.push(`Error en semana ${semanaId}: ${errorSemana.message}`);
              } else {
                resultados.errores.push(`Error en semana ${semanaId}: Error desconocido`);
              }
            }
          }
          
          console.log(`Debug - API route: Proceso completado. Resumen: ${resultados.actividadesSemanales} actividades semanales, ${resultados.actividadesDiarias} actividades diarias, ${resultados.errores.length} errores`);
          
          return NextResponse.json({ 
            success: true,
            resultados
          });
        } catch (error) {
          console.error('Debug - Error detallado al generar actividades:', error);
          logger.error('Error al generar actividades:', error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          return NextResponse.json(
            { error: 'Error al generar actividades', detalle: errorMessage },
            { status: 500 }
          );
        }
      }

      default:
        return NextResponse.json(
          { error: `Acción POST no soportada: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Debug - Error general en API route POST:', error);
    logger.error('Error en API POST de Airtable:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función auxiliar para obtener semanas usando una fórmula
async function obtenerSemanasConFormula(formula: string): Promise<any> {
  try {
    // Usar directamente la tabla "tblY4azExiLi7dbcw" para las semanas laborales
    const tablaSemanas = 'tblY4azExiLi7dbcw';
    
    // Asegurarse de que la fórmula esté decodificada al construir el objeto
    // y que no haya errores de sintaxis al usarla con Airtable
    const formulaDecodificada = decodeURIComponent(formula);
    
    // Verificar si la fórmula es TRUE() (traer todos los registros)
    const limit = formulaDecodificada === "TRUE()" ? 100 : undefined;
    
    // Construir objeto de query para Airtable
    // Nota: No usar el campo "Semana del año" que no existe, usar "Name" en su lugar
    const queryOptions = {
      filterByFormula: formulaDecodificada,
      sort: [{ field: 'Name', direction: 'desc' as 'desc' }],
      ...(limit && { maxRecords: limit })
    };
    
    const records = await airtable(tablaSemanas)
      .select(queryOptions)
      .all();
    
    // Devolver los registros como están, sin necesidad de convertirlos
    return records;
  } catch (error) {
    console.error('Debug - Error detallado al obtener semanas laborales:', error);
    logger.error('Error al obtener semanas laborales:', error);
    throw error;
  }
}

// Función auxiliar para obtener el número de mes
function obtenerNumeroMes(mes: string): number {
  const meses: { [key: string]: number } = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };
  return meses[mes] ?? -1;
} 