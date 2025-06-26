'use client';

import { useState, useEffect, useRef } from 'react';
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

interface ConfiguracionHistorica {
  [semanaObjetivo: string]: string[];
}

interface ConfiguracionSemana {
  semanaObjetivo: string;
  semanasReferencia: string[];
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
  
  // Estados para aplicación masiva
  const [showBulkModal, setShowBulkModal] = useState(false);

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

  // Función para generar semanas del año actual (para semanas objetivo)
  const generarSemanasAñoActual = () => {
    const añoActual = new Date().getFullYear();
    const semanas: SemanaOption[] = [];

    // Generar 52-53 semanas del año actual
    for (let i = 1; i <= 53; i++) {
      const numeroSemana = i.toString().padStart(2, '0');
      const valor = `W${numeroSemana} ${añoActual}`;
      semanas.push({
        value: valor,
        label: valor
      });
    }

    return semanas;
  };

  // Función para parsear configuración histórica desde JSON
  const parsearConfiguracionHistorica = (jsonString: string): ConfiguracionHistorica => {
    if (!jsonString || jsonString.trim() === '') {
      return {};
    }

    try {
      const config = JSON.parse(jsonString);
      if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
        return config;
      }
    } catch (error) {
      console.warn('Error parseando configuración histórica:', error);
    }

    return {};
  };

  // Función para convertir configuración a JSON string
  const configuracionAJSON = (config: ConfiguracionHistorica): string => {
    return JSON.stringify(config, null, 2);
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

      const response = await fetch('/api/admin/semanas-historicas');

      if (!response.ok) {
        throw new Error('Error al obtener tiendas');
      }

      const data = await response.json();
      
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

  // Función para actualizar configuración histórica de una tienda
  const actualizarConfiguracionHistorica = async (tiendaId: string, configuracion: ConfiguracionHistorica) => {
    try {
      const jsonString = configuracionAJSON(configuracion);

      const response = await fetch('/api/admin/semanas-historicas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tiendaId: tiendaId,
          semanasHistoricas: jsonString
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar configuración histórica');
      }

      // Actualizar estado local
      setTiendas(prev => prev.map(tienda => 
        tienda.id === tiendaId 
          ? { ...tienda, semanasHistoricas: jsonString }
          : tienda
      ));

      console.log('✅ Configuración actualizada exitosamente');

    } catch (error) {
      console.error('Error al actualizar configuración histórica:', error);
      setError('Error al actualizar la configuración histórica');
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
                  Configurar semanas de referencia del año anterior para semanas específicas
                </p>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>📋 Nuevo formato JSON:</strong> Configura semanas históricas específicas para cada semana objetivo.
                    Ejemplo: W26 2025 → semanas W25, W26, W27 del 2024
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Aplicar a Múltiples Tiendas</span>
                </button>
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Semana Actual</p>
                  <p className="text-lg font-bold text-blue-600">{semanaActual}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Buscar tienda
              </label>
              <input
                type="text"
                id="search"
                placeholder="Buscar por número, nombre o país..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="pais" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por país
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

        {/* Lista de tiendas */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTiendas.map((tienda) => (
              <TiendaItemJSON
                key={tienda.id}
                tienda={tienda}
                semanasDisponibles={semanasDisponibles}
                semanasObjetivo={generarSemanasAñoActual()}
                onUpdate={actualizarConfiguracionHistorica}
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

// Componente para cada tienda individual con formato JSON
interface TiendaItemJSONProps {
  tienda: Tienda;
  semanasDisponibles: SemanaOption[];
  semanasObjetivo: SemanaOption[];
  onUpdate: (tiendaId: string, configuracion: ConfiguracionHistorica) => void;
}

function TiendaItemJSON({ tienda, semanasDisponibles, semanasObjetivo, onUpdate }: TiendaItemJSONProps) {
  const [configuracion, setConfiguracion] = useState<ConfiguracionHistorica>(() => {
    if (!tienda.semanasHistoricas || tienda.semanasHistoricas.trim() === '') {
      return {};
    }
    
    try {
      const parsed = JSON.parse(tienda.semanasHistoricas);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [modoEdicion, setModoEdicion] = useState<string | null>(null);
  const [semanaObjetivoTemp, setSemanaObjetivoTemp] = useState('');
  const [semanasReferenciaTemp, setSemanasReferenciaTemp] = useState<string[]>([]);

  const configuraciones = Object.entries(configuracion);

  const iniciarEdicion = (semanaObj?: string) => {
    if (semanaObj && configuracion[semanaObj]) {
      setSemanaObjetivoTemp(semanaObj);
      setSemanasReferenciaTemp([...configuracion[semanaObj]]);
    } else {
      setSemanaObjetivoTemp('');
      setSemanasReferenciaTemp([]);
    }
    setModoEdicion(semanaObj || 'nueva');
  };

  const guardarConfiguracion = () => {
    if (!semanaObjetivoTemp || semanasReferenciaTemp.length === 0) {
      alert('Debe seleccionar una semana objetivo y al menos una semana de referencia');
      return;
    }

    const nuevaConfiguracion = { ...configuracion };
    nuevaConfiguracion[semanaObjetivoTemp] = [...semanasReferenciaTemp];
    
    setConfiguracion(nuevaConfiguracion);
    onUpdate(tienda.id, nuevaConfiguracion);
    
    setModoEdicion(null);
    setSemanaObjetivoTemp('');
    setSemanasReferenciaTemp([]);
  };

  const eliminarConfiguracion = (semanaObj: string) => {
    const nuevaConfiguracion = { ...configuracion };
    delete nuevaConfiguracion[semanaObj];
    
    setConfiguracion(nuevaConfiguracion);
    onUpdate(tienda.id, nuevaConfiguracion);
  };



  return (
    <li className="px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              configuraciones.length > 0 
                ? 'bg-green-100' 
                : 'bg-blue-100'
            }`}>
              <span className={`text-sm font-medium ${
                configuraciones.length > 0 
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
            <div className="text-sm text-gray-500">
              {configuraciones.length > 0 ? (
                <div className="space-y-1">
                  {configuraciones.slice(0, 2).map(([semanaObj, referencias]) => (
                    <div key={semanaObj} className="text-xs">
                      <span className="font-medium text-blue-600">{semanaObj}</span> 
                      → {referencias.join(', ')}
                    </div>
                  ))}
                  {configuraciones.length > 2 && (
                    <div className="text-xs text-gray-400">
                      +{configuraciones.length - 2} configuración(es) más...
                    </div>
                  )}
                </div>
              ) : (
                'Sin configuraciones históricas'
              )}
            </div>
          </div>
        </div>

        {/* Botón de configuración */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {configuraciones.length > 0 ? `${configuraciones.length} configuración(es)` : 'Configurar'}
            <svg className="ml-2 -mr-1 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Configuraciones Históricas</h3>
                  <button
                    onClick={() => iniciarEdicion()}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                  >
                    + Agregar
                  </button>
                </div>

                {/* Modo edición */}
                {modoEdicion && (
                  <div className="mb-4 p-3 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <h4 className="font-medium text-blue-900 mb-3">
                      {modoEdicion === 'nueva' ? 'Nueva Configuración' : 'Editar Configuración'}
                    </h4>
                    
                    {/* Selector de semana objetivo */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Semana Objetivo
                      </label>
                      <SearchableDropdown
                        value={semanaObjetivoTemp}
                        onChange={setSemanaObjetivoTemp}
                        options={semanasObjetivo}
                        placeholder="Seleccionar semana..."
                        className="w-full"
                      />
                    </div>

                    {/* Selector de semanas de referencia */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Semanas de Referencia ({semanasReferenciaTemp.length} seleccionadas)
                      </label>
                      <MultiSelectDropdown
                        values={semanasReferenciaTemp}
                        onChange={setSemanasReferenciaTemp}
                        options={semanasDisponibles}
                        placeholder="Seleccionar semanas..."
                        className="w-full"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setModoEdicion(null)}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={guardarConfiguracion}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de configuraciones existentes */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {configuraciones.map(([semanaObj, referencias]) => (
                    <div
                      key={semanaObj}
                      className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {semanaObj}
                        </div>
                        <div className="text-xs text-gray-600">
                          → {referencias.join(', ')}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => iniciarEdicion(semanaObj)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => eliminarConfiguracion(semanaObj)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {configuraciones.length === 0 && !modoEdicion && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No hay configuraciones históricas.
                    <br />
                    Haz clic en "Agregar" para crear una.
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
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

// Componente de dropdown personalizado con búsqueda
interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: SemanaOption[];
  placeholder: string;
  className?: string;
}

function SearchableDropdown({ value, onChange, options, placeholder, className = "" }: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filtrar opciones basado en el término de búsqueda
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Encontrar la opción seleccionada para mostrar su label
  const selectedOption = options.find(opt => opt.value === value);

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejar navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
        }
        break;
    }
  };

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Botón principal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg 
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Barra de búsqueda */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar semana (ej: W26, 2024)..."
                className="w-full px-3 py-1 pl-8 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <svg 
                className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Lista de opciones */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOption(option.value)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:outline-none focus:bg-blue-50 transition-colors ${
                    highlightedIndex === index ? 'bg-blue-50' : ''
                  } ${
                    value === option.value ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No se encontraron semanas que coincidan con "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente multi-select personalizado para semanas de referencia
interface MultiSelectDropdownProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: SemanaOption[];
  placeholder: string;
  className?: string;
}

function MultiSelectDropdown({ values, onChange, options, placeholder, className = "" }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filtrar opciones basado en el término de búsqueda
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener labels de valores seleccionados
  const selectedLabels = values.map(value => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  });

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter(v => v !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
  };

  const removeValue = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter(v => v !== valueToRemove));
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Botón principal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[2.5rem]"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {values.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedLabels.map((label, index) => (
                  <span
                    key={values[index]}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {label}
                    <button
                      type="button"
                      onClick={(e) => removeValue(values[index], e)}
                      className="ml-1 hover:text-blue-600"
                    >
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <svg 
            className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Barra de búsqueda */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar semanas (ej: W26, 2024)..."
                className="w-full px-3 py-1 pl-8 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <svg 
                className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Lista de opciones */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <>
                {/* Botones de acción rápida */}
                <div className="p-2 border-b border-gray-100 bg-gray-50">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onChange([])}
                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                    >
                      Limpiar todo
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(filteredOptions.map(opt => opt.value))}
                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                    >
                      Seleccionar todos los filtrados
                    </button>
                  </div>
                </div>

                {/* Opciones */}
                {filteredOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={values.includes(option.value)}
                      onChange={() => toggleOption(option.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-900">{option.label}</span>
                  </label>
                ))}
              </>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No se encontraron semanas que coincidan con "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 