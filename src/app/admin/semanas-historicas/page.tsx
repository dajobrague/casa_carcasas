'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface Tienda {
  id: string;
  numero: number;
  nombre: string;
  pais: string;
  semanasHistoricas: string;
}

interface SemanaOption {
  value: string;
  label: string;
}

export default function SemanasHistoricasPage() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [filteredTiendas, setFilteredTiendas] = useState<Tienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [semanaActual, setSemanaActual] = useState<string>('');
  const [semanasDisponibles, setSemanasDisponibles] = useState<SemanaOption[]>([]);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPais, setFilterPais] = useState<string>('all');
  const [paisesUnicos, setPaisesUnicos] = useState<string[]>([]);

  // Función para obtener la semana actual
  const obtenerSemanaActual = () => {
    const ahora = new Date();
    const inicioAño = new Date(ahora.getFullYear(), 0, 1);
    const diasDelAño = Math.floor((ahora.getTime() - inicioAño.getTime()) / (24 * 60 * 60 * 1000));
    const numeroSemana = Math.ceil((diasDelAño + inicioAño.getDay() + 1) / 7);
    return `W${numeroSemana.toString().padStart(2, '0')} ${ahora.getFullYear()}`;
  };

  // Función para generar todas las semanas del año anterior
  const generarSemanasAñoAnterior = () => {
    const añoActual = new Date().getFullYear();
    const añoAnterior = añoActual - 1;
    const semanas: SemanaOption[] = [];

    // Generar 52-53 semanas del año anterior
    for (let i = 1; i <= 53; i++) {
      const numeroSemana = i.toString().padStart(2, '0');
      const valor = `W${numeroSemana} ${añoAnterior}`;
      semanas.push({
        value: valor,
        label: valor
      });
    }

    return semanas;
  };

  // Verificar autenticación y cargar datos
  useEffect(() => {
    const checkAuth = async () => {
      // Verificar si hay sesión de administrador
      const adminAuth = Cookies.get('adminAuth');
      const adminSession = Cookies.get('admin_session');
      
      if (!adminAuth && !adminSession) {
        window.location.href = '/admin/login';
        return;
      }
      
      // Configurar semana actual y opciones
      setSemanaActual(obtenerSemanaActual());
      setSemanasDisponibles(generarSemanasAñoAnterior());
      
      // Cargar tiendas
      await cargarTiendas();
    };

    checkAuth();
  }, []);

  // Filtrar tiendas basado en búsqueda y filtros
  useEffect(() => {
    let filtered = tiendas;
    
    // Filtrar por término de búsqueda (número, nombre o país)
    if (searchTerm) {
      filtered = filtered.filter(tienda => 
        tienda.numero.toString().includes(searchTerm.toLowerCase()) ||
        tienda.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tienda.pais.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrar por país
    if (filterPais !== 'all') {
      filtered = filtered.filter(tienda => tienda.pais === filterPais);
    }
    
    setFilteredTiendas(filtered);
  }, [tiendas, searchTerm, filterPais]);

  // Función para cargar tiendas desde Airtable
  const cargarTiendas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Usar la misma estrategia que historial-tiendas: API dedicada
      const response = await fetch('/api/admin/semanas-historicas');

      if (!response.ok) {
        throw new Error('Error al obtener tiendas');
      }

      const data = await response.json();
      
      // Los datos ya vienen procesados desde la API dedicada
      setTiendas(data.tiendas || []);
      
      // Extraer países únicos para el filtro
      const paises = [...new Set((data.tiendas || []).map((t: Tienda) => t.pais).filter(Boolean) as string[])].sort();
      setPaisesUnicos(paises);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar semanas históricas de una tienda
  const actualizarSemanasHistoricas = async (tiendaId: string, semanasSeleccionadas: string[]) => {
    try {
      const valorFinal = semanasSeleccionadas.length === 1 
        ? semanasSeleccionadas[0] 
        : semanasSeleccionadas.join(',');

      const response = await fetch('/api/admin/semanas-historicas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tiendaId: tiendaId,
          semanasHistoricas: valorFinal
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar semanas históricas');
      }

      // Actualizar estado local
      setTiendas(prev => prev.map(tienda => 
        tienda.id === tiendaId 
          ? { ...tienda, semanasHistoricas: valorFinal }
          : tienda
      ));

    } catch (error) {
      console.error('Error al actualizar semanas históricas:', error);
      setError('Error al actualizar las semanas históricas');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tiendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configuración de Semanas Históricas
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Configurar semanas de referencia del año anterior para tiendas históricas
                </p>
              </div>
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Semana Actual</p>
                <p className="text-lg font-bold text-blue-600">{semanaActual}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Búsqueda general */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar por N°, Nombre o País
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="search"
                    placeholder="Buscar tienda..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Filtro por país */}
              <div>
                <label htmlFor="pais" className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por País
                </label>
                <select
                  id="pais"
                  value={filterPais}
                  onChange={(e) => setFilterPais(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos los países</option>
                  {paisesUnicos.map((pais) => (
                    <option key={pais} value={pais}>
                      {pais}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estadísticas de filtros */}
            <div className="mt-4 text-sm text-gray-500">
              Mostrando {filteredTiendas.length} de {tiendas.length} tiendas
              {searchTerm && ` · Búsqueda: "${searchTerm}"`}
              {filterPais !== 'all' && ` · País: ${filterPais}`}
            </div>
          </div>
        </div>

        {/* Lista de tiendas */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTiendas.map((tienda) => (
              <TiendaItem
                key={tienda.id}
                tienda={tienda}
                semanasDisponibles={semanasDisponibles}
                onUpdate={actualizarSemanasHistoricas}
              />
            ))}
          </ul>
        </div>

        {filteredTiendas.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {tiendas.length === 0 
                ? "No se encontraron tiendas" 
                : "No hay tiendas que coincidan con los filtros"
              }
            </p>
            {(searchTerm || filterPais !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterPais('all');
                }}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente para cada tienda individual
interface TiendaItemProps {
  tienda: Tienda;
  semanasDisponibles: SemanaOption[];
  onUpdate: (tiendaId: string, semanas: string[]) => void;
}

function TiendaItem({ tienda, semanasDisponibles, onUpdate }: TiendaItemProps) {
  const [semanasSeleccionadas, setSemanasSeleccionadas] = useState<string[]>(
    tienda.semanasHistoricas ? tienda.semanasHistoricas.split(',').map(s => s.trim()) : []
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar semanas según búsqueda
  const semanasFiltradas = semanasDisponibles.filter(semana =>
    semana.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Manejar selección de semana
  const handleToggleSemana = (semanaValue: string) => {
    const nuevasSelecciones = semanasSeleccionadas.includes(semanaValue)
      ? semanasSeleccionadas.filter(s => s !== semanaValue)
      : [...semanasSeleccionadas, semanaValue];
    
    setSemanasSeleccionadas(nuevasSelecciones);
    onUpdate(tienda.id, nuevasSelecciones);
  };

  return (
    <li className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              semanasSeleccionadas.length > 0 
                ? 'bg-green-100' 
                : 'bg-blue-100'
            }`}>
              <span className={`text-sm font-medium ${
                semanasSeleccionadas.length > 0 
                  ? 'text-green-600' 
                  : 'text-blue-600'
              }`}>
                {tienda.numero}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-900">
              Tienda {tienda.numero} - {tienda.nombre}
            </p>
            <p className="text-xs text-gray-400 mb-1">
              {tienda.pais}
            </p>
            <p className="text-sm text-gray-500">
              {semanasSeleccionadas.length > 0 
                ? `${semanasSeleccionadas.length} semana(s) seleccionada(s): ${semanasSeleccionadas.join(', ')}`
                : 'Sin semanas configuradas'
              }
            </p>
          </div>
        </div>

        {/* Dropdown personalizado */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {semanasSeleccionadas.length > 0 ? 'Semanas configuradas' : 'Configurar'}
            <svg className="ml-2 -mr-1 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
              <div className="p-4">
                {/* Barra de búsqueda */}
                <input
                  type="text"
                  placeholder="Buscar semana (ej: W20)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {/* Lista de semanas */}
                <div className="mt-3 max-h-60 overflow-y-auto">
                  <div className="space-y-1">
                    {semanasFiltradas.map((semana) => (
                      <label
                        key={semana.value}
                        className="flex items-center p-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={semanasSeleccionadas.includes(semana.value)}
                          onChange={() => handleToggleSemana(semana.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-900">
                          {semana.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="mt-4 flex justify-between">
                  <button
                    onClick={() => {
                      setSemanasSeleccionadas([]);
                      onUpdate(tienda.id, []);
                    }}
                    className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                  >
                    Limpiar Todo
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
} 