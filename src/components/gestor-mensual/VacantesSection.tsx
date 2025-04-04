'use client';

import { useState, useEffect } from 'react';
import { useMensual } from './MensualContext';
import { obtenerVacantes } from './api';
import { VacanteRecord, TIPOS_JORNADA } from './types';
import GrupoHeader from './GrupoHeader';

export default function VacantesSection() {
  const { 
    tiendaId, 
    mesSeleccionado, 
    vacantes, 
    setVacantes, 
    setError, 
    loading, 
    setLoading 
  } = useMensual();

  const [grupoPorTipo, setGrupoPorTipo] = useState<{ [key: string]: VacanteRecord[] }>({});
  const [gruposColapsados, setGruposColapsados] = useState<{ [key: string]: boolean }>({});

  // Cargar vacantes cuando el tiendaId o mesSeleccionado cambian
  useEffect(() => {
    const cargarVacantes = async () => {
      if (!tiendaId) return;
      
      try {
        setLoading(true);
        const vacantesData = await obtenerVacantes(tiendaId);
        setVacantes(vacantesData);
      } catch (error) {
        console.error('Error al cargar vacantes:', error);
        setError('Error al cargar las vacantes');
        setVacantes([]);
      } finally {
        setLoading(false);
      }
    };
    
    cargarVacantes();
  }, [tiendaId, mesSeleccionado, setVacantes, setError, setLoading]);

  // Agrupar vacantes por tipo de jornada
  useEffect(() => {
    const grupos: { [key: string]: VacanteRecord[] } = {};
    
    // Inicializar grupos para que aparezcan aunque estén vacíos
    Object.values(TIPOS_JORNADA).forEach(tipo => {
      grupos[tipo.id] = [];
    });
    
    // Agrupar vacantes por tipo de jornada
    vacantes.forEach(vacante => {
      const tipoJornada = vacante.fields.TipoJornada;
      if (!grupos[tipoJornada]) {
        grupos[tipoJornada] = [];
      }
      grupos[tipoJornada].push(vacante);
    });
    
    setGrupoPorTipo(grupos);
  }, [vacantes]);

  // Manejar el colapso de un grupo
  const handleCollapseToggle = (tipoJornada: string, collapsed: boolean) => {
    setGruposColapsados(prev => ({
      ...prev,
      [tipoJornada]: collapsed
    }));
  };

  // Obtener ícono para cada tipo de jornada
  const getIconoTipoJornada = (tipoJornada: string) => {
    switch (tipoJornada) {
      case TIPOS_JORNADA.TIEMPO_COMPLETO.id:
        return '🔵';
      case TIPOS_JORNADA.MEDIO_TIEMPO.id:
        return '🟠';
      case TIPOS_JORNADA.TEMPORAL.id:
        return '🟢';
      default:
        return '👤';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
          <span className="text-xl">📌</span>
          Vacantes
        </h2>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
          <span>➕</span> Agregar Vacante
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center p-10">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Cargando vacantes...</span>
        </div>
      ) : vacantes.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-500">No hay vacantes disponibles en esta tienda.</p>
          <button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Agregar Nueva Vacante
          </button>
        </div>
      ) : (
        <div>
          {Object.entries(grupoPorTipo).map(([tipoJornada, vacantesGrupo]) => (
            <div key={tipoJornada} className="mb-4">
              {vacantesGrupo.length > 0 && (
                <>
                  <GrupoHeader
                    titulo={tipoJornada}
                    icono={getIconoTipoJornada(tipoJornada)}
                    cantidad={vacantesGrupo.length}
                    collapsed={gruposColapsados[tipoJornada]}
                    onCollapseToggle={(collapsed) => handleCollapseToggle(tipoJornada, collapsed)}
                  />
                  
                  {!gruposColapsados[tipoJornada] && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {vacantesGrupo.map(vacante => (
                        <div 
                          key={vacante.id} 
                          className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="font-medium text-gray-800 flex items-center justify-between">
                            <span>Vacante {vacante.fields.CodigoEmpleado}</span>
                            <span className="bg-amber-100 text-amber-700 px-2 py-1 text-xs rounded-full">Pendiente</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {tipoJornada}
                            {vacante.fields.HorasContrato && (
                              <span className="ml-2">({vacante.fields.HorasContrato} horas)</span>
                            )}
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                            <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md text-sm transition-colors">
                              Asignar
                            </button>
                            <button className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-md text-sm transition-colors">
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 