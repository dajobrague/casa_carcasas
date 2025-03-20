import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint para generar un PDF con los datos de una semana laboral
 * Este endpoint funcionará en el servidor para evitar problemas de carga de chunks
 */
export const dynamic = 'force-dynamic'; // Marcar la ruta como dinámica

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const semanaId = searchParams.get('semanaId');
    const storeId = searchParams.get('storeId');
    
    // Validar parámetros
    if (!semanaId || !storeId) {
      return NextResponse.json(
        { error: 'Se requieren los parámetros "semanaId" y "storeId"' },
        { status: 400 }
      );
    }
    
    console.log(`API PDF: Generando PDF para semana ${semanaId} y tienda ${storeId}`);
    
    try {
      // En lugar de usar request.url, usamos rutas relativas o absolutas según el entorno
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_BASE_URL || 'https://casa-carcasas.vercel.app'
        : 'http://localhost:3000';
      
      console.log('API PDF: URL base:', baseUrl);
      
      // Obtener datos de la tienda
      console.log('API PDF: Obteniendo datos de la tienda...');
      const tiendaUrl = `${baseUrl}/api/airtable?action=obtenerDatosTienda&storeId=${storeId}`;
      console.log('API PDF: URL de tienda:', tiendaUrl);
      
      const tiendaResponse = await fetch(tiendaUrl);
      
      if (!tiendaResponse.ok) {
        const errorText = await tiendaResponse.text();
        console.error('Error al obtener datos de tienda:', errorText);
        return NextResponse.json(
          { error: `Error al obtener datos de tienda: ${tiendaResponse.status} ${tiendaResponse.statusText}` },
          { status: 500 }
        );
      }
      
      const tiendaData = await tiendaResponse.json();
      console.log('API PDF: Datos de tienda obtenidos correctamente');
      
      // Obtener datos de la semana
      console.log('API PDF: Obteniendo datos de la semana...');
      const semanaUrl = `${baseUrl}/api/airtable?action=obtenerSemanaPorId&semanaId=${semanaId}`;
      console.log('API PDF: URL de semana:', semanaUrl);
      
      const semanaResponse = await fetch(semanaUrl);
      
      if (!semanaResponse.ok) {
        const errorText = await semanaResponse.text();
        console.error('Error al obtener datos de la semana:', errorText);
        return NextResponse.json(
          { error: `Error al obtener datos de la semana: ${semanaResponse.status} ${semanaResponse.statusText}` },
          { status: 500 }
        );
      }
      
      const semanaData = await semanaResponse.json();
      console.log('API PDF: Datos de semana obtenidos correctamente');
      
      // Obtener días laborales para esta semana
      console.log('API PDF: Obteniendo días laborales...');
      const diasUrl = `${baseUrl}/api/airtable?action=obtenerDiasLaboralesSemana&semanaId=${semanaId}`;
      console.log('API PDF: URL de días laborales:', diasUrl);
      
      const diasResponse = await fetch(diasUrl);
      
      if (!diasResponse.ok) {
        const errorText = await diasResponse.text();
        console.error('Error al obtener días laborales:', errorText);
        return NextResponse.json(
          { error: `Error al obtener días laborales: ${diasResponse.status} ${diasResponse.statusText}` },
          { status: 500 }
        );
      }
      
      const diasResponse2 = await diasResponse.json();
      const diasLaborales = diasResponse2.records || [];
      console.log(`API PDF: Se encontraron ${diasLaborales.length} días laborales`);
      
      if (!diasLaborales.length) {
        return NextResponse.json(
          { error: 'No se encontraron días laborales para esta semana' },
          { status: 404 }
        );
      }
      
      // Recopilar todas las actividades para los días laborales
      console.log('API PDF: Obteniendo actividades por día...');
      const actividadesPorDia: Record<string, any[]> = {};
      
      for (const dia of diasLaborales) {
        const actividadesUrl = `${baseUrl}/api/airtable?action=obtenerActividadesDiarias&storeId=${storeId}&diaId=${dia.id}`;
        console.log(`API PDF: Obteniendo actividades para el día ${dia.id} - URL:`, actividadesUrl);
        
        const actividadesResponse = await fetch(actividadesUrl);
        
        if (!actividadesResponse.ok) {
          const errorText = await actividadesResponse.text();
          console.error(`Error al obtener actividades para día ${dia.id}:`, errorText);
          continue;
        }
        
        const actividadesData = await actividadesResponse.json();
        actividadesPorDia[dia.id] = actividadesData.records || [];
        console.log(`API PDF: Se encontraron ${actividadesData.records?.length || 0} actividades para el día ${dia.id}`);
      }
      
      // Aquí iría la generación del PDF en el servidor, para este MVP vamos a devolver los datos
      // que se usarían para generar el PDF y permitir que el cliente lo haga
      
      // Datos para generar el PDF
      const pdfData = {
        tienda: tiendaData,
        semana: semanaData,
        diasLaborales,
        actividadesPorDia
      };
      
      console.log('API PDF: Datos para generar PDF listos');
      
      // En una implementación real, aquí utilizaríamos una biblioteca como PDFKit
      // para generar un PDF real en el servidor y devolverlo como un blob
      
      return NextResponse.json(pdfData);
    
    } catch (innerError) {
      console.error('Error interno en la generación de PDF:', innerError);
      return NextResponse.json(
        { error: `Error interno: ${innerError instanceof Error ? innerError.message : 'Error desconocido'}` },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return NextResponse.json(
      { error: `Error al generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    );
  }
} 