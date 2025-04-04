'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, FileText, Menu, UserCircle, LogOut, Clock } from 'lucide-react';
import { useState, createContext, useContext, ReactNode } from 'react';

// Definir el contexto de navegación interna
type ViewType = 'dashboard' | 'editor' | 'gestor-mensual' | 'horarios';

interface TiendaNavigationContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const TiendaNavigationContext = createContext<TiendaNavigationContextType | undefined>(undefined);

// Hook para usar el contexto
export function useTiendaNavigation() {
  const context = useContext(TiendaNavigationContext);
  if (context === undefined) {
    throw new Error('useTiendaNavigation debe usarse dentro de un TiendaNavigationProvider');
  }
  return context;
}

export default function TiendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { storeName, storeNumber, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const navigateTo = (view: ViewType) => {
    setCurrentView(view);
    setMenuOpen(false);
  };

  return (
    <RouteGuard>
      <TiendaNavigationContext.Provider value={{ currentView, setCurrentView }}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Header */}
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                {/* Logo y nombre de tienda */}
                <div className="flex items-center">
                  <button onClick={() => navigateTo('dashboard')} className="flex items-center">
                    <div className="relative h-10 w-24 mr-3">
                      <Image 
                        src="/images/a1f5f4d1aeb6ac161feb1b4d91bda0240020897d.png" 
                        alt="Casa de las Carcasas Logo"
                        fill
                        style={{ objectFit: 'contain' }}
                        priority
                      />
                    </div>
                    <div className="hidden md:block border-l-2 border-gray-200 pl-3">
                      <div className="text-gray-900 text-lg font-bold">{storeName || 'Tienda'}</div>
                      <div className="text-sm text-blue-600 font-medium">Tienda #{storeNumber}</div>
                    </div>
                  </button>
                </div>

                {/* Menú de navegación escritorio */}
                <nav className="hidden md:flex space-x-4">
                  <button 
                    onClick={() => navigateTo('dashboard')} 
                    className={`text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                      currentView === 'dashboard' ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    <UserCircle className="w-4 h-4 mr-1" />
                    Tienda
                  </button>
                  <button 
                    onClick={() => navigateTo('editor')} 
                    className={`text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                      currentView === 'editor' ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Horarios
                  </button>
                  <button 
                    onClick={() => navigateTo('gestor-mensual')} 
                    className={`text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                      currentView === 'gestor-mensual' ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Empleados
                  </button>
                  <button 
                    onClick={() => navigateTo('horarios')} 
                    className={`text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                      currentView === 'horarios' ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Horario Comercial
                  </button>
                  <button 
                    onClick={logout}
                    className="text-red-600 hover:text-red-800 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Cerrar Sesión
                  </button>
                </nav>

                {/* Menú hamburguesa móvil */}
                <div className="md:hidden">
                  <button 
                    onClick={toggleMenu}
                    className="bg-gray-100 p-2 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Menú móvil desplegable */}
            {menuOpen && (
              <div className="md:hidden">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-inner">
                  <button 
                    onClick={() => navigateTo('dashboard')}
                    className={`w-full text-left text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium ${
                      currentView === 'dashboard' ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <UserCircle className="w-5 h-5 mr-2" />
                      Tienda
                    </div>
                  </button>
                  <button 
                    onClick={() => navigateTo('editor')}
                    className={`w-full text-left text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium ${
                      currentView === 'editor' ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Horarios
                    </div>
                  </button>
                  <button 
                    onClick={() => navigateTo('gestor-mensual')}
                    className={`w-full text-left text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium ${
                      currentView === 'gestor-mensual' ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Empleados
                    </div>
                  </button>
                  <button 
                    onClick={() => navigateTo('horarios')}
                    className={`w-full text-left text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium ${
                      currentView === 'horarios' ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Horario Comercial
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="text-red-600 hover:text-red-800 block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                  >
                    <div className="flex items-center">
                      <LogOut className="w-5 h-5 mr-2" />
                      Cerrar Sesión
                    </div>
                  </button>
                </div>
              </div>
            )}
          </header>

          {/* Contenido principal */}
          <main className="flex-grow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-white shadow-inner py-4 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Casa de las Carcasas. Todos los derechos reservados.
              </div>
            </div>
          </footer>
        </div>
      </TiendaNavigationContext.Provider>
    </RouteGuard>
  );
} 