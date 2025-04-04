'use client';

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, UserIcon, MagnifyingGlassIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { EmpleadoRecord, TIPOS_JORNADA } from './types';
import { buscarEmpleados } from './api';

interface AsignarEmpleadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vacante: EmpleadoRecord | null;
  onSubmit: (datos: {
    Nombre: string;
    Apellidos: string;
    CodigoEmpleado: string;
    'Status Empleado': string;
    Perfil: string;
  }) => void;
}

export default function AsignarEmpleadoModal({
  isOpen,
  onClose,
  vacante,
  onSubmit
}: AsignarEmpleadoModalProps) {
  // Estado para la búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [empleadosEncontrados, setEmpleadosEncontrados] = useState<EmpleadoRecord[]>([]);
  
  // Estado para errores
  const [error, setError] = useState<string | null>(null);
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoRecord | null>(null);
  
  // Referencia para el debounce
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Reset al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setIsSearching(false);
      setEmpleadosEncontrados([]);
      setError(null);
      setSelectedEmpleado(null);
    }
  }, [isOpen]);
  
  // Búsqueda instantánea mientras se escribe
  useEffect(() => {
    // No buscar con menos de 2 caracteres
    if (!searchTerm || searchTerm.length < 2) {
      setEmpleadosEncontrados([]);
      setError(null);
      return;
    }
    
    // Cancelar cualquier búsqueda anterior
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Iniciar animación de búsqueda inmediatamente
    setIsSearching(true);
    
    // Esperar un corto tiempo antes de buscar para evitar demasiadas búsquedas
    // mientras el usuario sigue escribiendo
    searchTimeout.current = setTimeout(async () => {
      try {
        // Buscar empleados
        const resultados = await buscarEmpleados(searchTerm);
        
        // Actualizar resultados
        setEmpleadosEncontrados(resultados);
        
        // Mostrar error si no hay resultados
        if (resultados.length === 0) {
          setError('No se encontraron empleados con ese criterio de búsqueda');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Error al buscar empleados:', err);
        setError('Error al buscar empleados. Intenta nuevamente.');
      } finally {
        setIsSearching(false);
      }
    }, 200); // Solo 200ms de debounce para respuesta casi instantánea
    
    // Limpiar timeout al desmontar
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm]);
  
  // Función para seleccionar un empleado de la lista
  const handleSelectEmpleado = (empleado: EmpleadoRecord) => {
    setSelectedEmpleado(empleado);
  };
  
  // Función para resaltar el texto que coincide con la búsqueda
  const resaltarCoincidencia = (texto: string) => {
    if (!searchTerm || searchTerm.trim().length < 2 || !texto) {
      return texto;
    }
    
    const termLimpio = searchTerm.trim().toLowerCase();
    const textoLower = texto.toLowerCase();
    
    // Si la búsqueda tiene múltiples palabras y el texto completo las contiene en orden
    if (termLimpio.includes(' ') && `${textoLower}`.includes(termLimpio)) {
      const index = textoLower.indexOf(termLimpio);
      const antes = texto.substring(0, index);
      const coincidencia = texto.substring(index, index + termLimpio.length);
      const despues = texto.substring(index + termLimpio.length);
      
      return (
        <>
          {antes}
          <span className="bg-yellow-200 rounded px-0.5">{coincidencia}</span>
          {despues}
        </>
      );
    }
    
    // Si la búsqueda es una sola palabra o no encontramos la coincidencia exacta
    // verificamos si contiene alguna de las palabras individuales
    if (textoLower.includes(termLimpio)) {
      const index = textoLower.indexOf(termLimpio);
      const antes = texto.substring(0, index);
      const coincidencia = texto.substring(index, index + termLimpio.length);
      const despues = texto.substring(index + termLimpio.length);
      
      return (
        <>
          {antes}
          <span className="bg-yellow-200 rounded px-0.5">{coincidencia}</span>
          {despues}
        </>
      );
    }
    
    // Si no hay coincidencia directa pero tenemos múltiples palabras,
    // verificar si alguna palabra individual coincide
    if (termLimpio.includes(' ')) {
      const palabras = termLimpio.split(/\s+/);
      
      // Si alguna palabra individual coincide, resaltarla
      for (const palabra of palabras) {
        if (textoLower.includes(palabra) && palabra.length > 1) {
          const index = textoLower.indexOf(palabra);
          const antes = texto.substring(0, index);
          const coincidencia = texto.substring(index, index + palabra.length);
          const despues = texto.substring(index + palabra.length);
          
          return (
            <>
              {antes}
              <span className="bg-yellow-100 rounded px-0.5">{coincidencia}</span>
              {despues}
            </>
          );
        }
      }
    }
    
    // Si no hay coincidencia, devolver el texto original
    return texto;
  };
  
  // Manejar el envío del formulario
  const handleSubmit = () => {
    if (!selectedEmpleado) {
      setError('Selecciona un empleado para asignar a la vacante');
      return;
    }
    
    // Enviar datos completos para la asignación
    onSubmit({
      Nombre: selectedEmpleado.fields.Nombre || '',
      Apellidos: selectedEmpleado.fields.Apellidos || '',
      CodigoEmpleado: selectedEmpleado.fields.CodigoEmpleado || '',
      'Status Empleado': 'Activo',  // Cambiar estatus a Activo
      Perfil: 'Vendedor'            // Establecer perfil como Vendedor
    });
  };
  
  if (!isOpen || !vacante) return null;
  
  // Extraer información de la vacante para mostrar - implementación más robusta
  // Comprobar múltiples posibilidades de nombres de campo para mayor compatibilidad
  const tipoJornada = 
    vacante.fields.TipoJornada || 
    vacante.fields.tipoJornada ||
    vacante.fields['Tipo de Jornada'] ||
    vacante.fields['Tipo Jornada'] || 
    'No especificada';
  
  // Comprobar diferentes formas de almacenar las horas contratadas
  let horasContrato: number | undefined = undefined;
  
  if (typeof vacante.fields.HorasContrato === 'number') {
    horasContrato = vacante.fields.HorasContrato;
  } else if (typeof vacante.fields.horasContrato === 'number') {
    horasContrato = vacante.fields.horasContrato;
  } else if (typeof vacante.fields['Horas Contrato'] === 'number') {
    horasContrato = vacante.fields['Horas Contrato'];
  } else if (typeof vacante.fields['Horas Semanales'] === 'number') {
    horasContrato = vacante.fields['Horas Semanales'];
  }
  
  const vacanteIndex = (vacante as any).vacanteIndex;
  
  // Log de depuración para ver toda la información de la vacante
  console.log("Datos de la vacante recibida:", {
    id: vacante.id,
    fields: vacante.fields,
    tipoJornada,
    horasContrato,
    vacanteIndex,
    allFields: Object.keys(vacante.fields)
  });
  
  // Buscar tipo de jornada en los tipos predefinidos
  const tipoJornadaInfo = Object.values(TIPOS_JORNADA).find(
    tipo => tipo.id.toLowerCase() === tipoJornada.toLowerCase()
  );
  
  // Determinar las horas a mostrar (prioridad a las horas personalizadas del contrato)
  let horasInfo = 'No especificado';
  let horasSource = '';
  
  if (horasContrato !== undefined && horasContrato !== null) {
    horasInfo = `${horasContrato} h/semana`;
    horasSource = 'personalizado';
  } else if (tipoJornadaInfo?.horas) {
    horasInfo = `${tipoJornadaInfo.horas} h/semana`;
    horasSource = 'estándar';
  }

  // Construir texto para sección de debug
  const debugInfo = `
    ID: ${vacante.id}
    Campos disponibles: ${Object.keys(vacante.fields).join(', ')}
    Tipo de jornada encontrado: ${tipoJornada}
    Horas contrato encontradas: ${horasContrato}
    Información de horas mostrada: ${horasInfo}
  `;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-70 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center transition-all">
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 my-8 transform transition-all">
        {/* Header del modal */}
        <div className="px-6 py-4 border-b flex items-center">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Asignar Empleado a Vacante
                {vacanteIndex !== undefined && (
                  <span className="text-yellow-600 ml-1.5">
                    #{vacanteIndex}
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Busca un empleado existente para asignar a esta vacante
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="ml-auto text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Información de la vacante - Sección mejorada */}
        <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-100">
          <h3 className="font-medium text-yellow-800 mb-2 flex items-center">
            <ClockIcon className="h-5 w-5 mr-1.5 text-yellow-700" />
            Detalles de la vacante
            {vacanteIndex !== undefined && (
              <span className="text-sm font-normal ml-2">
                #{vacanteIndex}
              </span>
            )}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-md border border-yellow-200">
              <span className="text-xs text-gray-500 block">Tipo de jornada</span>
              <span className="font-medium">{tipoJornada}</span>
            </div>
            <div className="bg-white p-3 rounded-md border border-yellow-200">
              <span className="text-xs text-gray-500 block">Horas Semanales</span>
              <span className="font-medium">{horasInfo}</span>
            </div>
          </div>
        </div>
        
        {/* Contenido del modal */}
        <div className="px-6 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-sm text-red-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
          
          {/* Campo de búsqueda - Ahora es automático */}
          <div className="mb-4">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className={`h-5 w-5 ${isSearching ? 'text-blue-500' : 'text-gray-400'}`} />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar por nombre completo o código de empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Escribe el nombre completo o código del empleado para encontrarlo instantáneamente
            </p>
            {searchTerm.includes(' ') && (
              <div className="mt-2 text-xs p-2 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                <span className="font-semibold">Modo búsqueda exacta:</span> Al escribir varias palabras, 
                solo se muestran resultados que contienen exactamente '{searchTerm}' en ese orden.
              </div>
            )}
          </div>
          
          {/* Resultados de búsqueda */}
          <div className="overflow-y-auto max-h-60">
            {empleadosEncontrados.length > 0 ? (
              <div className="space-y-2">
                {empleadosEncontrados.map((empleado) => (
                  <div 
                    key={empleado.id}
                    className={`border rounded-lg p-3 flex items-center justify-between cursor-pointer transition-all ${
                      selectedEmpleado?.id === empleado.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectEmpleado(empleado)}
                  >
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full mr-3 ${
                        selectedEmpleado?.id === empleado.id
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                      }`}>
                        <UserIcon className={`h-5 w-5 ${
                          selectedEmpleado?.id === empleado.id
                            ? 'text-blue-600'
                            : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {resaltarCoincidencia(empleado.fields.Nombre)} {resaltarCoincidencia(empleado.fields.Apellidos)}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {empleado.fields.CodigoEmpleado || 'Sin código'}
                        </p>
                      </div>
                    </div>
                    
                    {selectedEmpleado?.id === empleado.id && (
                      <div className="bg-blue-500 rounded-full p-1">
                        <CheckCircleIcon className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : searchTerm.length > 0 && !isSearching ? (
              <div className="py-6 text-center">
                <p className="text-gray-500">No se encontraron resultados. Intenta con otro término.</p>
              </div>
            ) : !searchTerm.length ? (
              <div className="py-10 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Busca un empleado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Escribe para buscar instantáneamente
                </p>
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Footer con botones */}
        <div className="px-6 py-4 flex items-center justify-end bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 mr-2"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedEmpleado}
            className={`px-4 py-2 rounded-md text-white ${
              selectedEmpleado 
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Asignar Empleado
          </button>
        </div>
      </div>
    </div>
  );
}