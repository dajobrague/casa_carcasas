'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, XMarkIcon, CheckIcon, LockClosedIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { obtenerSemanasLaborales, generarActividades, verificarActividadesGeneradas } from './api';
import { EmpleadoRecord, SemanaLaboralRecord } from './types';

interface GenerarFechasModalProps {
  empleado: EmpleadoRecord;
  mesSeleccionado: string;
  tiendaId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onProgress?: (status: 'pending' | 'success' | 'error', title: string, message: string, progress?: number) => void;
}

export default function GenerarFechasModal({ 
  empleado, 
  mesSeleccionado,
  tiendaId,
  isOpen, 
  onClose,
  onProgress
}: GenerarFechasModalProps) {
  const [semanas, setSemanas] = useState<SemanaLaboralRecord[]>([]);
  const [semanasSeleccionadas, setSemanasSeleccionadas] = useState<string[]>([]);
  const [semanasGeneradas, setSemanasGeneradas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificandoSemanas, setVerificandoSemanas] = useState(false);

  // Verificar si es una vacante
  const esVacante = empleado.fields['Status Empleado'] === 'Pendiente' || 
                    empleado.fields.Nombre === 'VACANTE';
                    
  // Obtener el índice de la vacante (si existe)
  const vacanteIndex = (empleado as any).vacanteIndex;

  // Cargar datos cuando el modal se abre
  useEffect(() => {
    // Función para cargar los datos
    async function cargarDatos() {
      try {
        console.log('GenerarFechasModal: Iniciando carga de datos');
        setLoading(true);
        setVerificandoSemanas(true);
        setError(null);
        setSemanas([]);
        setSemanasGeneradas([]);
        setSemanasSeleccionadas([]);

        // Verificar que tengamos un mes seleccionado válido
        if (!mesSeleccionado || typeof mesSeleccionado !== 'string') {
          console.error('GenerarFechasModal: Error - mes seleccionado no válido:', mesSeleccionado);
          setError('Error: No se ha seleccionado un mes válido.');
          setLoading(false);
          setVerificandoSemanas(false);
          return;
        }

        // Determinar si estamos cargando para un empleado o una vacante
        const esVacante = empleado.fields['Status Empleado'] === 'Pendiente' || 
                          empleado.fields.Nombre === 'VACANTE';
        
        console.log(`GenerarFechasModal: Cargando datos para ${esVacante ? 'VACANTE' : 'EMPLEADO'} con ID:`, empleado.id);

        // Convertir el mes a minúsculas para la búsqueda en Airtable
        const mesBusqueda = mesSeleccionado.toLowerCase().trim();
        console.log('GenerarFechasModal: Buscando semanas para el mes:', mesBusqueda);

        // Obtener semanas laborales para el mes seleccionado, pasando el ID del empleado/vacante para prevenir caché compartida
        console.log('GenerarFechasModal: Llamando a obtenerSemanasLaborales');
        const semanasData = await obtenerSemanasLaborales(mesBusqueda, empleado.id);
        console.log('GenerarFechasModal: Semanas obtenidas:', semanasData?.length || 0);
        
        if (!semanasData) {
          console.error('GenerarFechasModal: Error - respuesta no válida de obtenerSemanasLaborales: null o undefined');
          setError('Error: No se pudieron obtener las semanas laborales (respuesta vacía).');
          setLoading(false);
          setVerificandoSemanas(false);
          return;
        }
        
        if (!Array.isArray(semanasData)) {
          console.error('GenerarFechasModal: Error - respuesta no es un array:', typeof semanasData);
          setError('Error: Formato de respuesta incorrecto al obtener semanas laborales.');
          setLoading(false);
          setVerificandoSemanas(false);
          return;
        }
        
        if (semanasData.length === 0) {
          console.warn('GenerarFechasModal: No se encontraron semanas para el mes:', mesBusqueda);
          // No es un error, simplemente no hay semanas para mostrar
          setSemanas([]);
          setLoading(false);
          setVerificandoSemanas(false);
          return;
        }
        
        // Verificar la estructura de los datos
        if (!semanasData[0]?.id || !semanasData[0]?.fields) {
          console.error('GenerarFechasModal: Error - estructura incorrecta de semanas:', semanasData[0]);
          setError('Error: Estructura de datos incorrecta en las semanas laborales.');
          setLoading(false);
          setVerificandoSemanas(false);
          return;
        }
        
        console.log('GenerarFechasModal: Estructura de la primera semana:', {
          id: semanasData[0].id,
          nombre: semanasData[0].fields.Name || 'Sin nombre',
          mes: semanasData[0].fields.Mes || 'Sin mes'
        });
        
        setSemanas(semanasData);
        
        // Si es una vacante, sabemos que no tiene semanas generadas aún
        if (esVacante) {
          console.log('GenerarFechasModal: Optimización - Vacante sin verificar actividades generadas');
          setSemanasGeneradas([]);
          setLoading(false);
          setVerificandoSemanas(false);
          return;
        }
        
        // Verificar qué semanas ya tienen actividad generada para este empleado
        console.log('GenerarFechasModal: Verificando actividades generadas para empleado:', empleado.id);
        try {
          const actividadesGeneradas = await verificarActividadesGeneradas(empleado.id);
          console.log('GenerarFechasModal: Semanas ya generadas:', actividadesGeneradas?.length || 0);
          
          if (!actividadesGeneradas) {
            console.warn('GenerarFechasModal: Respuesta nula de verificarActividadesGeneradas');
            setSemanasGeneradas([]);
          } else if (!Array.isArray(actividadesGeneradas)) {
            console.warn('GenerarFechasModal: Respuesta no es un array:', typeof actividadesGeneradas);
            setSemanasGeneradas([]);
          } else {
            if (actividadesGeneradas.length > 0) {
              console.log('GenerarFechasModal: Ejemplo de semana generada:', actividadesGeneradas[0]);
            }
            setSemanasGeneradas(actividadesGeneradas);
          }
        } catch (verifyError) {
          console.error('GenerarFechasModal: Error al verificar actividades generadas:', verifyError);
          // No bloqueamos todo el flujo si falla la verificación
          setSemanasGeneradas([]);
        }
        
        setLoading(false);
        setVerificandoSemanas(false);
        console.log('GenerarFechasModal: Carga de datos completada');
      } catch (err) {
        console.error('GenerarFechasModal: Error al cargar semanas:', err);
        setError(`Error al cargar datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        setSemanas([]);
        setLoading(false);
        setVerificandoSemanas(false);
      }
    }

    if (isOpen) {
      console.log('GenerarFechasModal: Modal abierto, iniciando carga de datos');
      cargarDatos();
    } else {
      console.log('GenerarFechasModal: Modal cerrado, no se cargan datos');
    }
  }, [isOpen, mesSeleccionado, empleado.id]);

  // Manejar selección de semana
  const toggleSeleccionSemana = (semanaId: string) => {
    // No permitir seleccionar semanas que ya tienen actividad generada
    if (semanasGeneradas.includes(semanaId)) {
      return;
    }
    
    setSemanasSeleccionadas(prev => {
      if (prev.includes(semanaId)) {
        return prev.filter(id => id !== semanaId);
      } else {
        return [...prev, semanaId];
      }
    });
  };

  // Generar fechas para las semanas seleccionadas
  const handleGenerarFechas = async () => {
    if (semanasSeleccionadas.length === 0) {
      alert('Por favor, seleccione al menos una semana');
      return;
    }

    if (!tiendaId) {
      alert('Error: No se ha identificado la tienda');
      return;
    }

    try {
      // Iniciar progreso
      if (onProgress) {
        onProgress('pending', 'Generando actividades', `Preparando generación para ${empleado.fields.Nombre} ${empleado.fields.Apellidos}`, 5);
      }
      
      // Cerrar el modal y continuar la generación en segundo plano
      onClose();
      
      console.log('Generando actividades con:', {
        empleadoId: empleado.id,
        semanasIds: semanasSeleccionadas,
        tiendaId
      });
      
      // Generación real de actividades con callback de progreso
      const resultado = await generarActividades(
        empleado.id, 
        semanasSeleccionadas, 
        tiendaId,
        (mensaje, progreso) => {
          if (onProgress) {
            // Calcular progreso entre 15% y 90% para dejar espacio para los pasos inicial y final
            const progresoAjustado = 15 + (progreso * 0.75);
            onProgress('pending', 'Generando actividades', mensaje, progresoAjustado);
          }
        }
      );
      
      console.log('Resultado de generación:', resultado);
      
      // Actualizar el progreso con el resultado final
      if (resultado.resultados.errores && resultado.resultados.errores.length > 0) {
        const mensajeError = `Proceso completado con advertencias: ${resultado.resultados.errores.length} errores encontrados`;
        if (onProgress) {
          onProgress('error', 'Generación con errores', mensajeError, 100);
        }
      } else {
        const mensajeExito = `Se crearon ${resultado.resultados.actividadesSemanales} actividades semanales y ${resultado.resultados.actividadesDiarias} actividades diarias.`;
        if (onProgress) {
          onProgress('success', 'Generación exitosa', mensajeExito, 100);
        }
      }
      
    } catch (err) {
      console.error('GenerarFechasModal: Error al generar fechas:', err);
      
      // Mostrar error en el progreso
      if (onProgress) {
        const mensajeError = err instanceof Error ? err.message : 'Error desconocido';
        onProgress('error', 'Error de generación', `Error: ${mensajeError}`, 100);
      }
    }
  };

  // Formato de fecha para mostrar
  const formatoFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  if (!isOpen) return null;

  // Contador de semanas generadas en este mes
  const semanasGeneradasEnMes = semanas.filter(semana => semanasGeneradas.includes(semana.id)).length;
  const semanasDisponibles = semanas.length - semanasGeneradasEnMes;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header del modal */}
        <div className="border-b px-6 py-4 flex items-center">
          <CalendarIcon className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">
            Generar Fechas
            {esVacante && vacanteIndex !== undefined && (
              <span className="text-yellow-600 ml-1.5">
                - Vacante #{vacanteIndex}
              </span>
            )}
          </h2>
          <button 
            onClick={onClose}
            className="ml-auto text-gray-500 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Contenido del modal */}
        <div className="px-6 py-4">
          <div className="mb-4 flex items-center">
            <UserCircleIcon className={`h-8 w-8 ${esVacante ? 'text-yellow-500' : 'text-blue-500'} mr-2`} />
            <div>
              <h3 className="font-medium text-gray-800 flex items-center">
                {esVacante ? (
                  <>
                    Vacante {vacanteIndex !== undefined ? `#${vacanteIndex}` : ""}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({empleado.fields.TipoJornada || 'No especificada'})
                    </span>
                  </>
                ) : (
                  `${empleado.fields.Nombre} ${empleado.fields.Apellidos}`
                )}
              </h3>
              {!esVacante && (
                <p className="text-sm text-gray-500">
                  {empleado.fields.CodigoEmpleado || 'Sin código'}
                </p>
              )}
            </div>
          </div>

          <p className="text-gray-600 mb-4">
            Seleccione las semanas para generar la actividad del empleado
          </p>
          
          {/* Resumen de semanas disponibles/generadas */}
          {!loading && !error && semanas.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm">
              <div className="flex items-center text-blue-700">
                <span className="font-medium mr-1">Estado de semanas:</span>
                {verificandoSemanas ? (
                  <span>Verificando...</span>
                ) : (
                  <span>
                    {semanasGeneradasEnMes} generadas, {semanasDisponibles} disponibles de un total de {semanas.length}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Listado de semanas */}
          {loading ? (
            <div className="py-6 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-gray-500">
                {verificandoSemanas ? 'Verificando actividades ya generadas...' : 'Cargando semanas disponibles...'}
              </p>
              <p className="mt-2 text-xs text-gray-400">
                Esto puede tardar unos segundos, por favor espere...
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-md p-4 text-red-700">
              <p className="font-medium mb-1">Error al cargar semanas</p>
              <p>{error}</p>
              <p className="mt-3 text-sm">
                Intente cerrar este modal y abrirlo nuevamente. Si el problema persiste, 
                verifique que haya seleccionado correctamente un mes.
              </p>
            </div>
          ) : semanas.length === 0 ? (
            <div className="py-6 text-center text-gray-500 border border-gray-200 rounded-md p-4">
              <div className="flex justify-center mb-3">
                <CalendarIcon className="h-10 w-10 text-gray-400" />
              </div>
              <p className="font-medium">No hay semanas disponibles para '{mesSeleccionado}'</p>
              <p className="mt-2 text-sm">
                Verifique que el mes seleccionado esté correctamente configurado en Airtable.
                <br />
                Las semanas deben tener el campo "Mes" configurado exactamente como: 
                <span className="font-mono mx-1 px-1 bg-gray-100 rounded">{mesSeleccionado.toLowerCase()}</span>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {semanas.map(semana => {
                const yaGenerada = semanasGeneradas.includes(semana.id);
                const seleccionada = semanasSeleccionadas.includes(semana.id);
                const disabled = yaGenerada;
                
                // Obtener fechas para mostrar en la tarjeta
                const fechaInicio = semana.fields['Fecha de Inicio'] 
                  ? formatoFecha(semana.fields['Fecha de Inicio'].toString()) 
                  : '';
                  
                const fechaFin = semana.fields['Fecha de fin'] 
                  ? formatoFecha(semana.fields['Fecha de fin'].toString()) 
                  : '';
                
                // Obtener el nombre de la semana
                const nombreSemana = semana.fields['Name'] || '';
                
                return (
                  <div 
                    key={semana.id}
                    onClick={() => !disabled && toggleSeleccionSemana(semana.id)}
                    className={`border rounded-md p-4 relative ${
                      disabled 
                        ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
                        : seleccionada
                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-300 cursor-pointer'
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 pr-8">
                      {nombreSemana}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {fechaInicio} al {fechaFin}
                    </p>
                    
                    {/* Estado de la semana */}
                    <div className="mt-2 flex items-center">
                      {yaGenerada ? (
                        <div className="flex items-center text-green-600 text-xs">
                          <LockClosedIcon className="h-3.5 w-3.5 mr-1" />
                          <span>Ya generada para este empleado</span>
                        </div>
                      ) : seleccionada ? (
                        <div className="flex items-center text-blue-600 text-xs">
                          <CheckIcon className="h-3.5 w-3.5 mr-1" />
                          <span>Seleccionada para generar</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-500 text-xs">
                          <span>Disponible para seleccionar</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Indicador de ya generada */}
                    {yaGenerada && (
                      <div className="absolute top-3 right-3 bg-green-100 text-green-700 rounded-full p-1.5">
                        <CheckIcon className="h-4 w-4" />
                      </div>
                    )}
                    
                    {/* Indicador de seleccionada */}
                    {seleccionada && !yaGenerada && (
                      <div className="absolute top-3 right-3 bg-blue-100 text-blue-700 rounded-full p-1.5">
                        <CheckIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-500">
            Semanas seleccionadas: <span className="font-medium">{semanasSeleccionadas.length}</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <XMarkIcon className="h-4 w-4 inline mr-1" />
              Cancelar
            </button>
            
            <button
              onClick={handleGenerarFechas}
              className={`px-4 py-2 rounded-md text-white flex items-center ${
                semanasSeleccionadas.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
              disabled={semanasSeleccionadas.length === 0}
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              Generar Actividad
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 