import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Endpoint simple para verificar que el servidor está corriendo
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Devolver información básica sobre el estado del servidor
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown'
  });
} 