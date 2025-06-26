'use client';

import { useState, useEffect } from 'react';

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

interface ConfiguracionPorDia {
  type: 'comparable_por_dia';
  mapping: Record<string, string>; // fecha objetivo -> fecha referencia
}

type ConfiguracionHistoricaItem = string[] | ConfiguracionPorDia;

interface ConfiguracionHistorica {
  [semanaObjetivo: string]: ConfiguracionHistoricaItem;
}

interface BulkConfigRequest {
  tiendas: string[];
  semanaObjetivo: string;
  semanasReferencia?: string[];
  tipoConfiguracion: 'por_semanas' | 'por_dia';
  mappingPorDia?: Record<string, string>;
}

interface BulkConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiendas: Tienda[];
  semanasObjetivo: SemanaOption[];
  semanasReferencia: SemanaOption[];
  onSuccess: () => void;
}

export default function BulkConfigModal({
  isOpen,
  onClose,
  tiendas,
  semanasObjetivo,
  semanasReferencia,
  onSuccess
}: BulkConfigModalProps) {
  const [currentStep, setCurrentStep] = useState<'config' | 'preview' | 'processing'>('config');
  
  // Estados para la configuración
  const [selectedTiendas, setSelectedTiendas] = useState<string[]>([]);
  const [semanaObjetivo, setSemanaObjetivo] = useState<string>('');
  const [semanasReferenciaSelected, setSemanasReferenciaSelected] = useState<string[]>([]);
  const [semanaObjetivoSearch, setSemanaObjetivoSearch] = useState<string>('');
  const [semanaReferenciaSearch, setSemanaReferenciaSearch] = useState<string>('');
  const [showObjetivoDropdown, setShowObjetivoDropdown] = useState<boolean>(false);
  const [showReferenciaDropdown, setShowReferenciaDropdown] = useState<boolean>(false);
  
  // Estados para configuración por día
  const [tipoConfiguracion, setTipoConfiguracion] = useState<'por_semanas' | 'por_dia'>('por_semanas');
  const [mappingPorDia, setMappingPorDia] = useState<Record<string, string>>({});
  
  // Estados para filtros de tiendas
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPais, setFilterPais] = useState<string>('all');
  const [paisesUnicos, setPaisesUnicos] = useState<string[]>([]);
  
  // Estados para preview y procesamiento
  const [previewData, setPreviewData] = useState<{tienda: Tienda, configActual: ConfiguracionHistorica, configNueva: ConfiguracionHistorica}[]>([]);
  const [processResults, setProcessResults] = useState<{success: number, errors: string[]}>({success: 0, errors: []});

  // Obtener países únicos cuando cambian las tiendas
  useEffect(() => {
    const paises = [...new Set(tiendas.map(t => t.pais).filter(Boolean) as string[])].sort();
    setPaisesUnicos(paises);
  }, [tiendas]);

  // Resetear modal cuando se abre/cierra
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('config');
      setSelectedTiendas([]);
      setSemanaObjetivo('');
      setSemanasReferenciaSelected([]);
      setSemanaObjetivoSearch('');
      setSemanaReferenciaSearch('');
      setShowObjetivoDropdown(false);
      setShowReferenciaDropdown(false);
      setSearchTerm('');
      setFilterPais('all');
      setPreviewData([]);
      setProcessResults({success: 0, errors: []});
      setTipoConfiguracion('por_semanas');
      setMappingPorDia({});
    }
  }, [isOpen]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Cerrar dropdown de semana objetivo si el clic no está dentro del componente
      if (showObjetivoDropdown && !target.closest('.semana-objetivo-container')) {
        setShowObjetivoDropdown(false);
      }
      
      // Cerrar dropdown de semanas de referencia si el clic no está dentro del componente
      if (showReferenciaDropdown && !target.closest('.semana-referencia-container')) {
        setShowReferenciaDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, showObjetivoDropdown, showReferenciaDropdown]);

  // Parsear configuración histórica desde JSON
  const parsearConfiguracion = (jsonString: string): ConfiguracionHistorica => {
    if (!jsonString || jsonString.trim() === '') {
      return {};
    }
    try {
      const config = JSON.parse(jsonString);
      return typeof config === 'object' && config !== null && !Array.isArray(config) ? config : {};
    } catch {
      return {};
    }
  };

  // Filtrar tiendas basado en búsqueda y filtros
  const tiendasFiltradas = tiendas.filter(tienda => {
    const matchesSearch = !searchTerm || 
      tienda.numero.toString().includes(searchTerm.toLowerCase()) ||
      tienda.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tienda.pais.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPais = filterPais === 'all' || tienda.pais === filterPais;
    
    return matchesSearch && matchesPais;
  });

  // Filtrar semanas objetivo
  const semanasObjetivoFiltradas = semanasObjetivo.filter(semana =>
    semana.label.toLowerCase().includes(semanaObjetivoSearch.toLowerCase()) ||
    semana.value.toLowerCase().includes(semanaObjetivoSearch.toLowerCase())
  );

  // Filtrar semanas de referencia
  const semanasReferenciaFiltradas = semanasReferencia.filter(semana =>
    semana.label.toLowerCase().includes(semanaReferenciaSearch.toLowerCase()) ||
    semana.value.toLowerCase().includes(semanaReferenciaSearch.toLowerCase())
  );

  // Manejar selección de semana de referencia
  const toggleSemanaReferencia = (semanaValue: string) => {
    setSemanasReferenciaSelected(prev => 
      prev.includes(semanaValue) 
        ? prev.filter(s => s !== semanaValue)
        : [...prev, semanaValue]
    );
  };

  // Manejar selección de tienda
  const toggleTienda = (tiendaId: string) => {
    setSelectedTiendas(prev => 
      prev.includes(tiendaId) 
        ? prev.filter(id => id !== tiendaId)
        : [...prev, tiendaId]
    );
  };

  // Seleccionar/deseleccionar todas las tiendas filtradas
  const toggleAllTiendas = () => {
    const filteredIds = tiendasFiltradas.map(t => t.id);
    const allSelected = filteredIds.every(id => selectedTiendas.includes(id));
    
    if (allSelected) {
      setSelectedTiendas(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedTiendas(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  // Función para cambiar tipo de configuración
  const cambiarTipoConfiguracion = (nuevoTipo: 'por_semanas' | 'por_dia') => {
    setTipoConfiguracion(nuevoTipo);
    
    if (nuevoTipo === 'por_dia') {
      // Si cambiar a por día, generar mapping por defecto basado en la semana objetivo
      if (semanaObjetivo) {
        const diasSemana = getWeekDays(semanaObjetivo);
        const defaultMapping = generateDefaultDayMapping(diasSemana);
        setMappingPorDia(defaultMapping);
      }
      setSemanasReferenciaSelected([]);
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

  // Generar preview de cambios
  const generatePreview = () => {
    const preview = selectedTiendas.map(tiendaId => {
      const tienda = tiendas.find(t => t.id === tiendaId)!;
      const configActual = parsearConfiguracion(tienda.semanasHistoricas);
      
      // Crear nueva configuración (merge)
      let nuevaConfigItem: ConfiguracionHistoricaItem;
      
      if (tipoConfiguracion === 'por_semanas') {
        nuevaConfigItem = semanasReferenciaSelected;
      } else {
        nuevaConfigItem = {
          type: 'comparable_por_dia',
          mapping: {...mappingPorDia}
        };
      }
      
      const configNueva = {
        ...configActual,
        [semanaObjetivo]: nuevaConfigItem
      };
      
      return { tienda, configActual, configNueva };
    });
    
    setPreviewData(preview);
    setCurrentStep('preview');
  };

  // Aplicar configuración masiva
  const applyBulkConfig = async () => {
    setCurrentStep('processing');
    
    try {
      console.log(`🚀 Iniciando actualización masiva de ${selectedTiendas.length} tiendas...`);
      const startTime = Date.now();
      
      const requestBody: BulkConfigRequest = {
        tiendas: selectedTiendas,
        semanaObjetivo,
        tipoConfiguracion
      };

      if (tipoConfiguracion === 'por_semanas') {
        requestBody.semanasReferencia = semanasReferenciaSelected;
      } else {
        requestBody.mappingPorDia = mappingPorDia;
      }

      const response = await fetch('/api/admin/bulk-historical-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ Actualización completada en ${duration}ms (${(duration/1000).toFixed(2)}s)`);
      
      if (response.ok) {
        setProcessResults(result);
        
        // Mostrar notificación de éxito
        if (result.success > 0) {
          // Crear notificación
          const notification = document.createElement('div');
          notification.className = `
            fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 
            bg-green-100 border-l-4 border-green-500 text-green-700
          `;
          
          notification.innerHTML = `
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium">✅ ${result.success} tienda(s) actualizada(s) correctamente</p>
              </div>
            </div>
          `;

          document.body.appendChild(notification);
          setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
          }, 4000);
        }
        
        // Cerrar modal y refrescar después de un breve delay
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
        
      } else {
        throw new Error(result.error || 'Error al aplicar configuración masiva');
      }
    } catch (error) {
      console.error('Error:', error);
      setProcessResults({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      });
    }
  };

  // Validar si se puede continuar
  const canProceed = selectedTiendas.length > 0 && semanaObjetivo && (
    (tipoConfiguracion === 'por_semanas' && semanasReferenciaSelected.length > 0) ||
    (tipoConfiguracion === 'por_dia' && Object.keys(mappingPorDia).length > 0)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Aplicar Configuración a Múltiples Tiendas</h2>
              <p className="text-blue-100 text-sm mt-1">
                {currentStep === 'config' && 'Selecciona tiendas y configuración'}
                {currentStep === 'preview' && 'Revisa los cambios antes de aplicar'}
                {currentStep === 'processing' && 'Aplicando configuración...'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white transition-colors"
              disabled={currentStep === 'processing'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {currentStep === 'config' && (
            <div className="p-6 space-y-6">
              {/* Configuración de semanas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Semana Objetivo - Dropdown con búsqueda */}
                <div className="relative semana-objetivo-container">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semana Objetivo (Año Actual)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar semana objetivo..."
                      value={semanaObjetivoSearch}
                      onChange={(e) => setSemanaObjetivoSearch(e.target.value)}
                      onFocus={() => setShowObjetivoDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {showObjetivoDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {semanasObjetivoFiltradas.map(semana => (
                          <div
                            key={semana.value}
                            onClick={() => {
                              setSemanaObjetivo(semana.value);
                              setSemanaObjetivoSearch(semana.label);
                              setShowObjetivoDropdown(false);
                              
                              // Si está en modo por día, regenerar mapping
                              if (tipoConfiguracion === 'por_dia') {
                                const diasSemana = getWeekDays(semana.value);
                                const defaultMapping = generateDefaultDayMapping(diasSemana);
                                setMappingPorDia(defaultMapping);
                              }
                            }}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${
                              semanaObjetivo === semana.value ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
                            }`}
                          >
                            {semana.label}
                          </div>
                        ))}
                        {semanasObjetivoFiltradas.length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No se encontraron semanas
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {semanaObjetivo && (
                    <div className="mt-2 text-sm text-blue-600">
                      Seleccionada: {semanasObjetivo.find(s => s.value === semanaObjetivo)?.label}
                    </div>
                  )}
                </div>

                {/* Toggle para tipo de configuración */}
                <div className="col-span-full">
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
              </div>

              {/* Configuración por semanas */}
              {tipoConfiguracion === 'por_semanas' && (
                <div className="relative semana-referencia-container">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semanas de Referencia (Año Anterior)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar semanas de referencia..."
                      value={semanaReferenciaSearch}
                      onChange={(e) => setSemanaReferenciaSearch(e.target.value)}
                      onFocus={() => setShowReferenciaDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {showReferenciaDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {semanasReferenciaFiltradas.map(semana => (
                          <div
                            key={semana.value}
                            onClick={() => toggleSemanaReferencia(semana.value)}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors flex items-center space-x-2 ${
                              semanasReferenciaSelected.includes(semana.value) ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={semanasReferenciaSelected.includes(semana.value)}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span>{semana.label}</span>
                          </div>
                        ))}
                        {semanasReferenciaFiltradas.length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            No se encontraron semanas
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {semanasReferenciaSelected.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm text-blue-600 mb-1">
                        Seleccionadas ({semanasReferenciaSelected.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {semanasReferenciaSelected.map(semanaValue => {
                          const semana = semanasReferencia.find(s => s.value === semanaValue);
                          return (
                            <span
                              key={semanaValue}
                              onClick={() => toggleSemanaReferencia(semanaValue)}
                              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full cursor-pointer hover:bg-blue-200 transition-colors"
                            >
                              {semana?.label}
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Haz clic en las semanas para seleccionar múltiples
                  </p>
                </div>
              )}

              {/* Configuración por día */}
              {tipoConfiguracion === 'por_dia' && semanaObjetivo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Configuración por Día ({Object.keys(mappingPorDia).length} días configurados)
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded border">
                    {getWeekDays(semanaObjetivo).map((fecha, index) => {
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

              <div>
              </div>

              {/* Filtros de tiendas */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Seleccionar Tiendas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Buscar por número, nombre o país..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <select
                      value={filterPais}
                      onChange={(e) => setFilterPais(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Todos los países</option>
                      {paisesUnicos.map(pais => (
                        <option key={pais} value={pais}>
                          {pais}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Control de selección múltiple */}
                <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">
                    {selectedTiendas.length} de {tiendas.length} tiendas seleccionadas
                  </span>
                  <button
                    onClick={toggleAllTiendas}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {tiendasFiltradas.every(t => selectedTiendas.includes(t.id)) 
                      ? 'Deseleccionar visibles' 
                      : 'Seleccionar visibles'
                    }
                  </button>
                </div>

                {/* Lista de tiendas */}
                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                  {tiendasFiltradas.map(tienda => (
                    <div
                      key={tienda.id}
                      onClick={() => toggleTienda(tienda.id)}
                      className={`p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedTiendas.includes(tienda.id) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedTiendas.includes(tienda.id)}
                          onChange={() => toggleTienda(tienda.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">#{tienda.numero}</span>
                            <span className="text-gray-700">{tienda.nombre}</span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              {tienda.pais}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {tiendasFiltradas.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay tiendas que coincidan con los filtros
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Confirmación de Cambios
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Se aplicará la siguiente configuración:
                      </p>
                      <ul className="text-sm text-blue-800 mt-1">
                        <li><strong>Semana objetivo:</strong> {semanaObjetivo}</li>
                        <li><strong>Semanas de referencia:</strong> {semanasReferenciaSelected.join(', ')}</li>
                        <li><strong>Tiendas afectadas:</strong> {selectedTiendas.length}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Tiendas que se actualizarán:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {previewData.map(({ tienda, configActual, configNueva }) => (
                    <div key={tienda.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium text-gray-900">
                            #{tienda.numero} - {tienda.nombre}
                          </h5>
                          <span className="text-sm text-gray-500">{tienda.pais}</span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-600">
                            Configuraciones actuales: {Object.keys(configActual).length}
                          </div>
                          <div className="text-blue-600 font-medium">
                            {configActual[semanaObjetivo] ? 'Actualizar' : 'Crear nueva'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'processing' && (
            <div className="p-6">
              <div className="text-center py-8">
                {processResults.success === 0 && processResults.errors.length === 0 ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aplicando configuración...
                    </h3>
                    <p className="text-gray-600 mb-2">
                      Actualizando {selectedTiendas.length} tienda(s) en paralelo.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Procesamiento optimizado activado - Esto debería tomar solo unos segundos</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-6">
                      {processResults.success > 0 && (
                        <div className="flex items-center justify-center text-green-600 mb-4">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      )}
                      
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Proceso Completado
                      </h3>
                      
                      <div className="space-y-2">
                        {processResults.success > 0 && (
                          <p className="text-green-600 font-medium">
                            ✅ {processResults.success} tienda(s) actualizada(s) correctamente
                          </p>
                        )}
                        
                        {processResults.errors.length > 0 && (
                          <div className="text-red-600">
                            <p className="font-medium">❌ Errores encontrados:</p>
                            <ul className="text-sm mt-1 space-y-1">
                              {processResults.errors.map((error, index) => (
                                <li key={index} className="text-left">• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex justify-between">
          <button
            onClick={() => {
              if (currentStep === 'preview') {
                setCurrentStep('config');
              } else {
                onClose();
              }
            }}
            disabled={currentStep === 'processing'}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            {currentStep === 'preview' ? 'Volver' : 'Cancelar'}
          </button>
          
          <div className="space-x-3">
            {currentStep === 'config' && (
              <button
                onClick={generatePreview}
                disabled={!canProceed}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Revisar Cambios
              </button>
            )}
            
            {currentStep === 'preview' && (
              <button
                onClick={applyBulkConfig}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Aplicar Configuración
              </button>
            )}
            
            {currentStep === 'processing' && processResults.success > 0 && (
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Finalizar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 