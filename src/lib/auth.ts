import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// Función para validar una sesión de administrador
export async function validateAdminSession(request: NextRequest): Promise<boolean> {
  try {
    // Obtener la cookie de sesión de administrador
    const adminToken = request.cookies.get('admin_session')?.value;
    
    // Si no hay token, no hay sesión válida
    if (!adminToken) {
      return false;
    }
    
    // Validar el token contra el valor esperado
    // En una implementación real, se debería verificar contra una base de datos o JWT
    const expectedToken = process.env.ADMIN_SECRET;
    
    return adminToken === expectedToken;
  } catch (error) {
    console.error('Error validando sesión de administrador:', error);
    return false;
  }
} 