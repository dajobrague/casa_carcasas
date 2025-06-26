'use client';

import { useState, useEffect } from 'react';

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

interface BulkConfigRequest {
  tiendas: string[];
  semanaObjetivo: string;
  semanasReferencia: string[];
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
      setSearchTerm('');
      setFilterPais('all');
      setPreviewData([]);
      setProcessResults({success: 0, errors: []});
    }
  }, [isOpen]);

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

  // Generar preview de cambios
  const generatePreview = () => {
    const preview = selectedTiendas.map(tiendaId => {
      const tienda = tiendas.find(t => t.id === tiendaId)!;
      const configActual = parsearConfiguracion(tienda.semanasHistoricas);
      
      // Crear nueva configuración (merge)
      const configNueva = {
        ...configActual,
        [semanaObjetivo]: semanasReferenciaSelected
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
      const response = await fetch('/api/admin/bulk-historical-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tiendas: selectedTiendas,
          semanaObjetivo,
          semanasReferencia: semanasReferenciaSelected
        } as BulkConfigRequest),
      });

      const result = await response.json();
      
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
  const canProceed = selectedTiendas.length > 0 && semanaObjetivo && semanasReferenciaSelected.length > 0;

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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semana Objetivo (Año Actual)
                  </label>
                  <select
                    value={semanaObjetivo}
                    onChange={(e) => setSemanaObjetivo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar semana objetivo...</option>
                    {semanasObjetivo.map(semana => (
                      <option key={semana.value} value={semana.value}>
                        {semana.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semanas de Referencia (Año Anterior)
                  </label>
                  <select
                    multiple
                    value={semanasReferenciaSelected}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      setSemanasReferenciaSelected(values);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32"
                  >
                    {semanasReferencia.map(semana => (
                      <option key={semana.value} value={semana.value}>
                        {semana.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Mantén presionado Ctrl/Cmd para seleccionar múltiples semanas
                  </p>
                </div>
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
                            {Object.keys(configActual).includes(semanaObjetivo) ? 'Actualizar' : 'Crear nueva'}
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
                    <p className="text-gray-600">
                      Actualizando {selectedTiendas.length} tienda(s). Por favor espera.
                    </p>
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