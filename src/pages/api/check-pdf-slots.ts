import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';
import { generarColumnasTiempo } from '@/lib/utils';

// Configuración de Airtable
const apiKey = process.env.AIRTABLE_API_KEY || '';
const baseId = process.env.AIRTABLE_BASE_ID || '';
const tiendaSupervisorTableId = process.env.AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID || '';

// Inicializar Airtable
const airtable = new Airtable({ apiKey }).base(baseId);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Añadir encabezados CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  // Verificar método HTTP
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  
  try {
    // Obtener parámetros de la solicitud
    const { storeId, semanaId } = req.query;
    
    // Validar parámetros
    if (!storeId || !semanaId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requieren los IDs de tienda y semana' 
      });
    }
    
    console.log(`API check-pdf-slots: Verificando tienda: ${storeId}, semana: ${semanaId}`);
    
    // Obtener datos de la tienda directamente de Airtable
    try {
      const record = await airtable(tiendaSupervisorTableId).find(storeId as string);
      
      // Extraer campos de horario y asegurar que sean string
      const aperturaField = record.fields.Apertura || record.fields['Horario Apertura'];
      const cierreField = record.fields.Cierre || record.fields['Horario Cierre'];
      const paisField = record.fields.PAIS || record.fields.Pais || record.fields.País;
      
      // Convertir a string y proporcionar valores por defecto
      const apertura = typeof aperturaField === 'string' ? aperturaField : '09:00';
      const cierre = typeof cierreField === 'string' ? cierreField : '21:00';
      const pais = typeof paisField === 'string' ? paisField : '';
      
      console.log(`API check-pdf-slots: Datos para horario: Apertura=${apertura}, Cierre=${cierre}, PAIS=${pais}`);
      
      // Generar columnas de tiempo
      const slots = generarColumnasTiempo(pais, apertura, cierre);
      
      console.log(`API check-pdf-slots: Generados ${slots.length} slots de tiempo`);
      
      // Filtrar slots si es necesario (simulando lo que hace pdf-components.ts)
      let slotsFiltrados = slots;
      if (!apertura || !apertura.includes('-')) {
        const horaCierre = cierre 
          ? parseInt(cierre.split(':')[0]) 
          : 22; // Valor por defecto
        
        console.log(`API check-pdf-slots: Hora de cierre de la tienda: ${horaCierre}:00`);
        
        // Filtrar slots para excluir la hora de cierre
        slotsFiltrados = slots.filter(slot => {
          const hora = parseInt(slot.split(':')[0]);
          return hora < horaCierre;
        });
        
        console.log(`API check-pdf-slots: Slots filtrados (excluyendo hora de cierre): ${slotsFiltrados.length}`);
      } else {
        console.log(`API check-pdf-slots: Usando nuevo formato de horarios con múltiples intervalos`);
      }
      
      // Devolver la respuesta
      return res.status(200).json({
        success: true,
        tiendaId: storeId,
        semanaId: semanaId,
        horarioFields: {
          apertura,
          cierre,
          pais
        },
        slotsGenerados: slots,
        slotsFiltrados: slotsFiltrados,
        totalSlots: slots.length,
        totalSlotsFiltrados: slotsFiltrados.length
      });
      
    } catch (error: any) {
      console.error('Error al obtener datos de tienda:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener datos de la tienda',
        message: error.message
      });
    }
    
  } catch (error: any) {
    console.error('Error general:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
} 