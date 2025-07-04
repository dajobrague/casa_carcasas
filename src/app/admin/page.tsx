'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { RefreshCw, FileText, LogOut, Database, Building, BarChart4, ChevronDown, History, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Función auxiliar para componente de carga
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Usamos la autenticación de administrador
  const { isAdminLoggedIn, loading, adminLogout } = useAuth();
  
  // Obtener vista actual de la URL o usar 'dashboard' como default
  const getInitialView = (): 'dashboard' | 'api' | 'semanal' | 'historial' | 'semanas-historicas' => {
    if (!searchParams) return 'dashboard';
    
    const view = searchParams.get('view');
    const validViews: ('dashboard' | 'api' | 'semanal' | 'historial' | 'semanas-historicas')[] = 
      ['dashboard', 'api', 'semanal', 'historial', 'semanas-historicas'];
    
    if (view && validViews.includes(view as any)) {
      return view as 'dashboard' | 'api' | 'semanal' | 'historial' | 'semanas-historicas';
    }
    return 'dashboard';
  };
  
  // Estado para contenido actual (inicializado desde URL)
  const [currentView, setCurrentView] = useState<'dashboard' | 'api' | 'semanal' | 'historial' | 'semanas-historicas'>(getInitialView());
  
  // Estado para mostrar cuál es el importador activo cuando se navega a uno
  const [activeImporter, setActiveImporter] = useState<'semanal' | null>(null);
  
  // Sincronizar vista con URL cuando cambie
  useEffect(() => {
    const newView = getInitialView();
    if (newView !== currentView) {
      setCurrentView(newView);
      if (newView === 'semanal') {
        setActiveImporter('semanal');
      } else {
        setActiveImporter(null);
      }
    }
  }, [searchParams]);

  // Protección de ruta para administradores
  useEffect(() => {
    if (!loading && !isAdminLoggedIn) {
      router.push('/admin/login');
    }
  }, [isAdminLoggedIn, loading, router]);
  
  // Función para cambiar la vista dentro del dashboard
  const changeView = (view: 'dashboard' | 'api' | 'semanal' | 'historial' | 'semanas-historicas') => {
    // Actualizar URL con la nueva vista
    const newUrl = view === 'dashboard' ? '/admin' : `/admin?view=${view}`;
    router.replace(newUrl, { scroll: false });
    
    setCurrentView(view);
    if (view === 'semanal') {
      setActiveImporter('semanal');
    } else {
      setActiveImporter(null);
    }
  };
  
  // Gestionar el cierre de sesión de admin
  const handleLogout = () => {
    adminLogout();
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAdminLoggedIn) {
    return null; // Redirecciona en useEffect
  }
  
  // Renderizar el contenido de la vista actual
  const renderContent = () => {
    switch (currentView) {
      case 'api':
        // Contenido iframe para API Sync
        return (
          <iframe 
            src="/admin/api-sync" 
            className="w-full h-[calc(100vh-9rem)]" 
            style={{ border: 'none' }}
          />
        );
      case 'semanal':
        // Contenido iframe para Importación Semanal
        return (
          <iframe 
            src="/admin/semanas-csv-import" 
            className="w-full h-[calc(100vh-9rem)]" 
            style={{ border: 'none' }}
          />
        );
      case 'historial':
        // Contenido iframe para Historial Tiendas
        return (
          <iframe 
            src="/admin/historial-tiendas" 
            className="w-full h-[calc(100vh-9rem)]" 
            style={{ border: 'none' }}
          />
        );
      case 'semanas-historicas':
        // Contenido iframe para Semanas Históricas
        return (
          <iframe 
            src="/admin/semanas-historicas" 
            className="w-full h-[calc(100vh-9rem)]" 
            style={{ border: 'none' }}
          />
        );
      case 'dashboard':
      default:
        // Contenido del dashboard principal
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => changeView('api')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-lg font-bold">API Sync</CardTitle>
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Sincronización de datos entre API LCDC y Airtable.
                </CardDescription>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => changeView('api')}
                  >
                    Acceder
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => changeView('semanal')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-lg font-bold">Importador Semanal</CardTitle>
                <BarChart4 className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Importación de datos semanales para la gestión de tiendas.
                </CardDescription>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => changeView('semanal')}
                  >
                    Acceder
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => changeView('historial')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-lg font-bold">Historial Tiendas</CardTitle>
                <History className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Gestiona el estado histórico de las tiendas en el sistema.
                </CardDescription>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => changeView('historial')}
                  >
                    Acceder
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => changeView('semanas-historicas')}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-lg font-bold">Semanas Históricas</CardTitle>
                <Calendar className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Configurar semanas de referencia del año anterior para tiendas históricas.
                </CardDescription>
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => changeView('semanas-historicas')}
                  >
                    Acceder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y título */}
            <div className="flex items-center min-w-0 flex-1">
              <div className="relative h-10 w-24 mr-3 flex-shrink-0">
                <Image 
                  src="/images/a1f5f4d1aeb6ac161feb1b4d91bda0240020897d.png" 
                  alt="Casa de las Carcasas Logo"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <div className="border-l-2 border-gray-200 pl-3 min-w-0 flex-1">
                <div className="text-gray-900 text-lg font-bold truncate">
                  {currentView === 'dashboard' ? (
                    'Administración'
                  ) : (
                    <button 
                      onClick={() => changeView('dashboard')}
                      className="hover:text-blue-600 transition-colors truncate"
                      title="Volver al panel principal"
                    >
                      Administración
                    </button>
                  )}
                </div>
                <div className="text-sm text-blue-600 font-medium truncate">
                  {currentView === 'dashboard' && 'Panel de Control'}
                  {currentView === 'api' && 'Sincronización de Datos'}
                  {currentView === 'semanal' && 'Importación de CSV'}
                  {currentView === 'historial' && 'Gestión de Estados'}
                  {currentView === 'semanas-historicas' && 'Configuración de Referencias'}
                </div>
              </div>
            </div>

            {/* Tabs para cambiar entre vistas */}
            <div className="hidden md:ml-6 md:flex md:space-x-2 lg:space-x-4 flex-shrink-0">
              <button
                onClick={() => changeView('dashboard')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'dashboard' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Database className="h-4 w-4 inline mr-1" />
                <span className="hidden lg:inline">Dashboard</span>
              </button>

              <button
                onClick={() => changeView('api')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'api' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <RefreshCw className="h-4 w-4 inline mr-1" />
                <span className="hidden lg:inline">API Sync</span>
              </button>

              <button
                onClick={() => changeView('semanal')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'semanal'
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart4 className="h-4 w-4 inline mr-1" />
                <span className="hidden lg:inline">Importador</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center ${
                      currentView === 'historial' || currentView === 'semanas-historicas'
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Building className="h-4 w-4 inline mr-1" />
                    <span className="hidden lg:inline">Tiendas</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => changeView('historial')}>
                    <History className="h-4 w-4 mr-2" />
                    Historial de Tiendas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeView('semanas-historicas')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Semanas Históricas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Botón de cerrar sesión */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 flex-shrink-0 ml-4"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden lg:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {currentView === 'dashboard' && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-gray-600 mt-1">
                Gestiona todos los aspectos de la administración desde este panel central.
              </p>
            </div>
          )}
          
          {renderContent()}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Casa de las Carcasas. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminDashboardContent />
    </Suspense>
  );
}