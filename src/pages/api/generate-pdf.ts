import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { storeId, semanaId } = req.query;
    
    if (!storeId || !semanaId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requieren storeId y semanaId' 
      });
    }
    
    // Si estamos en dev, siempre redirigir a la página para facilitar el desarrollo
    if (process.env.NODE_ENV === 'development') {
      return res.redirect(307, `/pdf/${storeId}/${semanaId}`);
    }
    
    // En producción, intentaríamos generar el PDF directamente aquí usando
    // un enfoque diferente, como llamar a un servicio externo o utilizar
    // puppeteer para renderizar la página HTML a PDF
    
    // Por ahora, redirigimos a la página del visor que proporciona la opción de descarga
    res.redirect(307, `/pdf/${storeId}/${semanaId}`);
    
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Error desconocido al generar PDF'
    });
  }
} 