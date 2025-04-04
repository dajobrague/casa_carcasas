import React, { useState, useEffect } from 'react';
import { XMarkIcon, BriefcaseIcon, CalendarIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { obtenerCalendarioEmpleado } from './api';
import { EmpleadoRecord } from './types';
import { calcularHorasTrabajadas, esPaisFrancia } from '@/utils/calcularHoras';
import CalendarioDiaDetail from './CalendarioDiaDetail';

interface CalendarioEmpleadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado: EmpleadoRecord;
  mesSeleccionado: string; // En formato número: '1', '2', etc.
  añoSeleccionado: string; // En formato completo: '2024', '2025', etc.
}

interface ActividadRecord {
  id: string;
  fields: {
    'Fecha Format'?: string;
    'Tipo Actividad'?: string;
    'Horas Actividad'?: number;
    'PAIS (from Tienda y Supervisor)'?: string | string[];
    [key: string]: any; // Para campos dinámicos con formato de hora
  };
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export default function CalendarioEmpleadoModal({
  isOpen,
  onClose,
  empleado,
  mesSeleccionado,
  añoSeleccionado
}: CalendarioEmpleadoModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actividades, setActividades] = useState<ActividadRecord[]>([]);
  const [diasCalendario, setDiasCalendario] = useState<(number | null)[][]>([]);
  const [esFrancia, setEsFrancia] = useState(false);
  
  const [estadisticas, setEstadisticas] = useState({
    totalDias: 0,
    diasTrabajo: 0,
    horasTotales: 0,
    slots: 0,
    duracionSlot: 0
  });
  
  // Obtener nombre del mes para mostrar
  const nombreMes = MESES[parseInt(mesSeleccionado) - 1];
  
  // Verificar si es una vacante
  const esVacante = empleado.fields['Status Empleado'] === 'Pendiente' || 
                    empleado.fields.Nombre === 'VACANTE';
  
  // Obtener el índice de la vacante (si existe)
  const vacanteIndex = (empleado as any).vacanteIndex;
  
  // Efecto para cargar las actividades cuando el modal está abierto o cuando cambia el mes/año
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset states cuando cambia el mes o año
    setActividades([]);
    setDiasCalendario([]);
    setEstadisticas({
      totalDias: 0,
      diasTrabajo: 0,
      horasTotales: 0,
      slots: 0,
      duracionSlot: 0
    });
    
    const cargarCalendario = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Calendario: Cargando datos para ${mesSeleccionado}/${añoSeleccionado}`);
        
        // Obtener actividades del empleado
        const actividadesData = await obtenerCalendarioEmpleado(
          empleado.id,
          mesSeleccionado,
          añoSeleccionado
        );
        
        console.log(`Calendario: Recibidas ${actividadesData.length} actividades para el empleado ${empleado.id}`);
        
        // Debug: Mostrar los datos de actividades
        if (actividadesData.length > 0) {
          console.log('Calendario: Ejemplo de actividad:', actividadesData[0]);
          console.log('Calendario: Campos disponibles:', Object.keys(actividadesData[0].fields));
          console.log('Calendario: Valor de Fecha Format:', actividadesData[0].fields['Fecha Format']);
          
          // Determinar si el país es Francia
          let paisDetectado = null;
          for (const actividad of actividadesData) {
            const camposPais = actividad.fields['PAIS (from Tienda y Supervisor)'];
            if (camposPais) {
              paisDetectado = Array.isArray(camposPais) ? camposPais[0] : camposPais;
              if (paisDetectado) break;
            }
          }
          
          if (paisDetectado) {
            const esFranciaFlag = esPaisFrancia(paisDetectado);
            setEsFrancia(esFranciaFlag);
            console.log(`Calendario: País detectado: ${paisDetectado}, Es Francia: ${esFranciaFlag ? 'Sí' : 'No'}`);
          }
        } else {
          console.log(`Calendario: No se encontraron actividades para el mes ${mesSeleccionado}/${añoSeleccionado}`);
        }
        
        setActividades(actividadesData);
        
        // Generar la estructura del calendario para el mes seleccionado
        generarCalendario(parseInt(mesSeleccionado), parseInt(añoSeleccionado));
        
      } catch (err) {
        console.error('Calendario: Error al cargar calendario:', err);
        setError('Error al cargar datos del calendario');
      } finally {
        setLoading(false);
      }
    };
    
    cargarCalendario();
  }, [isOpen, empleado.id, mesSeleccionado, añoSeleccionado]);
  
  // Calcular estadísticas cuando cambian las actividades
  useEffect(() => {
    if (actividades.length === 0) return;
    
    const totalDias = actividades.length;
    let diasTrabajo = 0;
    let horasTotales = 0;
    let totalSlots = 0;
    
    // Obtener la duración del slot según país
    const duracionSlot = esFrancia ? 0.25 : 0.5;
    
    actividades.forEach(act => {
      const resultadoCalculo = calcularHorasTrabajadas(act, { esFrancia });
      
      if (resultadoCalculo.esTrabajo) {
        diasTrabajo++;
        horasTotales += resultadoCalculo.horasTotales;
        totalSlots += resultadoCalculo.slots;
      }
    });
    
    setEstadisticas({
      totalDias,
      diasTrabajo,
      horasTotales,
      slots: totalSlots,
      duracionSlot
    });
  }, [actividades, esFrancia]);
  
  // Función para generar la estructura del calendario
  const generarCalendario = (mes: number, año: number) => {
    // Crear una nueva fecha para el primer día del mes
    const fechaInicio = new Date(año, mes - 1, 1);
    
    // Obtener el día de la semana del primer día (0 = Domingo, 1 = Lunes, etc.)
    let diaSemana = fechaInicio.getDay();
    // Ajustar para que la semana comience en lunes
    diaSemana = diaSemana === 0 ? 6 : diaSemana - 1;
    
    // Obtener el último día del mes
    const ultimoDia = new Date(año, mes, 0).getDate();
    
    // Inicializar la matriz de días
    const dias: (number | null)[][] = [];
    let semanaActual: (number | null)[] = [];
    
    // Agregar días vacíos al inicio
    for (let i = 0; i < diaSemana; i++) {
      semanaActual.push(null);
    }
    
    // Agregar los días del mes
    for (let dia = 1; dia <= ultimoDia; dia++) {
      semanaActual.push(dia);
      
      // Si llegamos al domingo o al último día del mes, comenzar nueva semana
      if (semanaActual.length === 7) {
        dias.push(semanaActual);
        semanaActual = [];
      }
    }
    
    // Si quedaron días en la última semana, llenar con nulos
    if (semanaActual.length > 0) {
      while (semanaActual.length < 7) {
        semanaActual.push(null);
      }
      dias.push(semanaActual);
    }
    
    setDiasCalendario(dias);
  };
  
  // Función para obtener los datos de actividad de un día específico
  const obtenerActividadDia = (dia: number) => {
    if (!dia) return null;
    
    // Formatear el día y mes para que tengan dos dígitos (con cero a la izquierda si es necesario)
    const diaStr = dia.toString().padStart(2, '0');
    const mesStr = mesSeleccionado.padStart(2, '0');
    
    // Construir la fecha en formato YYYY-MM-DD
    const fechaFormateada = `${añoSeleccionado}-${mesStr}-${diaStr}`;
    
    // Buscar la actividad que coincida con esta fecha
    const actividad = actividades.find(act => 
      act.fields['Fecha Format'] === fechaFormateada
    );
    
    return actividad;
  };
  
  // Función para obtener la información calculada de un día
  const obtenerInfoDia = (dia: number) => {
    const actividad = obtenerActividadDia(dia);
    if (!actividad) return null;
    
    return calcularHorasTrabajadas(actividad, { esFrancia });
  };
  
  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center transition-all duration-300">
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl mx-4 border border-gray-200 animate-fadeIn">
        {/* Cabecera del modal */}
        <div className="border-b p-4 flex justify-between items-center bg-gradient-to-r from-blue-50 to-blue-100">
          <h2 className="text-xl font-semibold flex items-center">
            {esVacante ? (
              <>
                <BriefcaseIcon className="h-6 w-6 mr-2 text-yellow-600" />
                Vacante {vacanteIndex !== undefined ? `#${vacanteIndex}` : ""}
              </>
            ) : (
              <>
                <CalendarIcon className="h-6 w-6 mr-2 text-blue-600" />
                {empleado.fields.Nombre} {empleado.fields.Apellidos}
              </>
            )}
          </h2>
          <div className="text-sm text-gray-600 font-medium">
            {esVacante ? (
              <span>
                {empleado.fields.TipoJornada || 'No especificada'}
                {empleado.fields.HorasContrato && (
                  <span> - {empleado.fields.HorasContrato} h/sem</span>
                )}
              </span>
            ) : (
              <span>{empleado.fields.CodigoEmpleado}</span>
            )}
            {" - "}
            {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} {añoSeleccionado}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Estadísticas */}
        {!loading && !error && actividades.length > 0 && (
          <div className="bg-gray-50 p-3 grid grid-cols-4 gap-2 border-b">
            <div className="flex items-center bg-white rounded-lg p-2 shadow-sm border border-gray-100">
              <CalendarIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Total días</div>
                <div className="font-semibold">{estadisticas.totalDias} días</div>
              </div>
            </div>
            <div className="flex items-center bg-white rounded-lg p-2 shadow-sm border border-gray-100">
              <BriefcaseIcon className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Días de trabajo</div>
                <div className="font-semibold">{estadisticas.diasTrabajo} días</div>
              </div>
            </div>
            <div className="flex items-center bg-white rounded-lg p-2 shadow-sm border border-gray-100">
              <ClockIcon className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Horas totales</div>
                <div className="font-semibold">{estadisticas.horasTotales.toFixed(1)} horas</div>
              </div>
            </div>
            <div className="flex items-center bg-white rounded-lg p-2 shadow-sm border border-gray-100">
              <span className="text-amber-500 mr-2 font-bold text-sm inline-block w-5 h-5 text-center">T</span>
              <div>
                <div className="text-xs text-gray-500">
                  {esFrancia ? 'Slots (15 min)' : 'Slots (30 min)'}
                </div>
                <div className="font-semibold">{estadisticas.slots} slots</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Contenido del modal */}
        <div className="p-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-4 text-gray-500">Cargando calendario...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 p-4 rounded-md text-red-700 flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2" />
              {error}
            </div>
          ) : (
            <div className="calendar-container">
              {actividades.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-yellow-800 mb-4 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-yellow-600" />
                  <span>No se encontraron actividades para este mes. Es posible que aún no se hayan generado.</span>
                </div>
              )}
              
              {/* Indicador de cálculo según país */}
              {actividades.length > 0 && (
                <div className="mb-4 text-sm flex items-center justify-end">
                  <span className="text-gray-500 mr-1">Cálculo por slots:</span>
                  <span className={`font-semibold ${esFrancia ? 'text-green-600' : 'text-blue-600'}`}>
                    {esFrancia ? '15 minutos (Francia)' : '30 minutos (Estándar)'}
                  </span>
                </div>
              )}
              
              {/* Tabla del calendario con estilos para evitar overflow */}
              <div className="overflow-hidden">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr>
                      {DIAS_SEMANA.map((dia, index) => (
                        <th key={index} className="border text-center py-2 bg-gray-50 text-gray-600 font-medium text-sm" style={{ width: '14.28%' }}>
                          {dia}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diasCalendario.map((semana, indexSemana) => (
                      <tr key={indexSemana}>
                        {semana.map((dia, indexDia) => {
                          const actividad = obtenerActividadDia(dia as number);
                          const infoActividad = obtenerInfoDia(dia as number);
                          
                          // Determinar clases y contenido según el tipo de actividad
                          let clasesDia = "border p-1 relative";
                          let contenidoDia = null;
                          
                          if (dia === null) {
                            clasesDia += " bg-gray-50";
                          } else if (infoActividad?.esTrabajo) {
                            clasesDia += " bg-green-50";
                            
                            // Mostrar detalles de la actividad usando el componente
                            contenidoDia = <CalendarioDiaDetail resultado={infoActividad} />;
                          }
                          
                          return (
                            <td 
                              key={indexDia} 
                              className={clasesDia}
                              style={{ 
                                height: '90px', 
                                maxHeight: '90px', 
                                width: '14.28%', 
                                maxWidth: '14.28%',
                                overflow: 'hidden',
                                position: 'relative'
                              }}
                            >
                              {dia !== null && (
                                <>
                                  <div className="absolute top-1 right-1 text-gray-400 text-xs">
                                    {dia}
                                  </div>
                                  <div className="mt-3 px-0.5 overflow-hidden" style={{ height: 'calc(100% - 16px)' }}>
                                    {contenidoDia}
                                  </div>
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Pie del modal */}
        <div className="border-t p-3 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
} 