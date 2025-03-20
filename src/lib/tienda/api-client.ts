import { TiendaCompleta } from './types';
import logger from '@/lib/logger';

/**
 * Obtiene la URL base para las peticiones API
 * Funciona tanto en cliente como en servidor
 */
function getBaseUrl() {
  // En el servidor, usamos la URL absoluta
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }
  // En el cliente, usamos la URL relativa
  return '';
}

/**
 * Obtiene los datos completos de una tienda desde Airtable
 * @param storeId ID de la tienda en Airtable
 * @returns Datos completos de la tienda
 * @throws Error si no se puede obtener la tienda
 */
export async function obtenerDatosTienda(storeId: string): Promise<TiendaCompleta> {
  try {
    console.log(`Obteniendo datos de tienda con ID: ${storeId}`);
    
    // Realizar petición al endpoint de Airtable con URL base adaptativa
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/airtable?action=obtenerDatosTienda&storeId=${storeId}`;
    console.log(`Consultando API: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al obtener datos de tienda: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.fields) {
      throw new Error('Datos de tienda no válidos o vacíos');
    }
    
    console.log(`Datos de tienda obtenidos con éxito: ${data.fields['TIENDA'] || data.fields.Name || 'Sin nombre'}`);
    
    // Extraer el número de tienda, campo "N°" en Airtable
    // Asegurar que sea un número entero
    let numeroTienda = 0;
    if (data.fields['N°'] !== undefined) {
      numeroTienda = parseInt(String(data.fields['N°']));
      if (isNaN(numeroTienda)) {
        console.warn(`Número de tienda no válido: ${data.fields['N°']}`);
        numeroTienda = 0;
      }
    } else if (data.fields['Tienda Numero'] !== undefined) {
      // Campo alternativo que podría contener el número
      numeroTienda = parseInt(String(data.fields['Tienda Numero']));
      if (isNaN(numeroTienda)) {
        console.warn(`Número de tienda no válido: ${data.fields['Tienda Numero']}`);
        numeroTienda = 0;
      }
    }
    
    console.log(`Número de tienda obtenido: ${numeroTienda}`);
    
    // Mapear respuesta de Airtable a nuestro modelo de datos
    const tienda: TiendaCompleta = {
      id: data.id,
      nombre: data.fields['TIENDA'] || data.fields.Name || 'Sin nombre',
      codigo: data.fields['Codigo Tienda'] || 'Sin código',
      numero: numeroTienda,
      atencionDeseada: parseFloat(data.fields['Atención Deseada'] || data.fields['Atencion Deseada'] || '25'),
      factorCrecimiento: parseFloat(data.fields['Crecimiento'] || '0'), // Valor ya viene como decimal (0.XX)
      supervisor: data.fields['Supervisor'] || 'Sin supervisor',
      direccion: data.fields['Direccion'],
      telefono: data.fields['Telefono'],
      email: data.fields['Email'],
      horarioApertura: data.fields['Horario Apertura'] || data.fields['Apertura'] || '09:00',
      horarioCierre: data.fields['Horario Cierre'] || data.fields['Cierre'] || '21:00',
      ubicacion: {
        ciudad: data.fields['Ciudad'] || '',
        estado: data.fields['Estado'] || ''
      },
      metadatos: {
        numeroEmpleados: data.fields['Numero Empleados'] || data.fields['Empleados en tienda'] || 0,
        fechaCreacion: data.fields['Fecha Creacion'] || '',
        ultimaActualizacion: data.createdTime || ''
      }
    };
    
    return tienda;
    
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    logger.error(`Error al obtener datos de tienda: ${mensaje}`);
    throw new Error(`No se pudo obtener la información de la tienda: ${mensaje}`);
  }
} 