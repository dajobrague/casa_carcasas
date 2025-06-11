'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { RefreshCw, Users, Building, Check, AlertCircle, Database, Key, ArrowDownCircle, LogOut, FileText } from 'lucide-react';

enum SyncType {
  USERS = 'usuarios',
  STORES = 'tiendas',
  CSV_IMPORT = 'csv_import'
}

// Componente de carga
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function ApiSyncPage() {
  const router = useRouter();
  
  // Usamos la autenticación de administrador
  const { isAdminLoggedIn, loading, adminLogout } = useAuth();
  
  const [syncType, setSyncType] = useState<SyncType>(SyncType.USERS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDataViewer, setShowDataViewer] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'api' | 'csv' | 'semanal'>('api');
  
  // Protección de ruta para administradores
  useEffect(() => {
    if (!loading && !isAdminLoggedIn) {
      router.push('/admin/login');
    }
  }, [isAdminLoggedIn, loading, router]);
  
  // Función para ejecutar sincronización
  const handleSync = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowDataViewer(false);
    
    try {
      let url = '';
      
      switch (syncType) {
        case SyncType.USERS:
          url = `/api/lcdc/users?sync=true`;
          break;
        case SyncType.STORES:
          url = `/api/lcdc/stores?sync=true`;
          break;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la sincronización');
      }
      
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gestionar el cierre de sesión de admin
  const handleLogout = () => {
    adminLogout();
  };

  // Navegar a la importación CSV
  const navigateToCSVImport = () => {
    router.push('/admin/csv-import');
  };
  
  // Navegar a la importación semanal
  const navigateToSemanasImport = () => {
    router.push('/admin/semanas-csv-import');
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAdminLoggedIn) {
    return null; // Redirecciona en useEffect
  }
  
  // Determinar si hay datos para mostrar
  const hasData = result && result.data;
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Contenido principal */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h1 className="text-xl font-bold text-gray-900">Sincronización API LCDC</h1>
              <p className="mt-1 text-sm text-gray-500">
                Actualiza los datos de usuarios y tiendas directamente desde la API de LCDC a Airtable
              </p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Opciones de sincronización */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Opciones de sincronización</h2>
                  
                  <div className="mb-4">
                    <label className="block mb-2 font-medium text-gray-700">Tipo de datos</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSyncType(SyncType.USERS)}
                        className={`flex items-center justify-center px-4 py-3 rounded-lg border ${
                          syncType === SyncType.USERS 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Users className={`w-5 h-5 ${syncType === SyncType.USERS ? 'mr-2' : 'mr-0 md:mr-2'}`} />
                        <span className="hidden md:inline">Usuarios</span>
                      </button>
                      <button
                        onClick={() => setSyncType(SyncType.STORES)}
                        className={`flex items-center justify-center px-4 py-3 rounded-lg border ${
                          syncType === SyncType.STORES 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Building className={`w-5 h-5 ${syncType === SyncType.STORES ? 'mr-2' : 'mr-0 md:mr-2'}`} />
                        <span className="hidden md:inline">Tiendas</span>
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSync}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Iniciar sincronización
                      </>
                    )}
                  </button>
                </div>
                
                {/* Estado y Resultados */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de sincronización</h2>
                  
                  {!isLoading && !error && !result && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <Database className="w-12 h-12 mb-4 text-gray-400" />
                      <p className="text-center">No hay datos sincronizados todavía.</p>
                      <p className="text-center text-sm mt-2">
                        Selecciona el tipo de datos y haz clic en "Iniciar sincronización".
                      </p>
                    </div>
                  )}
                  
                  {isLoading && (
                    <div className="flex flex-col items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                      <p className="text-gray-700">Sincronizando {syncType === SyncType.USERS ? 'usuarios' : 'tiendas'}...</p>
                    </div>
                  )}
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                      <div className="flex">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">Error en la sincronización</p>
                          <p className="text-sm">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {hasData && (
                    <div className="mt-4">
                      <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-4">
                        <div className="flex">
                          <Check className="w-5 h-5 mr-2 flex-shrink-0" />
                          <div>
                            <p className="font-semibold">Sincronización completada</p>
                            <p className="text-sm">
                              Datos sincronizados correctamente con Airtable.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-5 sm:p-6">
                          <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Resultado de la sincronización
                          </h3>
                          <div className="mt-2 max-w-xl text-sm text-gray-500">
                            <p>
                              Registros actualizados: {result.updates}
                            </p>
                            <p>
                              Nuevos registros creados: {result.creates}
                            </p>
                          </div>
                          <div className="mt-5">
                            <button
                              type="button"
                              onClick={() => setShowDataViewer(!showDataViewer)}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <ArrowDownCircle className="mr-2 h-5 w-5 text-gray-400" />
                              {showDataViewer ? 'Ocultar datos completos' : 'Ver datos completos'}
                            </button>
                          </div>
                        </div>
                        
                        {showDataViewer && (
                          <div className="border-t border-gray-200">
                            <div className="px-4 py-5 sm:p-6 bg-gray-50 overflow-auto" style={{ maxHeight: '300px' }}>
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                {JSON.stringify(result, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 