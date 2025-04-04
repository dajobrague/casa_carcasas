import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Obtener la ruta actual
  const path = request.nextUrl.pathname;
  
  // Verificar si la ruta está protegida
  const isProtectedRoute = path === '/admin/api-sync' || path.startsWith('/admin/api-sync/');
  
  // No proteger la ruta de login de admin
  const isLoginPage = path === '/admin/login';
  
  // Obtener el estado de autenticación de admin desde sessionStorage
  const adminAuth = request.cookies.get('adminAuth')?.value;
  const isAdminAuthenticated = !!adminAuth;
  
  // Redireccionar si la ruta está protegida y el usuario no está autenticado
  if (isProtectedRoute && !isAdminAuthenticated) {
    // Construir la URL de redirección
    const redirectUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Redireccionar si el usuario ya está autenticado y va a la página de login
  if (isLoginPage && isAdminAuthenticated) {
    const redirectUrl = new URL('/admin/api-sync', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Si ninguna condición se cumple, continuar con la solicitud
  return NextResponse.next();
}

// Configurar las rutas a las que se aplica el middleware
export const config = {
  matcher: ['/admin/api-sync', '/admin/api-sync/:path*', '/admin/login'],
}; 