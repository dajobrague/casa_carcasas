'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, UserPlusIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { TIPOS_JORNADA } from './types';

interface AgregarVacanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (datos: { tipoJornada: string; horasContrato?: number }) => void;
}

export default function AgregarVacanteModal({
  isOpen,
  onClose,
  onSubmit
}: AgregarVacanteModalProps) {
  const [tipoJornada, setTipoJornada] = useState<string>(TIPOS_JORNADA.TIEMPO_COMPLETO.id);
  const [horasPersonalizadas, setHorasPersonalizadas] = useState<number | ''>('');
  const [mostrarHorasPersonalizadas, setMostrarHorasPersonalizadas] = useState(false);
  
  // Reset al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setTipoJornada(TIPOS_JORNADA.TIEMPO_COMPLETO.id);
      setHorasPersonalizadas('');
      setMostrarHorasPersonalizadas(false);
    }
  }, [isOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Obtener horas según el tipo de jornada seleccionado
    let horasContrato: number | undefined;
    
    if (mostrarHorasPersonalizadas && horasPersonalizadas !== '') {
      // Usar horas personalizadas si están habilitadas y tienen valor
      horasContrato = Number(horasPersonalizadas);
    } else {
      // Obtener horas del tipo de jornada
      const tipoSeleccionado = Object.values(TIPOS_JORNADA).find(
        tipo => tipo.id === tipoJornada
      );
      horasContrato = tipoSeleccionado?.horas || undefined;
    }
    
    // Llamar a la función onSubmit con los datos
    onSubmit({
      tipoJornada,
      horasContrato
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-70 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        <div className="absolute -top-4 -right-4">
          <button 
            onClick={onClose}
            className="bg-white rounded-full p-1.5 shadow-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Header del modal */}
        <div className="px-6 pt-6 pb-4">
          <div className="inline-flex items-center justify-center rounded-full bg-yellow-100 p-3 mb-4">
            <UserPlusIcon className="h-6 w-6 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Agregar Vacante</h2>
          <p className="text-gray-600 mt-1">
            Planifica personal futuro con una nueva vacante
          </p>
        </div>
        
        {/* Contenido del modal */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-2">
            {/* Selección de tipo de jornada */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Selecciona el tipo de jornada
              </label>
              
              <div className="grid grid-cols-3 gap-3">
                {Object.values(TIPOS_JORNADA).map((tipo) => (
                  <div 
                    key={tipo.id}
                    onClick={() => {
                      setTipoJornada(tipo.id);
                      setMostrarHorasPersonalizadas(tipo.id === TIPOS_JORNADA.TEMPORAL.id);
                    }}
                    className={`
                      relative flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${tipoJornada === tipo.id 
                        ? 'border-yellow-500 bg-yellow-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    {tipoJornada === tipo.id && (
                      <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full">
                        <CheckCircleIcon className="h-5 w-5 text-white" />
                      </div>
                    )}
                    
                    <ClockIcon className={`h-8 w-8 mb-2 ${tipoJornada === tipo.id ? 'text-yellow-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-center">{tipo.label}</span>
                    {tipo.horas && (
                      <span className="text-xs text-gray-500 mt-1">{tipo.horas}h/semana</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Campo de horas personalizadas */}
            <div className={`mb-6 transition-all ${mostrarHorasPersonalizadas || tipoJornada === TIPOS_JORNADA.TEMPORAL.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
              <label htmlFor="horasPersonalizadas" className="block text-sm font-medium text-gray-700 mb-2">
                Horas semanales
              </label>
              <div className="relative rounded-md">
                <input
                  type="number"
                  id="horasPersonalizadas"
                  value={horasPersonalizadas}
                  onChange={(e) => setHorasPersonalizadas(e.target.value === '' ? '' : Number(e.target.value))}
                  min="1"
                  max="80"
                  placeholder="Ej: 25"
                  className="block w-full rounded-md border-gray-300 pl-4 pr-12 focus:border-yellow-500 focus:ring-yellow-500 text-lg"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">horas</span>
                </div>
              </div>
            </div>
            
            {/* Opción para personalizar horas si no es Temporal */}
            {tipoJornada !== TIPOS_JORNADA.TEMPORAL.id && (
              <div className="flex items-center mb-4">
                <button
                  type="button"
                  onClick={() => setMostrarHorasPersonalizadas(!mostrarHorasPersonalizadas)}
                  className={`inline-flex items-center text-sm ${mostrarHorasPersonalizadas ? 'text-yellow-600' : 'text-gray-700'}`}
                >
                  <span className={`w-4 h-4 mr-2 inline-flex items-center justify-center rounded-full border ${mostrarHorasPersonalizadas ? 'bg-yellow-500 border-yellow-500' : 'border-gray-400'}`}>
                    {mostrarHorasPersonalizadas && <span className="w-2 h-2 rounded-full bg-white"></span>}
                  </span>
                  Personalizar horas
                </button>
              </div>
            )}
          </div>
          
          {/* Footer con botones */}
          <div className="px-6 py-4 flex items-center justify-end space-x-3 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-white bg-yellow-500 hover:bg-yellow-600 transition-colors font-medium shadow-sm"
            >
              Agregar Vacante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 