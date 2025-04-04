'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Database, Table, ChevronDown, ChevronRight, X, Search, RefreshCw } from 'lucide-react';

// Tablas de interés con sus IDs
const TABLES = [
  { name: 'Tienda y Supervisor', id: 'tblpHRqsBrADEkeUL' },
  { name: 'Empleados', id: 'tblX55NaVxeYDkYGi' }
];

export default function TableInfoPage() {
  const [selectedTable, setSelectedTable] = useState<string>(TABLES[0].id);
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewSample, setViewSample] = useState<boolean>(false);
  
  // Función para obtener información de la tabla
  const fetchTableInfo = async (tableId: string) => {
    setLoading(true);
    setError(null);
    setTableInfo(null);
    
    try {
      const response = await fetch(`/api/lcdc/table-info?tableId=${tableId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener información de la tabla');
      }
      
      setTableInfo(data.tableInfo);
      
      // Inicializar expandedFields con todos los campos contraídos
      const fields = Object.keys(data.tableInfo.fields || {});
      const initialExpanded: Record<string, boolean> = {};
      fields.forEach(field => {
        initialExpanded[field] = false;
      });
      setExpandedFields(initialExpanded);
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar datos cuando cambia la tabla seleccionada
  useEffect(() => {
    if (selectedTable) {
      fetchTableInfo(selectedTable);
    }
  }, [selectedTable]);
  
  // Filtrar campos basados en la búsqueda
  const filteredFields = tableInfo?.fields 
    ? Object.entries(tableInfo.fields).filter(([fieldName]) => 
        fieldName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  
  // Manejar expansión/contracción de un campo
  const toggleField = (fieldName: string) => {
    setExpandedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo y título */}
            <div className="flex items-center">
              <div className="relative h-10 w-24 mr-3">
                <Image 
                  src="/images/a1f5f4d1aeb6ac161feb1b4d91bda0240020897d.png" 
                  alt="Casa de las Carcasas Logo"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <div className="border-l-2 border-gray-200 pl-3">
                <div className="text-gray-900 text-lg font-bold">Administración</div>
                <div className="text-sm text-blue-600 font-medium">Información de Tablas</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h1 className="text-xl font-bold text-gray-900">Inspección de Tablas Airtable</h1>
              <p className="mt-1 text-sm text-gray-500">
                Visualiza la estructura y campos de las tablas para facilitar la integración
              </p>
            </div>
            
            <div className="p-6">
              {/* Selector de tabla */}
              <div className="mb-6">
                <label className="block mb-2 font-medium text-gray-700">Seleccionar tabla</label>
                <div className="grid grid-cols-2 gap-3">
                  {TABLES.map(table => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table.id)}
                      className={`flex items-center justify-center px-4 py-3 rounded-lg border ${
                        selectedTable === table.id 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Table className="w-5 h-5 mr-2" />
                      <span>{table.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Búsqueda y acciones */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Buscar campos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewSample(!viewSample)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                      viewSample ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {viewSample ? 'Ocultar Registros' : 'Ver Registros'}
                  </button>
                  
                  <button
                    onClick={() => fetchTableInfo(selectedTable)}
                    className="px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Actualizar
                  </button>
                </div>
              </div>
              
              {/* Contenido de la tabla */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                  <p className="font-medium">Error al obtener información de la tabla</p>
                  <p className="text-sm">{error}</p>
                </div>
              ) : tableInfo ? (
                <div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                    <div className="flex items-center mb-2">
                      <Database className="w-5 h-5 text-blue-600 mr-2" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        {TABLES.find(t => t.id === tableInfo.tableId)?.name || tableInfo.tableId}
                      </h2>
                    </div>
                    <p className="text-sm text-gray-600">
                      ID: <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">{tableInfo.tableId}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Total campos: <span className="font-medium">{Object.keys(tableInfo.fields).length}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Registros de muestra: <span className="font-medium">{tableInfo.recordCount}</span>
                    </p>
                  </div>
                  
                  {/* Lista de campos */}
                  <div className="space-y-2">
                    {filteredFields.length > 0 ? (
                      filteredFields.map(([fieldName, fieldData]: [string, any]) => (
                        <div key={fieldName} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleField(fieldName)}
                            className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 px-4 py-3 text-left"
                          >
                            <div className="flex items-center">
                              <span className="font-medium">{fieldName}</span>
                              <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                {fieldData.type}
                              </span>
                            </div>
                            {expandedFields[fieldName] ? 
                              <ChevronDown className="h-5 w-5 text-gray-400" /> : 
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            }
                          </button>
                          
                          {expandedFields[fieldName] && (
                            <div className="p-4 border-t border-gray-200">
                              {/* Ejemplos */}
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700 mb-1">Ejemplos:</p>
                                <div className="space-y-1">
                                  {fieldData.examples.length > 0 ? (
                                    fieldData.examples.map((example: any, i: number) => (
                                      <div key={i} className="text-sm bg-gray-50 p-2 rounded border border-gray-200">
                                        {typeof example === 'object' 
                                          ? JSON.stringify(example, null, 2) 
                                          : String(example)
                                        }
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-gray-500 italic">No hay ejemplos disponibles</p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Valores posibles (para campos tipo enumeración) */}
                              {fieldData.possibleValues && fieldData.possibleValues.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-1">Valores posibles:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {fieldData.possibleValues.map((value: string, i: number) => (
                                      <span 
                                        key={i} 
                                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100"
                                      >
                                        {value}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-center py-10">
                        No se encontraron campos que coincidan con la búsqueda
                      </div>
                    )}
                  </div>
                  
                  {/* Ver registros de muestra */}
                  {viewSample && tableInfo.sampleRecords && tableInfo.sampleRecords.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Registros de Muestra</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ID
                              </th>
                              {Object.keys(tableInfo.sampleRecords[0]?.fields || {})
                                .filter(fieldName => !searchQuery || fieldName.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(fieldName => (
                                  <th 
                                    key={fieldName} 
                                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    {fieldName}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {tableInfo.sampleRecords.map((record: any) => (
                              <tr key={record.id} className="hover:bg-gray-50">
                                <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                                  {record.id}
                                </td>
                                {Object.entries(record.fields)
                                  .filter(([fieldName]) => !searchQuery || fieldName.toLowerCase().includes(searchQuery.toLowerCase()))
                                  .map(([fieldName, fieldValue]) => (
                                    <td key={fieldName} className="px-3 py-4 whitespace-nowrap text-sm text-gray-800">
                                      {typeof fieldValue === 'object' 
                                        ? JSON.stringify(fieldValue) 
                                        : String(fieldValue).length > 50 
                                          ? String(fieldValue).substring(0, 50) + '...' 
                                          : String(fieldValue)
                                      }
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} La Casa de las Carcasas - Herramienta de Administración
          </p>
        </div>
      </footer>
    </div>
  );
} 