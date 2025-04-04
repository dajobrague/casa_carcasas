'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface HorariosContentProps {
  storeId: string;
}

interface TiendaData {
  pais: string;
  apertura: string;
  cierre: string;
  TIENDA: string;
  'N°': string;
  PAIS: string;
  Apertura: string;
  Cierre: string;
}

interface TimeRange {
  start: string;
  end: string;
}

export default function HorariosContent({ storeId }: HorariosContentProps) {
  const { storeRecordId } = useAuth();
  const recordId = storeId || storeRecordId || '';
  
  const [state, setState] = useState({
    tiendaData: {
      pais: '',
      apertura: '',
      cierre: '',
      TIENDA: '',
      'N°': '',
      PAIS: '',
      Apertura: '',
      Cierre: ''
    } as TiendaData,
    selectedRanges: [] as TimeRange[],
    loading: true,
    error: null as string | null,
    success: false
  });

  const [startTime, setStartTime] = useState<string | null>(null);

  const addMinutesToTime = (timeStr: string, minutesToAdd: number) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + minutesToAdd;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const generarIntervalos = (pais: string) => {
    const intervalos: string[] = [];
    const incremento = pais?.toUpperCase() === 'FRANCIA' ? 15 : 30;
    
    for (let hora = 0; hora < 24; hora++) {
      for (let minuto = 0; minuto < 60; minuto += incremento) {
        const horaStr = hora.toString().padStart(2, '0');
        const minutoStr = minuto.toString().padStart(2, '0');
        intervalos.push(`${horaStr}:${minutoStr}`);
      }
    }

    const ultimoIntervalo = pais?.toUpperCase() === 'FRANCIA' ? '23:45' : '23:30';
    if (intervalos[intervalos.length - 1] !== ultimoIntervalo) {
      intervalos.push(ultimoIntervalo);
    }

    return intervalos;
  };

  const isInRange = (time: string) => {
    return state.selectedRanges.some(range => 
      time >= range.start && time <= range.end
    );
  };

  const handleTimeClick = (time: string) => {
    const intervalos = generarIntervalos(state.tiendaData.pais);
    
    if (!startTime) {
      if (isInRange(time)) {
        setState(prev => ({
          ...prev,
          selectedRanges: prev.selectedRanges.filter(range => {
            if (time >= range.start && time <= range.end) {
              const ranges = [];
              if (time > range.start) {
                ranges.push({ start: range.start, end: time });
              }
              if (time < range.end) {
                ranges.push({ start: time, end: range.end });
              }
              return false;
            }
            return true;
          })
        }));
      } else {
        setStartTime(time);
        setState(prev => ({
          ...prev,
          selectedRanges: [...prev.selectedRanges, { start: time, end: time }]
        }));
      }
    } else {
      if (time >= startTime) {
        setState(prev => ({
          ...prev,
          selectedRanges: [
            ...prev.selectedRanges.filter(range => 
              !(range.start === startTime && range.end === startTime)
            ),
            { start: startTime, end: time }
          ]
        }));
      }
      setStartTime(null);
    }

    // Actualizar apertura y cierre
    if (state.selectedRanges.length > 0) {
      const allStarts = state.selectedRanges.map(range => range.start);
      const allEnds = state.selectedRanges.map(range => range.end);
      const apertura = allStarts.reduce((a, b) => a < b ? a : b);
      const baseClosingTime = allEnds.reduce((a, b) => a > b ? a : b);
      const cierre = addMinutesToTime(baseClosingTime, 30);

      setState(prev => ({
        ...prev,
        tiendaData: {
          ...prev.tiendaData,
          apertura,
          cierre,
          Apertura: apertura,
          Cierre: cierre
        }
      }));
    } else {
      setState(prev => ({
        ...prev,
        tiendaData: {
          ...prev.tiendaData,
          apertura: '',
          cierre: '',
          Apertura: '',
          Cierre: ''
        }
      }));
    }
  };

  const handleSave = async () => {
    try {
      if (!recordId) {
        throw new Error('No se encontró el ID de la tienda');
      }
      
      const response = await fetch(`/api/tienda/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            Apertura: state.tiendaData.Apertura,
            Cierre: state.tiendaData.Cierre
          }
        })
      });

      if (!response.ok) throw new Error('Error al guardar los cambios');

      setState(prev => ({
        ...prev,
        success: true,
        error: null
      }));

      setTimeout(() => {
        setState(prev => ({
          ...prev,
          success: false
        }));
      }, 3000);
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Error desconocido',
        success: false
      }));
    }
  };
  
  useEffect(() => {
    const init = async () => {
      try {
        if (!recordId) {
          setState(prev => ({
            ...prev,
            error: 'No se encontró el ID de la tienda',
            loading: false
          }));
          return;
        }

        console.log('Iniciando búsqueda de tienda con ID:', recordId);
        
        const response = await fetch(`/api/airtable?action=obtenerDatosTienda&storeId=${recordId}`);
        console.log('Respuesta de la API:', response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error de la API:', errorData);
          throw new Error(`Error al obtener datos de la tienda: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Datos recibidos:', data);

        const tiendaData = {
          pais: data.fields.PAIS || '',
          apertura: data.fields.Apertura || '',
          cierre: data.fields.Cierre || '',
          TIENDA: data.fields.TIENDA || '',
          'N°': data.fields['N°'] || '',
          PAIS: data.fields.PAIS || '',
          Apertura: data.fields.Apertura || '',
          Cierre: data.fields.Cierre || ''
        };

        console.log('Datos procesados:', tiendaData);

        setState(prev => ({
          ...prev,
          tiendaData,
          selectedRanges: tiendaData.Apertura && tiendaData.Cierre 
            ? [{ start: tiendaData.Apertura, end: tiendaData.Cierre }]
            : [],
          loading: false
        }));
      } catch (err) {
        console.error('Error completo:', err);
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Error desconocido',
          loading: false
        }));
      }
    };

    init();
  }, [recordId]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-gray-600">Cargando datos...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const intervalos = generarIntervalos(state.tiendaData.pais);
  
  return (
    <div className="lcdc-horarios">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Horario Comercial</h1>
        <p className="text-gray-500">Configura los horarios de apertura y cierre de la tienda</p>
      </div>
      
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                <span className="font-medium">Tienda:</span>
                <span className="text-gray-900">{state.tiendaData.TIENDA || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                <span className="font-medium">N°:</span>
                <span className="text-gray-900">{state.tiendaData['N°'] || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                <span className="font-medium">País:</span>
                <span className="text-gray-900">
                  {state.tiendaData.pais || 'N/A'} - {state.tiendaData.pais?.toUpperCase() === 'FRANCIA' ? '15' : '30'} min
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!state.tiendaData.Apertura || !state.tiendaData.Cierre}
          >
            <span>💾</span>
            Guardar Cambios
          </button>
        </div>

        {/* Horario Display */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🌅</span>
            </div>
            <div>
              <div className="text-sm text-blue-600 font-medium">Hora de Apertura</div>
              <div className="text-lg text-blue-900 font-semibold">
                {state.tiendaData.Apertura || 'No establecida'}
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🌙</span>
            </div>
            <div>
              <div className="text-sm text-purple-600 font-medium">Hora de Cierre</div>
              <div className="text-lg text-purple-900 font-semibold">
                {state.tiendaData.Cierre || 'No establecido'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div className="font-medium">{state.error}</div>
        </div>
      )}

      {state.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
          <span className="text-xl">✅</span>
          <div className="font-medium">Cambios guardados correctamente</div>
        </div>
      )}

      {/* Time Selection Grid */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {intervalos.map(time => (
            <div
              key={time}
              onClick={() => handleTimeClick(time)}
              className={`
                group relative flex justify-between items-center p-3 rounded-lg cursor-pointer
                transition-all duration-200
                ${isInRange(time) 
                  ? 'bg-blue-50 border-2 border-blue-500 shadow-sm' 
                  : 'border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }
              `}
            >
              <span className="text-sm font-medium">{time}</span>
              <div className={`
                w-4 h-4 rounded-full border-2 transition-colors
                ${isInRange(time) 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'border-gray-300 group-hover:border-gray-400'
                }
              `}>
                {isInRange(time) && (
                  <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Help Card */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">¿Cómo funciona?</h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-700 flex items-start gap-2">
            <span className="text-blue-500">1.</span>
            Selecciona los intervalos de tiempo para establecer el horario comercial.
          </p>
          <p className="text-sm text-gray-700 flex items-start gap-2">
            <span className="text-blue-500">2.</span>
            Puedes seleccionar múltiples rangos de horarios para tiendas que cierran al mediodía.
          </p>
          <p className="text-sm text-gray-700 flex items-start gap-2">
            <span className="text-blue-500">3.</span>
            Los intervalos son de {state.tiendaData.pais?.toUpperCase() === 'FRANCIA' ? '15' : '30'} minutos según la configuración del país.
          </p>
          <p className="text-sm text-gray-700 flex items-start gap-2">
            <span className="text-blue-500">4.</span>
            Haz clic en 'Guardar Cambios' para actualizar el horario en Airtable.
          </p>
        </div>
      </div>
    </div>
  );
} 