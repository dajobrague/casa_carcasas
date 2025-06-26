'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Building, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

// Tipo para los datos de la tienda
interface TiendaHistorial {
  id: string;
  numero: string;
  nombre: string;
  pais: string;
  esHistorica: boolean;
}

// Función auxiliar para componente de carga
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function HistorialTiendasPage() {
  const router = useRouter();
  const { isAdminLoggedIn, loading, adminLogout } = useAuth();
  
  // Estados para los datos
  const [tiendas, setTiendas] = useState<TiendaHistorial[]>([]);
  const [filteredTiendas, setFilteredTiendas] = useState<TiendaHistorial[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  
  // Estados para toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHistorica, setFilterHistorica] = useState<'all' | 'true' | 'false'>('all');
  const [filterPais, setFilterPais] = useState<string>('all');
  const [paisesUnicos, setPaisesUnicos] = useState<string[]>([]);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  
  // Protección de ruta para administradores
  useEffect(() => {
    if (!loading && !isAdminLoggedIn) {
      router.push('/admin/login');
    }
  }, [isAdminLoggedIn, loading, router]);

  // Cargar datos de tiendas
  const loadTiendas = async () => {
    try {
      setIsLoadingData(true);
      setError(null);
      
      const response = await fetch('/api/admin/historial-tiendas');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTiendas(data.tiendas || []);
      
      // Extraer países únicos para el filtro
      const paises = [...new Set((data.tiendas || [])
        .map((t: TiendaHistorial) => t.pais || '')
        .filter((pais: string) => pais.trim() !== '') as string[])]
        .sort();
      setPaisesUnicos(paises);
    } catch (err) {
      console.error('Error cargando tiendas:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar las tiendas');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    if (isAdminLoggedIn && !loading) {
      loadTiendas();
    }
  }, [isAdminLoggedIn, loading]);

  // Filtrar tiendas basado en búsqueda y filtros
  useEffect(() => {
    let filtered = tiendas;
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      filtered = filtered.filter(tienda => {
        const numero = (tienda.numero || '').toString().toLowerCase();
        const nombre = (tienda.nombre || '').toString().toLowerCase();
        const pais = (tienda.pais || '').toString().toLowerCase();
        
        return numero.includes(searchTermLower) ||
               nombre.includes(searchTermLower) ||
               pais.includes(searchTermLower);
      });
    }
    
    // Filtrar por estado histórico
    if (filterHistorica !== 'all') {
      filtered = filtered.filter(tienda => 
        tienda.esHistorica === (filterHistorica === 'true')
      );
    }
    
    // Filtrar por país
    if (filterPais !== 'all') {
      filtered = filtered.filter(tienda => (tienda.pais || '') === filterPais);
    }
    
    setFilteredTiendas(filtered);
    setCurrentPage(1); // Reset a la primera página cuando cambien los filtros
  }, [tiendas, searchTerm, filterHistorica, filterPais]);

  // Calcular datos de paginación
  const totalPages = Math.ceil(filteredTiendas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTiendas = filteredTiendas.slice(startIndex, endIndex);

  // Funciones de navegación de páginas
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));
  const goToLastPage = () => setCurrentPage(totalPages);

  // Actualizar estado histórico de una tienda
  const updateTiendaHistorica = async (tiendaId: string, esHistorica: boolean) => {
    try {
      setUpdatingIds(prev => new Set(prev).add(tiendaId));
      setError(null);
      
      const response = await fetch('/api/admin/historial-tiendas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tiendaId,
          esHistorica
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      // Actualizar el estado local
      setTiendas(prev => prev.map(tienda => 
        tienda.id === tiendaId 
          ? { ...tienda, esHistorica }
          : tienda
      ));
      
      // Mostrar toast de éxito
      setToastMessage('Estado histórico actualizado correctamente');
      setShowToast(true);
      
      // Ocultar toast después de 3 segundos
      setTimeout(() => setShowToast(false), 3000);
      
    } catch (err) {
      console.error('Error actualizando tienda:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al actualizar la tienda');
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(tiendaId);
        return newSet;
      });
    }
  };

  // Limpiar mensajes
  const clearMessages = () => {
    setError(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAdminLoggedIn) {
    return null; // Redirecciona en useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Contenido principal */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Historial de Tiendas</h1>
              <p className="text-gray-600 mt-1">
                Gestiona el estado histórico de las tiendas en el sistema
              </p>
            </div>
            <Button 
              onClick={loadTiendas} 
              disabled={isLoadingData}
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>

          {/* Mensajes de estado */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearMessages}
                  className="ml-2"
                >
                  Cerrar
                </Button>
              </AlertDescription>
            </Alert>
          )}



          {/* Filtros y búsqueda */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar tienda
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar por número, nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    País
                  </label>
                  <select
                    value={filterPais}
                    onChange={(e) => setFilterPais(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los países</option>
                    {paisesUnicos.map(pais => (
                      <option key={pais} value={pais}>{pais}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado histórico
                  </label>
                  <select
                    value={filterHistorica}
                    onChange={(e) => setFilterHistorica(e.target.value as 'all' | 'true' | 'false')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas las tiendas</option>
                    <option value="true">Solo tiendas históricas</option>
                    <option value="false">Solo tiendas activas</option>
                  </select>
                </div>
                

              </div>
            </CardContent>
          </Card>

          {/* Tabla de tiendas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Tiendas ({filteredTiendas.length})
              </CardTitle>
              <CardDescription>
                {isLoadingData 
                  ? 'Cargando tiendas...' 
                  : `Mostrando ${Math.min(startIndex + 1, filteredTiendas.length)}-${Math.min(endIndex, filteredTiendas.length)} de ${filteredTiendas.length} tiendas`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Cargando tiendas...</span>
                </div>
              ) : filteredTiendas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {tiendas.length === 0 
                    ? 'No se encontraron tiendas en el sistema'
                    : 'No se encontraron tiendas que coincidan con los filtros aplicados'
                  }
                </div>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">N°</TableHead>
                          <TableHead>Tienda</TableHead>
                          <TableHead>País</TableHead>
                          <TableHead className="text-center">Tienda Histórica</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentTiendas.map((tienda) => (
                          <TableRow key={tienda.id}>
                            <TableCell className="font-medium">
                              {tienda.numero}
                            </TableCell>
                            <TableCell>{tienda.nombre}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                {tienda.pais}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                                                              <div className="flex items-center justify-center">
                                  {updatingIds.has(tienda.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Switch
                                      checked={tienda.esHistorica}
                                      onCheckedChange={(checked) => updateTiendaHistorica(tienda.id, checked)}
                                      disabled={updatingIds.has(tienda.id)}
                                      className={`
                                        ${tienda.esHistorica 
                                          ? 'data-[state=checked]:bg-green-600' 
                                          : 'data-[state=unchecked]:bg-gray-400'
                                        }
                                        [&>span]:bg-white [&>span]:border-0
                                      `}
                                    />
                                  )}
                                </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between space-x-2 py-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToFirstPage}
                          disabled={currentPage === 1}
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousPage}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">
                          Página {currentPage} de {totalPages}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextPage}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToLastPage}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Toast de notificación */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 max-w-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
            <button
              onClick={() => setShowToast(false)}
              className="ml-2 text-white hover:text-gray-200 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 