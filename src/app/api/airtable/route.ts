import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import Airtable from 'airtable';

// Marcar la ruta como dinámica explícitamente
export const dynamic = 'force-dynamic';

// Configuración de Airtable (variables de entorno seguras, sin NEXT_PUBLIC_)
const apiKey = process.env.AIRTABLE_API_KEY || '';
const baseId = process.env.AIRTABLE_BASE_ID || '';
const semanasLaboralesTableId = process.env.AIRTABLE_SEMANAS_LABORALES_TABLE_ID || '';
const tiendaSupervisorTableId = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID || '';
const actividadDiariaTableId = process.env.AIRTABLE_ACTIVIDAD_DIARIA_TABLE_ID || '';
const diasLaboralesTableId = process.env.AIRTABLE_DIAS_LABORALES_TABLE_ID || '';

// Logs de depuración para variables de entorno
console.log('Debug - Airtable API vars loaded:', {
  apiKeyLength: apiKey?.length || 0,
  baseId,
  tablesIds: {
    semanasLaborales: semanasLaboralesTableId,
    tiendaSupervisor: tiendaSupervisorTableId,
    actividadDiaria: actividadDiariaTableId,
    diasLaborales: diasLaboralesTableId
  }
});

// Inicializar Airtable
Airtable.configure({ apiKey });
const base = Airtable.base(baseId);

// Tablas
const semanasLaboralesTable = base(semanasLaboralesTableId);
const tiendaSupervisorTable = base(tiendaSupervisorTableId);
const actividadDiariaTable = base(actividadDiariaTableId);
const diasLaboralesTable = base(diasLaboralesTableId);

// Función auxiliar para obtener el número de mes (0-11)
function obtenerNumeroMes(nombreMes: string): number {
  const meses: Record<string, number> = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };
  return meses[nombreMes.split(' ')[0].toLowerCase()] || 0;
}

/**
 * Manejador de peticiones GET para Airtable
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Debug - API route: Recibida petición GET');
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro "action"' },
        { status: 400 }
      );
    }

    console.log(`Debug - API route: Acción solicitada: ${action}`);

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
        
        console.log(`Debug - API route: Obteniendo tienda con ID: ${storeId}`);
        
        try {
          const record = await tiendaSupervisorTable.find(storeId);
          console.log('Debug - API route: Tienda encontrada con éxito');
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

        console.log(`Debug - API route: Obteniendo actividades para tienda: ${storeId}, día: ${diaId}`);

        try {
          const records = await actividadDiariaTable
            .select({
              filterByFormula: `AND(
                {record_Id (from Tienda y Supervisor)}='${storeId}',
                {recordId (from Fecha)}='${diaId}'
              )`,
            })
            .all();
            
          console.log(`Debug - API route: Actividades encontradas: ${records.length}`);
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
          // Para campos de enlace múltiple, es mejor usar la función SEARCH
          const records = await diasLaboralesTable
            .select({
              filterByFormula: `NOT({Semanas Laborales} = '')`,
            })
            .all();
            
          console.log(`Debug - API route: Todos los días laborales encontrados: ${records.length}`);
          
          // Filtramos manualmente los registros que contienen el ID de la semana
          const filteredRecords = records.filter(record => {
            const semanasIds = record.fields['Semanas Laborales'] || [];
            return Array.isArray(semanasIds) && semanasIds.includes(semanaId);
          });
          
          console.log(`Debug - API route: Días laborales filtrados para semana ${semanaId}: ${filteredRecords.length}`);
          
          return NextResponse.json({ records: filteredRecords });
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
          const record = await diasLaboralesTable.find(diaId);
          console.log('Debug - API route: Día laboral encontrado con éxito');
          return NextResponse.json(record);
        } catch (error) {
          console.error('Debug - Error detallado al obtener día laboral:', error);
          logger.error('Error al obtener día laboral por ID:', error);
          return NextResponse.json(
            { error: 'Error al obtener día laboral por ID' },
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

        console.log(`Debug - API route: Obteniendo semana con ID: ${semanaId}`);

        try {
          const record = await semanasLaboralesTable.find(semanaId);
          console.log('Debug - API route: Semana encontrada con éxito');
          return NextResponse.json(record);
        } catch (error) {
          console.error('Debug - Error detallado al obtener semana:', error);
          logger.error('Error al obtener datos de semana:', error);
          return NextResponse.json(
            { error: 'Error al obtener datos de semana' },
            { status: 500 }
          );
        }
      }

      case 'obtenerSemanasLaborales': {
        const mes = searchParams.get('mes');
        const año = searchParams.get('año');
        
        if (!mes || !año) {
          return NextResponse.json(
            { error: 'Se requieren los parámetros "mes" y "año"' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Obteniendo semanas laborales para ${mes} ${año}`);

        try {
          // Si mes es 'all', obtener todas las semanas del año sin filtrar por mes
          const obtenerTodasLasSemanas = mes.toLowerCase() === 'all';
          // Si año es 'all', obtener semanas de todos los años
          const obtenerTodosLosAños = año.toLowerCase() === 'all';
          
          // Convertir mes a número para filtrar
          const mesNum = obtenerTodasLasSemanas ? -1 : obtenerNumeroMes(mes.toLowerCase());
          console.log(`Debug - Mes: ${mes}, mesNum: ${mesNum}, obtenerTodasLasSemanas: ${obtenerTodasLasSemanas}, obtenerTodosLosAños: ${obtenerTodosLosAños}`);
          
          // Configurar el filtro de Airtable basado en si queremos todos los años o un año específico
          let filterByFormula = obtenerTodosLosAños ? '' : `{Year}="${año}"`;
          
          // Obtener las semanas
          const records = await semanasLaboralesTable
            .select({
              ...(filterByFormula ? { filterByFormula } : {})
            })
            .all();
          
          console.log(`Debug - Total semanas encontradas${obtenerTodosLosAños ? ' (todos los años)' : ` para año ${año}`}: ${records.length}`);
          
          // Si queremos todas las semanas (de un año o de todos los años), devolverlas directamente
          if (obtenerTodasLasSemanas) {
            console.log(`Debug - Devolviendo todas las semanas${obtenerTodosLosAños ? ' de todos los años' : ` del año ${año}`}: ${records.length}`);
            
            // Ordenar por fecha de inicio (crear una copia del array ya que records podría ser de solo lectura)
            const recordsOrdenados = [...records].sort((a: any, b: any) => {
              const fechaInicioStrA = String(a.fields['Fecha de Inicio'] || '');
              const fechaInicioStrB = String(b.fields['Fecha de Inicio'] || '');
              
              const fechaA = new Date(fechaInicioStrA);
              const fechaB = new Date(fechaInicioStrB);
              
              // Si alguna fecha es inválida, ponerla al final
              if (isNaN(fechaA.getTime())) return 1;
              if (isNaN(fechaB.getTime())) return -1;
              
              return fechaA.getTime() - fechaB.getTime();
            });
            
            return NextResponse.json({ records: recordsOrdenados });
          }
          
          // Filtrar las semanas que pertenecen al mes especificado
          const semanasDelMes = records.filter(record => {
            if (!record.fields['Fecha de Inicio'] || !record.fields['Fecha de fin']) {
              console.log(`Debug - Semana sin fechas: ${record.id}`);
              return false;
            }
            
            // Asegurar que estamos trabajando con strings antes de convertir a Date
            const fechaInicioStr = String(record.fields['Fecha de Inicio'] || '');
            const fechaFinStr = String(record.fields['Fecha de fin'] || '');
            
            if (!fechaInicioStr || !fechaFinStr) {
              console.log(`Debug - Semana con fechas inválidas: ${record.id}`);
              return false;
            }
            
            const fechaInicio = new Date(fechaInicioStr);
            const fechaFin = new Date(fechaFinStr);
            
            // Verificar que las fechas sean válidas
            if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
              console.log(`Debug - Semana con fechas no numéricas: ${record.id}`);
              return false;
            }
            
            const mesInicio = fechaInicio.getMonth();
            const mesFin = fechaFin.getMonth();
            
            console.log(`Debug - Semana: ${record.fields.Name}, mesInicio: ${mesInicio}, mesFin: ${mesFin}, mesNum: ${mesNum}`);
            
            // Una semana pertenece al mes si:
            // - El mes está entre el mes de inicio y el mes de fin
            // - O si el mes de inicio es igual al mes actual
            // - O si el mes de fin es igual al mes actual
            const pertenece = (mesNum >= mesInicio && mesNum <= mesFin) || 
                             mesInicio === mesNum || 
                             mesFin === mesNum;
                             
            console.log(`Debug - Semana ${record.fields.Name} ${pertenece ? 'pertenece' : 'no pertenece'} al mes ${mes} (${mesNum})`);
            
            return pertenece;
          });

          // Ordenar por fecha de inicio
          semanasDelMes.sort((a, b) => {
            // Asegurar que estamos trabajando con strings antes de convertir a Date
            const fechaInicioStrA = String(a.fields['Fecha de Inicio'] || '');
            const fechaInicioStrB = String(b.fields['Fecha de Inicio'] || '');
            
            const fechaA = new Date(fechaInicioStrA);
            const fechaB = new Date(fechaInicioStrB);
            
            // Si alguna fecha es inválida, ponerla al final
            if (isNaN(fechaA.getTime())) return 1;
            if (isNaN(fechaB.getTime())) return -1;
            
            return fechaA.getTime() - fechaB.getTime();
          });
            
          console.log(`Debug - API route: Semanas laborales encontradas para mes ${mes}: ${semanasDelMes.length}`);
          return NextResponse.json({ records: semanasDelMes });
        } catch (error) {
          console.error('Debug - Error detallado al obtener semanas laborales:', error);
          logger.error('Error al obtener semanas laborales:', error);
          return NextResponse.json(
            { error: 'Error al obtener semanas laborales' },
            { status: 500 }
          );
        }
      }

      case 'verificarConexion': {
        console.log('Debug - API route: Verificando conexión a Airtable');
        
        try {
          // Intentar obtener un registro de cualquier tabla para verificar que las credenciales son válidas
          const records = await semanasLaboralesTable
            .select({
              maxRecords: 1
            })
            .all();
          
          console.log('Debug - API route: Conexión a Airtable exitosa');
          return NextResponse.json({ connected: true });
        } catch (error) {
          console.error('Debug - Error detallado al verificar conexión:', error);
          logger.error('Error al verificar conexión con Airtable:', error);
          return NextResponse.json({ connected: false }, { status: 200 });
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
    const { action, actividadId, campos } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Se requiere el campo "action"' },
        { status: 400 }
      );
    }

    console.log(`Debug - API route: Acción POST solicitada: ${action}`);

    switch (action) {
      case 'actualizarActividad': {
        if (!actividadId || !campos) {
          return NextResponse.json(
            { error: 'Se requieren los campos "actividadId" y "campos"' },
            { status: 400 }
          );
        }

        console.log(`Debug - API route: Actualizando actividad con ID: ${actividadId}`);

        try {
          const updatedRecord = await actividadDiariaTable.update(actividadId, campos);
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