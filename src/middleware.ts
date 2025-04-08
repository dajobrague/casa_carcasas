import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Token fijo para el bypass de autenticación - Debería coincidir con el de RouteGuard
const BYPASS_TOKEN = 'cc_access_token';

export function middleware(request: NextRequest) {
  // Obtener la ruta actual
  const path = request.nextUrl.pathname;
  
  // Rutas públicas permitidas sin autenticación
  const isPublicRoute = 
    path === '/login' || 
    path === '/admin/login' || 
    path === '/' || 
    path.startsWith('/view/');
  
  // Rutas de administrador
  const isAdminRoute = path.startsWith('/admin');
  
  // Rutas protegidas de usuario normal que requieren autenticación
  const isProtectedUserRoute = 
    path === '/tienda' || 
    path.startsWith('/tienda/') ||
    path === '/editor' || 
    path.startsWith('/editor/') ||
    path === '/gestor-mensual' || 
    path.startsWith('/gestor-mensual/') ||
    path === '/tienda-horarios' || 
    path.startsWith('/tienda-horarios/') ||
    path === '/calendario' || 
    path.startsWith('/calendario/');
  
  // Verificar si hay un token válido de bypass para tienda
  const { searchParams } = request.nextUrl;
  const bypassToken = searchParams.get('token');
  const storeId = searchParams.get('id');
  const hasValidBypass = bypassToken === BYPASS_TOKEN && storeId;
  
  // Obtener el estado de autenticación de admin desde cookies
  const adminAuth = request.cookies.get('adminAuth')?.value;
  const isAdminAuthenticated = !!adminAuth;
  
  // Rutas públicas siempre están permitidas
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Redireccionar si es ruta admin y el usuario no está autenticado como admin
  if (isAdminRoute && !isAdminAuthenticated) {
    const redirectUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Si es una ruta protegida de usuario y tiene token válido de bypass, permitir acceso
  if (isProtectedUserRoute && hasValidBypass) {
    return NextResponse.next();
  }
  
  // Para cualquier otra ruta que no sea pública ni de admin, redireccionar a /tienda
  // La autenticación se manejará en el componente RouteGuard si es necesario
  if (!isPublicRoute && !isAdminRoute) {
    const redirectUrl = new URL('/tienda', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Si ninguna condición se cumple, continuar con la solicitud
  return NextResponse.next();
}

// Configurar las rutas a las que se aplica el middleware
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
}; 