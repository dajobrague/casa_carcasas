'use client';

import { useState, useEffect } from 'react';
import { obtenerEmpleados, obtenerEmpleadosPorIds, agregarVacante, asignarEmpleado, eliminarVacante } from './api';
import { EmpleadoRecord, STATUS_EMPLEADO, TIPOS_JORNADA, TiendaData } from './types';
import { UserCircleIcon, CalendarIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

// Importar el nuevo componente modal
import GenerarFechasModal from './GenerarFechasModal';
import CalendarioEmpleadoModal from './CalendarioEmpleadoModal';
import AgregarVacanteModal from './AgregarVacanteModal';
import AsignarEmpleadoModal from './AsignarEmpleadoModal';
import ConfirmacionModal from './ConfirmacionModal';

// Importar el nuevo componente ProgressToast
import ProgressToast, { ProgressStatus } from './ProgressToast';

interface EmpleadosSectionProps {
  tiendaId: string | null;
  mesSeleccionado: string;
  tiendaData?: TiendaData;
}

export default function EmpleadosSection({ tiendaId, mesSeleccionado, tiendaData }: EmpleadosSectionProps) {
  const [empleados, setEmpleados] = useState<EmpleadoRecord[]>([]);
  const [vacantes, setVacantes] = useState<EmpleadoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para modales
  const [modalOpen, setModalOpen] = useState(false);
  const [modalGenerarFechasOpen, setModalGenerarFechasOpen] = useState(false);
  const [modalCalendarioOpen, setModalCalendarioOpen] = useState(false);
  const [modalAgregarVacanteOpen, setModalAgregarVacanteOpen] = useState(false);
  const [modalAsignarEmpleadoOpen, setModalAsignarEmpleadoOpen] = useState(false);
  
  // Estado para el empleado/vacante seleccionado
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoRecord | null>(null);
  const [selectedVacante, setSelectedVacante] = useState<EmpleadoRecord | null>(null);
  
  // Estado para menú contextual de las vacantes
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  
  // Estado para el toast de progreso
  const [toastVisible, setToastVisible] = useState(false);
  const [toastStatus, setToastStatus] = useState<ProgressStatus>('pending');
  const [toastTitle, setToastTitle] = useState('Generando actividades');
  const [toastMessage, setToastMessage] = useState('Iniciando proceso...');
  const [toastProgress, setToastProgress] = useState(0);

  // Mes y año actual para el calendario
  const fechaActual = new Date();
  const mesActual = String(fechaActual.getMonth() + 1); // Los meses van de 0 a 11
  const añoActual = String(fechaActual.getFullYear());
  
  // Procesar el formato del mes seleccionado (ej. "Abril 2025")
  const procesarMesSeleccionado = (mesString: string) => {
    // Lista de nombres de meses
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    if (!mesString) return { mes: mesActual, año: añoActual };
    
    try {
      console.log('EmpleadosSection: Procesando mes seleccionado:', mesString);
      
      // Separar el nombre del mes y el año
      const partes = mesString.split(' ');
      if (partes.length !== 2) return { mes: mesActual, año: añoActual };
      
      const nombreMes = partes[0];
      const año = partes[1];
      
      // Convertir el nombre del mes a número (1-12)
      const mesNumero = nombresMeses.findIndex(m => m === nombreMes) + 1;
      
      // Si no se encontró el mes, usar el mes actual
      if (mesNumero === 0) return { mes: mesActual, año: añoActual };
      
      console.log(`EmpleadosSection: Mes convertido: ${nombreMes} -> ${mesNumero}, Año: ${año}`);
      
      return {
        mes: String(mesNumero),
        año: año
      };
    } catch (error) {
      console.error('Error al procesar el mes seleccionado:', error);
      return { mes: mesActual, año: añoActual };
    }
  };
  
  // Obtener mes y año formateados para la API
  const { mes: mesFormateado, año: añoFormateado } = procesarMesSeleccionado(mesSeleccionado);
  console.log('EmpleadosSection: Usando mes y año formateados:', mesFormateado, añoFormateado);
  
  // Obtener el nombre del mes en español para el modal de generar fechas
  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const nombreMesActual = MESES[fechaActual.getMonth()];
  const nombreMesSeleccionado = mesFormateado && parseInt(mesFormateado) > 0 && parseInt(mesFormateado) <= 12 
    ? MESES[parseInt(mesFormateado) - 1] 
    : nombreMesActual;
  
  console.log('EmpleadosSection: Usando para GenerarFechasModal nombreMesSeleccionado:', nombreMesSeleccionado);

  // Manejador para abrir el modal de generar fechas
  const handleGenerarFechas = (empleado: EmpleadoRecord, vacanteIndex?: number) => {
    // Verificar que tengamos un mes seleccionado válido
    const mesModalFormateado = `${nombreMesSeleccionado} ${añoFormateado}`;
    console.log('EmpleadosSection: Mes formateado para modal:', mesModalFormateado);
    
    // Configurar y abrir el modal
    setSelectedEmpleado({
      ...empleado,
      vacanteIndex // Añadir el índice al objeto de empleado para usarlo en el modal
    } as EmpleadoRecord);
    setModalGenerarFechasOpen(true);
    console.log('EmpleadosSection: Abriendo modal para generar fechas', { 
      empleado: empleado.id,
      nombreEmpleado: `${empleado.fields.Nombre} ${empleado.fields.Apellidos}`,
      vacanteIndex,
      mes: mesModalFormateado,
      tienda: tiendaId
    });
  };
  
  // Maneja la apertura del modal de calendario
  const handleVerCalendario = (empleado: EmpleadoRecord, vacanteIndex?: number) => {
    setSelectedEmpleado({
      ...empleado,
      vacanteIndex // Añadir el índice al objeto de empleado para usarlo en el modal
    } as EmpleadoRecord);
    setModalCalendarioOpen(true);
  };

  // Función para actualizar el progreso de la generación
  const actualizarProgreso = (status: ProgressStatus, title: string, message: string, progress?: number) => {
    setToastStatus(status);
    setToastTitle(title);
    setToastMessage(message);
    if (progress !== undefined) {
      setToastProgress(progress);
    }
    if (!toastVisible) {
      setToastVisible(true);
    }
  };
  
  // Función para cerrar el toast
  const cerrarToast = () => {
    setToastVisible(false);
  };

  // Manejador para abrir el modal de agregar vacante
  const handleAgregarVacante = () => {
    setModalAgregarVacanteOpen(true);
  };

  // Manejador para agregar una nueva vacante
  const handleSubmitAgregarVacante = async (datos: {
    tipoJornada: string;
    horasContrato?: number;
  }) => {
    try {
      if (!tiendaId) {
        setError("No se ha seleccionado una tienda para agregar la vacante.");
        return;
      }
      
      console.log('EmpleadosSection: Agregando vacante en tienda:', tiendaId, 'datos:', datos);
      setToastVisible(true);
      setToastStatus('pending');
      setToastTitle('Agregando Vacante');
      setToastMessage('Procesando solicitud...');
      setToastProgress(30);
      
      // Cerrar el modal mientras se procesa
      setModalAgregarVacanteOpen(false);
      
      // Llamar a la API para agregar vacante
      const nuevaVacante = await agregarVacante({
        tiendaId,
        ...datos
      });
      
      console.log('EmpleadosSection: Vacante agregada exitosamente:', nuevaVacante);
      
      // Actualizar el estado con la nueva vacante - convertir a EmpleadoRecord para satisfacer el tipo
      const vacanteComoEmpleado: EmpleadoRecord = {
        id: nuevaVacante.id,
        fields: {
          Nombre: 'VACANTE',
          Apellidos: 'VACANTE',
          'Status Empleado': 'Pendiente',
          ...nuevaVacante.fields // El resto de campos viene de la vacante original
        }
      };
      
      setVacantes(prevVacantes => [...prevVacantes, vacanteComoEmpleado]);
      
      // Mostrar toast de éxito
      setToastStatus('success');
      setToastTitle('Vacante Agregada');
      setToastMessage('La vacante se ha agregado exitosamente.');
      setToastProgress(100);
      
      // Cerrar el toast después de 3 segundos
      setTimeout(() => {
        setToastVisible(false);
      }, 3000);
      
    } catch (error) {
      console.error('EmpleadosSection: Error al agregar vacante:', error);
      
      // Mostrar toast de error
      setToastStatus('error');
      setToastTitle('Error');
      setToastMessage(`No se pudo agregar la vacante: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setToastProgress(100);
    }
  };

  // Manejador para abrir el modal de asignar empleado a vacante
  const handleAsignarVacante = (vacante: EmpleadoRecord, vacanteIndex?: number) => {
    setSelectedVacante({
      ...vacante,
      vacanteIndex // Añadir el índice al objeto de vacante para usarlo en el modal
    } as EmpleadoRecord);
    setModalAsignarEmpleadoOpen(true);
  };

  // Manejador para asignar un empleado a una vacante
  const handleSubmitAsignarEmpleado = async (datos: {
    Nombre: string;
    Apellidos: string;
    CodigoEmpleado: string;
    'Status Empleado': string;
    Perfil: string;
  }) => {
    if (!selectedVacante) {
      console.error('No hay vacante seleccionada para asignar empleado');
      return;
    }
    
    try {
      setLoading(true);
      setToastVisible(true);
      setToastMessage('Asignando empleado a vacante...');
      setToastProgress(30);
      
      console.log('Asignando empleado a vacante:', selectedVacante.id, datos);
      
      // Cerrar el modal mientras se procesa
      setModalAsignarEmpleadoOpen(false);
      
      // Llamar a la API para asignar el empleado
      const nuevoEmpleado = await asignarEmpleado(selectedVacante.id, datos);
      
      setToastMessage('Empleado asignado correctamente');
      setToastProgress(70);
      
      console.log('Empleado asignado correctamente:', nuevoEmpleado);
      
      // Actualizar inmediatamente el estado local sin recargar todos los empleados
      // 1. Remover la vacante de la lista de vacantes
      setVacantes(prevVacantes => prevVacantes.filter(v => v.id !== selectedVacante.id));
      
      // 2. Agregar el empleado actualizado a la lista de empleados
      setEmpleados(prevEmpleados => [...prevEmpleados, nuevoEmpleado]);
      
      // Completamos la animación del toast
      setToastMessage('Actualización completada');
      setToastProgress(100);
      
      // Ocultamos el loading y el toast después de un breve momento
      setLoading(false);
      setTimeout(() => {
        setToastVisible(false);
      }, 2000);
      
      // Programar una recarga completa después de 30 segundos
      // para asegurarnos de que los datos están sincronizados con el servidor
      setTimeout(() => {
        console.log('Recargando datos después de 30 segundos para sincronizar con el servidor');
        recargarEmpleados(true); // Recarga silenciosa para no interrumpir la experiencia
      }, 30000);
      
    } catch (err) {
      console.error('Error al asignar empleado:', err);
      setError(`Error al asignar empleado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setToastMessage(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      setToastProgress(100);
      
      // Ocultar el toast después de un momento
      setTimeout(() => {
        setToastVisible(false);
      }, 3000);
      setLoading(false);
    }
  };

  // Función auxiliar para recargar empleados
  const recargarEmpleados = async (silencioso = true) => {
    try {
      console.log('Recargando empleados para tienda:', tiendaId);
      
      // Solo mostrar loading spinner si no es silencioso
      if (!silencioso) setLoading(true);
      
      // Obtener todos los empleados, sin filtrar por status
      const empleadosData = await obtenerEmpleados(tiendaId || '', null);
      
      // Separar empleados normales y vacantes
      const empleadosNormales = empleadosData.filter(
        emp => emp.fields.Nombre !== 'VACANTE'
      );
      
      const empleadosVacantes = empleadosData.filter(
        emp => emp.fields.Nombre === 'VACANTE'
      );
      
      // Actualizar el estado solo si los datos son diferentes
      const empleadosHanCambiado = JSON.stringify(empleadosNormales.map(e => e.id).sort()) !== 
                                   JSON.stringify(empleados.map(e => e.id).sort());
      
      const vacantesHanCambiado = JSON.stringify(empleadosVacantes.map(v => v.id).sort()) !== 
                                  JSON.stringify(vacantes.map(v => v.id).sort());
      
      // Solo actualizar si hay cambios para evitar renderizados innecesarios
      if (empleadosHanCambiado) {
        console.log('Actualizando lista de empleados con nuevos datos');
        setEmpleados(empleadosNormales);
      }
      
      if (vacantesHanCambiado) {
        console.log('Actualizando lista de vacantes con nuevos datos');
        setVacantes(empleadosVacantes);
      }
      
      // Desactivar loading solo si no era silencioso
      if (!silencioso) setLoading(false);
      
      if (!empleadosHanCambiado && !vacantesHanCambiado) {
        console.log('No se detectaron cambios en los datos');
      }
    } catch (err) {
      console.error('Error al recargar empleados:', err);
      
      // Solo mostrar error si no es silencioso
      if (!silencioso) {
        setError(`Error al recargar empleados: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        setLoading(false);
      }
    }
  };

  // Cargar empleados cuando cambie la tienda o tengamos datos de tienda
  useEffect(() => {
    if (!tiendaId) return;

    const fetchEmpleados = async () => {
      try {
        setLoading(true);
        setError(null); // Limpiar errores anteriores
        
        let empleadosData: EmpleadoRecord[] = [];
        
        // Si tenemos datos de tienda y los IDs de empleados, usamos la versión optimizada
        if (tiendaData?.fields && Array.isArray(tiendaData.fields['record_Id (from Empleados)'])) {
          console.log('EmpleadosSection: Usando método optimizado con IDs directos de la tienda');
          const empleadosIds = tiendaData.fields['record_Id (from Empleados)'];
          empleadosData = await obtenerEmpleadosPorIds(empleadosIds);
        } else {
          // Método tradicional como fallback
          console.log('EmpleadosSection: Usando método tradicional de búsqueda de empleados');
          empleadosData = await obtenerEmpleados(tiendaId, null);
        }
        
        console.log('EmpleadosSection: Empleados obtenidos:', empleadosData.length);
        
        // Separar empleados normales y vacantes
        const empleadosNormales = empleadosData.filter(
          emp => emp.fields.Nombre !== 'VACANTE'
        );
        
        const empleadosVacantes = empleadosData.filter(
          emp => emp.fields.Nombre === 'VACANTE'
        );
        
        setEmpleados(empleadosNormales);
        setVacantes(empleadosVacantes);
        setLoading(false);
      } catch (err) {
        console.error('EmpleadosSection: Error al obtener empleados:', err);
        setError(`Error al cargar los empleados: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        setLoading(false);
        
        // Si hay un error, establecer empleados y vacantes vacíos para evitar renderizar datos obsoletos
        setEmpleados([]);
        setVacantes([]);
      }
    };
    
    fetchEmpleados();
  }, [tiendaId, tiendaData]);

  // Obtener horas por tipo de jornada
  const getHorasPorTipoJornada = (tipoJornada: string, horasPersonalizadas?: number): number => {
    if (typeof horasPersonalizadas === 'number') {
      return horasPersonalizadas;
    }

    // Buscar el tipo de jornada en los tipos predefinidos
    const tipoEncontrado = Object.values(TIPOS_JORNADA).find(
      tipo => tipo.id.toLowerCase() === tipoJornada?.toLowerCase()
    );

    return tipoEncontrado?.horas || 0;
  };

  // Obtener perfil del empleado con valor por defecto
  const getPerfil = (empleado: EmpleadoRecord): string => {
    return empleado.fields.Perfil || 'Vendedor';
  };

  // Componente para tarjeta de empleado
  const EmpleadoCard = ({ 
    empleado, 
    isVacante = false,
    vacanteIndex
  }: { 
    empleado: EmpleadoRecord;
    isVacante?: boolean;
    vacanteIndex?: number;
  }) => {
    // Menú desplegable estado
    const [menuAbierto, setMenuAbierto] = useState(false);
    // Estado para el modal de confirmación
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    
    // Obtener las horas y el tipo de jornada para mostrar en las vacantes
    const horasContrato = empleado.fields.HorasContrato ? 
      Number(empleado.fields.HorasContrato) : undefined;
    
    const tipoJornada = empleado.fields.TipoJornada || 'No especificada';
    const horasJornada = getHorasPorTipoJornada(tipoJornada, horasContrato);

    // Función para eliminar la vacante
    const handleEliminarVacante = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setMenuAbierto(false);
      setConfirmModalOpen(true);
      return false;
    };
    
    // Función que se ejecuta cuando se confirma la eliminación
    const confirmarEliminarVacante = async () => {
      try {
        console.log("Eliminando vacante:", empleado.id);
        
        // Mostrar toast de progreso
        setToastVisible(true);
        setToastStatus('pending');
        setToastTitle('Eliminando Vacante');
        setToastMessage('Procesando solicitud...');
        setToastProgress(30);
        
        // Llamar a la API para eliminar la vacante
        await eliminarVacante(empleado.id);
        
        // Actualizar el estado eliminando la vacante
        setVacantes(prev => prev.filter(v => v.id !== empleado.id));
        
        // Actualizar el toast con éxito
        setToastStatus('success');
        setToastTitle('Vacante Eliminada');
        setToastMessage('La vacante ha sido eliminada exitosamente');
        setToastProgress(100);
        
        // Ocultar el toast después de 2 segundos
        setTimeout(() => {
          setToastVisible(false);
        }, 2000);
      } catch (error) {
        console.error("Error al eliminar vacante:", error);
        
        // Mostrar toast de error
        setToastStatus('error');
        setToastTitle('Error');
        setToastMessage(`Error al eliminar la vacante: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setToastProgress(100);
        
        // Ocultar el toast después de 3 segundos
        setTimeout(() => {
          setToastVisible(false);
        }, 3000);
      }
    };
    
    // Función para asignar un empleado a la vacante
    const handleAsignarEmpleado = (e: React.MouseEvent) => {
      e.stopPropagation();
      setMenuAbierto(false);
      
      // Llamar a la función para abrir el modal de asignación
      handleAsignarVacante(empleado, vacanteIndex);
    };

    return (
      <>
        {/* Modal de confirmación para eliminar vacante */}
        <ConfirmacionModal 
          isOpen={confirmModalOpen}
          onClose={() => {
            setConfirmModalOpen(false);
          }}
          onConfirm={confirmarEliminarVacante}
          title="Eliminar Vacante"
          message={`¿Está seguro que desea eliminar esta vacante? Esta acción no se puede deshacer.`}
          confirmButtonText="Eliminar"
          cancelButtonText="Cancelar"
          type="danger"
        />
        
        <div 
          className={`shadow rounded-lg overflow-hidden border ${isVacante ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'} cursor-pointer transition-all hover:shadow-md relative`}
          onClick={() => {
            // Abrir el calendario tanto para empleados como para vacantes
            handleVerCalendario(empleado, vacanteIndex);
          }}
        >
          {/* Menú de opciones para vacantes */}
          {isVacante && (
            <div className="absolute top-2 right-2 z-10">
              <button 
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAbierto(!menuAbierto);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              
              {/* Menú desplegable */}
              {menuAbierto && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 py-1 border border-gray-200">
                  <button
                    className="text-left w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={(e) => {
                      // Detener inmediatamente la propagación de eventos
                      e.stopPropagation();
                      e.preventDefault();
                      e.nativeEvent.stopImmediatePropagation();
                      // Cerrar el menú y mostrar el modal
                      setMenuAbierto(false);
                      setConfirmModalOpen(true);
                      return false;
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar Vacante
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="p-4">
            <div className="flex items-center justify-center mb-3">
              <UserCircleIcon className={`h-12 w-12 ${isVacante ? 'text-yellow-400' : 'text-gray-400'}`} />
            </div>
            
            {isVacante ? (
              /* Card content for vacancy */
              <>
                <h3 className="text-center font-medium text-gray-900 mb-1">
                  Vacante {vacanteIndex !== undefined ? `#${vacanteIndex}` : ""}
                </h3>
                <div className="flex flex-col items-center text-sm text-gray-500 mb-3">
                  <span>{tipoJornada}</span>
                  {horasJornada > 0 && (
                    <span className="text-gray-600 font-medium mt-1">
                      {horasJornada} horas semanales
                    </span>
                  )}
                </div>
              </>
            ) : (
              /* Card content for regular employee */
              <>
                <h3 className="text-center font-medium text-gray-900 mb-1">
                  {empleado.fields.Nombre} {empleado.fields.Apellidos}
                </h3>
                <p className="text-center text-sm text-gray-500 mb-3">
                  {empleado.fields.CodigoEmpleado || 'Sin código'}
                </p>
              </>
            )}
            
            <div className="flex justify-center mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isVacante 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                <span className={`w-2 h-2 mr-1 rounded-full ${
                  isVacante 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}></span>
                {isVacante ? 'Vacante' : 'Activo'}
              </span>
            </div>
            
            <button 
              className={`w-full mt-2 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                isVacante 
                  ? 'bg-yellow-500 hover:bg-yellow-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
              onClick={(e) => {
                e.stopPropagation(); // Evitar que el clic del botón también active el clic de la tarjeta
                // Tanto para vacantes como para empleados regulares, usamos la misma funcionalidad de generar fechas
                handleGenerarFechas(empleado, vacanteIndex);
              }}
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Generar Fechas
            </button>
          </div>
        </div>
      </>
    );
  };

  // Componente para mostrar una cuadrícula de tarjetas
  const CardGrid = ({ 
    title, 
    items,
    emptyMessage,
    showAddButton = false,
    onAddClick
  }: { 
    title: string; 
    items: EmpleadoRecord[]; 
    emptyMessage: string;
    showAddButton?: boolean;
    onAddClick?: () => void;
  }) => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          <span className="text-xl mr-2">👥</span> 
          {title} ({items.length})
        </h3>
        
        {showAddButton && (
          <button 
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-lg text-sm transition-all flex items-center shadow-sm font-medium hover:shadow hover:-translate-y-0.5 transform active:translate-y-0"
            onClick={onAddClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Agregar Vacante
          </button>
        )}
      </div>
      
      {items.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item, index) => (
            <EmpleadoCard 
              key={item.id} 
              empleado={item} 
              isVacante={title === 'Vacantes'}
              vacanteIndex={title === 'Vacantes' ? index + 1 : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-gray-500">Cargando empleados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-6">
        <h2 className="text-lg font-semibold text-red-700 mb-2">
          Error al cargar empleados
        </h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={() => {
            setLoading(true);
            setError(null);
            // Disparar el efecto de obtener empleados nuevamente
            const fetchEmpleados = async () => {
              try {
                console.log('EmpleadosSection: Reintentando obtener empleados para tienda:', tiendaId);
                await recargarEmpleados(false); // No silencioso para mostrar loading y errores
              } catch (err) {
                console.error('EmpleadosSection: Error al reintentar:', err);
                setError(`Error al cargar los empleados: ${err instanceof Error ? err.message : 'Error desconocido'}`);
                setLoading(false);
                
                // Si hay un error, establecer empleados y vacantes vacíos para evitar renderizar datos obsoletos
                setEmpleados([]);
                setVacantes([]);
              }
            };
            
            fetchEmpleados();
          }} 
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const totalEmpleados = empleados.length + vacantes.length;

  if (totalEmpleados === 0 && !loading && !error) {
    return (
      <div className="py-8 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-500 mb-4">No hay empleados ni vacantes en esta tienda.</p>
        <p className="text-gray-500">
          Puedes agregar vacantes para comenzar a gestionar el personal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sección de empleados actuales */}
      <div className="bg-white rounded-lg shadow p-6">
        <CardGrid 
          title="Actuales" 
          items={empleados}
          emptyMessage="No hay empleados asignados a esta tienda actualmente."
        />
      </div>
      
      {/* Sección de vacantes */}
      <div className="bg-gray-100 rounded-lg shadow p-6">
        <CardGrid 
          title="Vacantes" 
          items={vacantes}
          emptyMessage="No hay vacantes disponibles en esta tienda."
          showAddButton={true}
          onAddClick={handleAgregarVacante}
        />
      </div>

      {/* Modal para generar fechas */}
      {modalGenerarFechasOpen && selectedEmpleado && (
        <GenerarFechasModal
          empleado={selectedEmpleado}
          isOpen={modalGenerarFechasOpen}
          onClose={() => {
            setModalGenerarFechasOpen(false);
            setSelectedEmpleado(null);
          }}
          mesSeleccionado={nombreMesSeleccionado}
          tiendaId={tiendaId || ''}
          onProgress={actualizarProgreso}
        />
      )}
      
      {/* Modal para ver calendario */}
      {modalCalendarioOpen && selectedEmpleado && (
        <CalendarioEmpleadoModal
          empleado={selectedEmpleado}
          isOpen={modalCalendarioOpen}
          onClose={() => {
            setModalCalendarioOpen(false);
            setSelectedEmpleado(null);
          }}
          mesSeleccionado={mesFormateado}
          añoSeleccionado={añoFormateado}
        />
      )}

      {/* Modal para agregar vacante */}
      <AgregarVacanteModal
        isOpen={modalAgregarVacanteOpen}
        onClose={() => setModalAgregarVacanteOpen(false)}
        onSubmit={handleSubmitAgregarVacante}
      />

      {/* Modal para asignar empleado a vacante */}
      <AsignarEmpleadoModal
        isOpen={modalAsignarEmpleadoOpen}
        onClose={() => setModalAsignarEmpleadoOpen(false)}
        vacante={selectedVacante}
        onSubmit={handleSubmitAsignarEmpleado}
      />

      {/* Toast de progreso */}
      <ProgressToast
        isVisible={toastVisible}
        status={toastStatus}
        title={toastTitle}
        message={toastMessage}
        progress={toastProgress}
        onClose={cerrarToast}
      />
    </div>
  );
} 