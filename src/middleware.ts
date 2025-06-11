import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Token fijo para el bypass de autenticación - Debería coincidir con el de RouteGuard
const BYPASS_TOKEN = 'cc_access_token';

export function middleware(request: NextRequest) {
  // Obtener la ruta actual
  const path = request.nextUrl.pathname;
  
  // Verificar si la ruta está protegida
  const isProtectedAdminRoute = path.startsWith('/admin/') && path !== '/admin/login';
  const isProtectedTiendaRoute = path === '/tienda' || path.startsWith('/tienda/') || 
                              path === '/gestor-mensual' || path.startsWith('/gestor-mensual/');
  
  // No proteger las rutas de login
  const isAdminLoginPage = path === '/admin/login';
  const isLoginPage = path === '/login';
  
  // Obtener los parámetros de búsqueda para comprobar token de bypass
  const { searchParams } = request.nextUrl;
  const bypassToken = searchParams.get('token');
  const storeId = searchParams.get('id');
  
  // Verificar si hay un token válido de bypass
  const hasValidBypass = bypassToken === BYPASS_TOKEN && storeId;
  
  // Obtener el estado de autenticación de admin desde cookies
  const adminAuth = request.cookies.get('adminAuth')?.value;
  const isAdminAuthenticated = !!adminAuth;
  
  // Obtener el estado de autenticación de tienda desde cookies o sessionStorage no es posible en middleware
  // Este estado se maneja en el RouteGuard para las rutas de tienda
  
  // Redireccionar si es ruta admin protegida y el usuario no está autenticado
  if (isProtectedAdminRoute && !isAdminAuthenticated) {
    // Construir la URL de redirección
    const redirectUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Redireccionar si el usuario admin ya está autenticado y va a la página de login
  if (isAdminLoginPage && isAdminAuthenticated) {
    const redirectUrl = new URL('/admin', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Si es una ruta de tienda protegida pero tiene token válido de bypass, permitir acceso
  if (isProtectedTiendaRoute && hasValidBypass) {
    console.log('Bypass de autenticación aplicado para ruta de tienda');
    return NextResponse.next();
  }
  
  // Si ninguna condición se cumple, continuar con la solicitud
  return NextResponse.next();
}

// Configurar las rutas a las que se aplica el middleware
export const config = {
  matcher: [
    '/admin/:path*',
    '/tienda',
    '/tienda/:path*',
    '/gestor-mensual',
    '/gestor-mensual/:path*'
  ],
}; 