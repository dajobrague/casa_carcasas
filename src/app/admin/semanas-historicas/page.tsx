'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import BulkConfigModal from '@/components/admin/BulkConfigModal';
import Portal from '@/components/ui/Portal';

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
  [semanaObjetivo: string]: ConfiguracionHistoricaItem;
}

interface ConfiguracionSemana {
  semanaObjetivo: string;
  semanasReferencia: string[];
}

interface ConfiguracionPorDia {
  type: 'comparable_por_dia';
  mapping: Record<string, string>; // fecha objetivo -> fecha referencia
}

type ConfiguracionHistoricaItem = string[] | ConfiguracionPorDia;

// Funciones utilitarias para manejar fechas y semanas
function getWeekDays(weekString: string): Date[] {
  // Extraer año y número de semana: "W26 2025" -> year: 2025, week: 26
  const match = weekString.match(/W(\d+)\s+(\d+)/);
  if (!match) return [];
  
  const weekNumber = parseInt(match[1]);
  const year = parseInt(match[2]);
  
  // Calcular el primer día de la semana ISO
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Domingo = 0, convertir a 7
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNumber - 1) * 7);
  
  // Generar los 7 días de la semana
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  
  return days;
}

function generateDefaultDayMapping(weekDays: Date[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  weekDays.forEach(date => {
    const previousYear = new Date(date);
    previousYear.setFullYear(date.getFullYear() - 1);
    
    // Usar formato local para evitar problemas de zona horaria
    const dateKey = formatDateForInput(date);
    const referenceDate = formatDateForInput(previousYear);
    
    mapping[dateKey] = referenceDate;
  });
  
  return mapping;
}

// Función para formatear fechas para input date (evita problemas de zona horaria)
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatDateShort(dateString: string): string {
  // Parsear la fecha como fecha local para evitar problemas de zona horaria
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });
}

// Funciones helper para determinar tipos de configuración
function isConfiguracionPorDia(config: ConfiguracionHistoricaItem): config is ConfiguracionPorDia {
  return typeof config === 'object' && 'type' in config && config.type === 'comparable_por_dia';
}

function isConfiguracionPorSemanas(config: ConfiguracionHistoricaItem): config is string[] {
  return Array.isArray(config);
}

// Función para obtener configuraciones como array para compatibilidad
function getConfiguracionesArray(configuracion: ConfiguracionHistorica): Array<[string, ConfiguracionHistoricaItem]> {
  return Object.entries(configuracion);
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
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Semana Actual</p>
                <p className="text-lg font-bold text-blue-600">{semanaActual}</p>
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
        {/* Filtros y Acciones */}
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="px-6 py-6">
            {/* Header con botón de acción principal */}
            <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Gestión de Tiendas</h2>
              <p className="text-sm text-gray-600">Busca, filtra y configura múltiples tiendas</p>
            </div>
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center space-x-2 transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Aplicar a Múltiples Tiendas</span>
            </button>
          </div>

          {/* Filtros */}
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
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Mostrando {filteredTiendas.length} de {tiendas.length} tiendas
              {searchTerm && ` · Búsqueda: "${searchTerm}"`}
              {filterPais !== 'all' && ` · País: ${filterPais}`}
            </div>
            {(searchTerm || filterPais !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterPais('all');
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>
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

      {/* Modal para aplicación masiva */}
      <BulkConfigModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        tiendas={tiendas}
        semanasObjetivo={generarSemanasAñoActual()}
        semanasReferencia={semanasDisponibles}
        onSuccess={cargarTiendas}
      />
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
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number, width: number}>({top: 0, left: 0, width: 0});
  
  // Estados para configuración por día
  const [tipoConfiguracion, setTipoConfiguracion] = useState<'por_semanas' | 'por_dia'>('por_semanas');
  const [mappingPorDia, setMappingPorDia] = useState<Record<string, string>>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Estados para mejoras de UX
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('compact');
  const [showAll, setShowAll] = useState(false);

  const configuraciones = Object.entries(configuracion);

  // Filtrar configuraciones basado en la búsqueda
  const configuracionesFiltradas = configuraciones.filter(([semanaObj, referencias]) => {
    const searchLower = searchTerm.toLowerCase();
    if (semanaObj.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Para configuraciones por semanas
    if (isConfiguracionPorSemanas(referencias)) {
      return referencias.some(ref => ref.toLowerCase().includes(searchLower));
    }
    
    // Para configuraciones por día
    if (isConfiguracionPorDia(referencias)) {
      return Object.values(referencias.mapping).some(ref => ref.toLowerCase().includes(searchLower));
    }
    
    return false;
  });

  // Configuraciones a mostrar (paginadas o todas)
  const configuracionesAMostrar = showAll ? configuracionesFiltradas : configuracionesFiltradas.slice(0, 5);

  // Estadísticas
  const totalConfiguraciones = configuraciones.length;
  const totalSemanasReferencia = configuraciones.reduce((total, [, referencias]) => {
    if (isConfiguracionPorSemanas(referencias)) {
      return total + referencias.length;
    } else if (isConfiguracionPorDia(referencias)) {
      return total + Object.keys(referencias.mapping).length;
    }
    return total;
  }, 0);

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        // Verificar si el clic fue en el dropdown (Portal)
        const dropdownElement = document.querySelector('[data-dropdown-id="' + tienda.id + '"]');
        if (!dropdownElement || !dropdownElement.contains(event.target as Node)) {
          closeDropdown();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, tienda.id]);

  // Función para calcular la posición del dropdown
  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const dropdownWidth = Math.max(384, rect.width);
    const dropdownHeight = 600; // Altura estimada del dropdown
    
    // Calcular la mejor posición horizontal
    let left;
    
    // Opción 1: Alinear borde derecho del dropdown con borde derecho del botón
    const alignRight = rect.right + scrollLeft - dropdownWidth;
    
    // Opción 2: Alinear borde izquierdo del dropdown con borde izquierdo del botón  
    const alignLeft = rect.left + scrollLeft;
    
    // Opción 3: Centrar dropdown con respecto al botón
    const alignCenter = rect.left + scrollLeft + (rect.width / 2) - (dropdownWidth / 2);
    
    // Elegir la mejor opción que no se salga de la pantalla
    if (alignRight >= 16 && alignRight + dropdownWidth <= viewportWidth - 16) {
      // Preferir alineación derecha si cabe
      left = alignRight;
    } else if (alignLeft >= 16 && alignLeft + dropdownWidth <= viewportWidth - 16) {
      // Si no cabe por la derecha, probar alineación izquierda
      left = alignLeft;
    } else if (alignCenter >= 16 && alignCenter + dropdownWidth <= viewportWidth - 16) {
      // Si no cabe ninguna alineación, probar centrado
      left = alignCenter;
    } else {
      // Como último recurso, forzar que quepa en la pantalla
      left = Math.max(16, Math.min(alignCenter, viewportWidth - dropdownWidth - 16));
    }
    
    // Calcular posición vertical
    let top = rect.bottom + scrollTop + 8;
    // Si el dropdown se sale por abajo, mostrarlo arriba del botón
    if (rect.bottom + dropdownHeight > viewportHeight) {
      top = rect.top + scrollTop - dropdownHeight - 8;
    }
    
    setDropdownPosition({
      top: Math.max(16, top),
      left,
      width: dropdownWidth
    });
  };

  // Función para toggle del dropdown
  const toggleDropdown = () => {
    if (!isOpen) {
      calculateDropdownPosition();
    } else {
      // Resetear estado al cerrar
      setSearchTerm('');
      setShowAll(false);
      setViewMode('compact');
    }
    setIsOpen(!isOpen);
  };

  // Función para cerrar dropdown
  const closeDropdown = () => {
    setIsOpen(false);
    setSearchTerm('');
    setShowAll(false);
    setViewMode('compact');
  };

  const iniciarEdicion = (semanaObj?: string) => {
    if (semanaObj && configuracion[semanaObj]) {
      setSemanaObjetivoTemp(semanaObj);
      const config = configuracion[semanaObj];
      if (isConfiguracionPorSemanas(config)) {
        setTipoConfiguracion('por_semanas');
        setSemanasReferenciaTemp([...config]);
        setMappingPorDia({});
      } else if (isConfiguracionPorDia(config)) {
        setTipoConfiguracion('por_dia');
        setSemanasReferenciaTemp([]);
        setMappingPorDia({...config.mapping});
      }
    } else {
      setSemanaObjetivoTemp('');
      setSemanasReferenciaTemp([]);
      setTipoConfiguracion('por_semanas');
      setMappingPorDia({});
    }
    setModoEdicion(semanaObj || 'nueva');
  };

  const guardarConfiguracion = () => {
    if (!semanaObjetivoTemp) {
      alert('Debe seleccionar una semana objetivo');
      return;
    }

    if (tipoConfiguracion === 'por_semanas') {
      if (semanasReferenciaTemp.length === 0) {
        alert('Debe seleccionar al menos una semana de referencia');
        return;
      }
      
      const nuevaConfiguracion = { ...configuracion };
      nuevaConfiguracion[semanaObjetivoTemp] = [...semanasReferenciaTemp];
      
      setConfiguracion(nuevaConfiguracion);
      onUpdate(tienda.id, nuevaConfiguracion);
    } else if (tipoConfiguracion === 'por_dia') {
      if (Object.keys(mappingPorDia).length === 0) {
        alert('Debe configurar al menos un día');
        return;
      }
      
      const nuevaConfiguracion = { ...configuracion };
      nuevaConfiguracion[semanaObjetivoTemp] = {
        type: 'comparable_por_dia',
        mapping: {...mappingPorDia}
      };
      
      setConfiguracion(nuevaConfiguracion);
      onUpdate(tienda.id, nuevaConfiguracion);
    }
    
    setModoEdicion(null);
    setSemanaObjetivoTemp('');
    setSemanasReferenciaTemp([]);
    setMappingPorDia({});
    setTipoConfiguracion('por_semanas');
  };

  const eliminarConfiguracion = (semanaObj: string) => {
    const nuevaConfiguracion = { ...configuracion };
    delete nuevaConfiguracion[semanaObj];
    
    setConfiguracion(nuevaConfiguracion);
    onUpdate(tienda.id, nuevaConfiguracion);
  };

  // Función para cambiar tipo de configuración
  const cambiarTipoConfiguracion = (nuevoTipo: 'por_semanas' | 'por_dia') => {
    setTipoConfiguracion(nuevoTipo);
    
    if (nuevoTipo === 'por_dia') {
      // Si cambiar a por día, generar mapping por defecto basado en la semana objetivo
      if (semanaObjetivoTemp) {
        const diasSemana = getWeekDays(semanaObjetivoTemp);
        const defaultMapping = generateDefaultDayMapping(diasSemana);
        setMappingPorDia(defaultMapping);
      }
      setSemanasReferenciaTemp([]);
    } else {
      // Si cambiar a por semanas, limpiar mapping
      setMappingPorDia({});
    }
  };

  // Función para actualizar fecha de referencia de un día específico
  const actualizarFechaReferencia = (fechaObjetivo: string, fechaReferencia: string) => {
    setMappingPorDia(prev => ({
      ...prev,
      [fechaObjetivo]: fechaReferencia
    }));
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
                  {configuraciones.slice(0, 2).map(([semanaObj, referencias]) => {
                    let displayText = '';
                    if (isConfiguracionPorSemanas(referencias)) {
                      displayText = referencias.join(', ');
                    } else if (isConfiguracionPorDia(referencias)) {
                      displayText = 'Configuración por día';
                    }
                    
                    return (
                      <div key={semanaObj} className="text-xs">
                        <span className="font-medium text-blue-600">{semanaObj}</span> 
                        → {displayText}
                      </div>
                    );
                  })}
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
            ref={buttonRef}
            onClick={toggleDropdown}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {configuraciones.length > 0 ? `${configuraciones.length} configuración(es)` : 'Configurar'}
            <svg className="ml-2 -mr-1 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {isOpen && (
            <Portal>
              <div 
                data-dropdown-id={tienda.id}
                className="fixed bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
                style={{
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width,
                  maxHeight: '600px',
                  zIndex: 9999
                }}
              >
                {/* Flecha indicadora */}
                <div 
                  className="absolute -top-2 w-4 h-4 bg-white border-l border-t border-gray-300 transform rotate-45"
                  style={{
                    right: '20px' // Posicionar cerca del borde derecho
                  }}
                />
                
                {/* Contenido del dropdown */}
                <div className="p-4">
                {/* Header con estadísticas */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Configuraciones Históricas</h3>
                    <div className="text-xs text-gray-500 mt-1">
                      {totalConfiguraciones} configuración(es) • {totalSemanasReferencia} semana(s) de referencia
                    </div>
                  </div>
                  <button
                    onClick={() => iniciarEdicion()}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex-shrink-0"
                  >
                    + Agregar
                  </button>
                </div>

                {/* Barra de búsqueda y controles (solo si hay configuraciones) */}
                {totalConfiguraciones > 0 && (
                  <div className="mb-4 space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por semana objetivo o referencia..."
                        className="w-full px-3 py-2 pl-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                    
                    {totalConfiguraciones > 5 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setViewMode(viewMode === 'compact' ? 'expanded' : 'compact')}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Vista {viewMode === 'compact' ? 'expandida' : 'compacta'}
                          </button>
                        </div>
                        <div className="text-xs text-gray-500">
                          Mostrando {configuracionesAMostrar.length} de {configuracionesFiltradas.length}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                        onChange={(valor) => {
                          setSemanaObjetivoTemp(valor);
                          // Si cambió la semana y está en modo por día, regenerar mapping
                          if (tipoConfiguracion === 'por_dia' && valor) {
                            const diasSemana = getWeekDays(valor);
                            const defaultMapping = generateDefaultDayMapping(diasSemana);
                            setMappingPorDia(defaultMapping);
                          }
                        }}
                        options={semanasObjetivo}
                        placeholder="Seleccionar semana..."
                        className="w-full"
                      />
                    </div>

                    {/* Toggle para tipo de configuración */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Configuración
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="tipoConfiguracion"
                            value="por_semanas"
                            checked={tipoConfiguracion === 'por_semanas'}
                            onChange={(e) => cambiarTipoConfiguracion(e.target.value as 'por_semanas')}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">Por Semanas</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="tipoConfiguracion"
                            value="por_dia"
                            checked={tipoConfiguracion === 'por_dia'}
                            onChange={(e) => cambiarTipoConfiguracion(e.target.value as 'por_dia')}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">Comparable por Día</span>
                        </label>
                      </div>
                    </div>

                    {/* Configuración por semanas */}
                    {tipoConfiguracion === 'por_semanas' && (
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
                    )}

                    {/* Configuración por día */}
                    {tipoConfiguracion === 'por_dia' && semanaObjetivoTemp && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Configuración por Día ({Object.keys(mappingPorDia).length} días configurados)
                        </label>
                                                 <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-white rounded border">
                           {getWeekDays(semanaObjetivoTemp).map((fecha, index) => {
                             const fechaKey = formatDateForInput(fecha);
                             const fechaReferencia = mappingPorDia[fechaKey] || '';
                             
                             return (
                               <div key={index} className="flex items-center space-x-2 text-sm">
                                 <div className="w-24 text-right">
                                   <span className="font-medium text-purple-700">
                                     {formatDateShort(fechaKey)}
                                   </span>
                                 </div>
                                 <span className="text-gray-500">→</span>
                                 <div className="flex-1">
                                   <input
                                     type="date"
                                     value={fechaReferencia}
                                     onChange={(e) => actualizarFechaReferencia(fechaKey, e.target.value)}
                                     className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                   />
                                 </div>
                               </div>
                             );
                           })}
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-medium">Tip:</span> Por defecto se mapea cada día al mismo día del año anterior. 
                          Puedes ajustar las fechas de referencia según necesites.
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setModoEdicion(null);
                          setTipoConfiguracion('por_semanas');
                          setMappingPorDia({});
                        }}
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
                <div className="space-y-2">
                  {/* Container con scroll para muchas configuraciones */}
                  <div className={`overflow-y-auto ${configuracionesFiltradas.length > 5 ? 'max-h-64' : 'max-h-96'}`}>
                    {configuracionesAMostrar.map(([semanaObj, referencias]) => (
                      <div
                        key={semanaObj}
                        className={`border border-gray-200 rounded-md bg-gray-50 transition-all ${
                          viewMode === 'expanded' ? 'p-3 mb-3' : 'p-2 mb-2'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-gray-900 ${
                              viewMode === 'expanded' ? 'text-base' : 'text-sm'
                            }`}>
                              {semanaObj}
                            </div>
                            
                            {viewMode === 'expanded' ? (
                              <div className="mt-2">
                                {isConfiguracionPorSemanas(referencias) ? (
                                  <>
                                    <div className="text-xs text-gray-600 mb-1">
                                      Semanas de referencia ({referencias.length}):
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {referencias.map((ref: string, index: number) => (
                                        <span 
                                          key={index}
                                          className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                        >
                                          {ref}
                                        </span>
                                      ))}
                                    </div>
                                  </>
                                ) : isConfiguracionPorDia(referencias) ? (
                                  <>
                                    <div className="text-xs text-gray-600 mb-1">
                                      Configuración por día ({Object.keys(referencias.mapping).length} días):
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(referencias.mapping).map(([fecha, referencia], index) => (
                                        <span 
                                          key={index}
                                          className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
                                        >
                                          {formatDateShort(fecha)} → {formatDateShort(referencia)}
                                        </span>
                                      ))}
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600 truncate">
                                {isConfiguracionPorSemanas(referencias) ? (
                                  `→ ${referencias.length > 3 
                                    ? `${referencias.slice(0, 3).join(', ')} +${referencias.length - 3} más`
                                    : referencias.join(', ')
                                  }`
                                ) : isConfiguracionPorDia(referencias) ? (
                                  `→ Configuración por día (${Object.keys(referencias.mapping).length} días)`
                                ) : ''}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-1 ml-2 flex-shrink-0">
                            <button
                              onClick={() => iniciarEdicion(semanaObj)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                              title="Editar"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => eliminarConfiguracion(semanaObj)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                              title="Eliminar"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botón "Ver más" si hay muchas configuraciones */}
                  {configuracionesFiltradas.length > 5 && !showAll && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      Ver todas las configuraciones ({configuracionesFiltradas.length - 5} más)
                    </button>
                  )}

                  {/* Botón "Ver menos" si se están mostrando todas */}
                  {showAll && configuracionesFiltradas.length > 5 && (
                    <button
                      onClick={() => setShowAll(false)}
                      className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Ver menos
                    </button>
                  )}

                  {/* Mensaje cuando no hay resultados de búsqueda */}
                  {searchTerm && configuracionesFiltradas.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      <div className="mb-2">
                        <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      No se encontraron configuraciones que coincidan con "{searchTerm}"
                    </div>
                  )}
                </div>

                {configuraciones.length === 0 && !modoEdicion && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No hay configuraciones históricas.
                    <br />
                    Haz clic en "Agregar" para crear una.
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {searchTerm && (
                      <span>Filtrado por: "{searchTerm}"</span>
                    )}
                  </div>
                  <button
                    onClick={closeDropdown}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
            </Portal>
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