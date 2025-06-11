import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

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
    const { storeId } = req.query;
    
    // Validar parámetros
    if (!storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requiere el ID de la tienda' 
      });
    }
    
    console.log(`API check-horario: Verificando tienda: ${storeId}`);
    
    // Obtener datos de la tienda directamente de Airtable
    try {
      const record = await airtable(tiendaSupervisorTableId).find(storeId as string);
      
      // Extraer todos los campos relacionados con el horario
      const fieldsToCheck = [
        'Apertura',
        'Cierre',
        'Horario Apertura',
        'Horario Cierre',
        'PAIS',
        'Pais',
        'País'
      ];
      
      // Crear un objeto con los valores de los campos
      const horarioFields: Record<string, any> = {};
      
      fieldsToCheck.forEach(field => {
        if (record.fields[field] !== undefined) {
          horarioFields[field] = record.fields[field];
        }
      });
      
      // Valores calculados que serían usados por generarColumnasTiempo
      const calculatedValues = {
        apertura: record.fields.Apertura || record.fields['Horario Apertura'] || '09:00',
        cierre: record.fields.Cierre || record.fields['Horario Cierre'] || '21:00',
        pais: record.fields.PAIS || record.fields.Pais || record.fields.País || ''
      };
      
      // Devolver la respuesta
      return res.status(200).json({
        success: true,
        tiendaId: storeId,
        horarioFields,
        calculatedValues,
        allFields: record.fields
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