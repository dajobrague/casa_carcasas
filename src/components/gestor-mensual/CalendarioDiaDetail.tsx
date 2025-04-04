import React from 'react';
import { BriefcaseIcon, ClockIcon } from '@heroicons/react/24/outline';
import { ResultadoCalculo } from '@/utils/calcularHoras';

interface CalendarioDiaDetailProps {
  resultado: ResultadoCalculo;
}

/**
 * Componente que muestra los detalles de un día con actividad
 */
const CalendarioDiaDetail: React.FC<CalendarioDiaDetailProps> = ({ resultado }) => {
  if (!resultado || !resultado.esTrabajo) return null;
  
  // Limitar el número de slots a mostrar para evitar overflows
  const MAX_SLOTS_MOSTRADOS = 3;
  const tieneSlotsExtra = resultado.camposTrabajo && resultado.camposTrabajo.length > MAX_SLOTS_MOSTRADOS;
  const slotsAMostrar = resultado.camposTrabajo 
    ? resultado.camposTrabajo.slice(0, MAX_SLOTS_MOSTRADOS) 
    : [];
  
  return (
    <div className="rounded-md overflow-hidden text-xs animate-fadeIn h-full flex flex-col">
      {/* Cabecera con horas */}
      <div className="flex items-center justify-between bg-green-100 p-1 text-green-800 font-medium shrink-0">
        <div className="flex items-center truncate">
          <BriefcaseIcon className="h-3 w-3 mr-0.5 flex-shrink-0" /> 
          <span className="truncate">{resultado.horasTotales}h</span>
        </div>
        <div className="flex items-center whitespace-nowrap">
          <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded-sm">{resultado.slots}</span>
        </div>
      </div>
      
      {/* Sólo mostrar los slots si no hay muchos */}
      {resultado.slots > 0 && resultado.slots <= 6 && (
        <div className="bg-white p-1 border-x border-b border-green-100 text-gray-600 flex-1 overflow-hidden">
          {/* Lista de slots - simplificada */}
          <div className="flex flex-wrap gap-0.5">
            {slotsAMostrar.map((campo, index) => (
              <span 
                key={index} 
                className="inline-block bg-blue-50 text-blue-700 px-0.5 rounded text-[9px]"
              >
                {campo}
              </span>
            ))}
            {tieneSlotsExtra && (
              <span className="inline-block text-blue-700 text-[9px]">
                +{resultado.camposTrabajo!.length - MAX_SLOTS_MOSTRADOS} más
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Si hay muchos slots, mostrar un resumen */}
      {resultado.slots > 6 && (
        <div className="bg-white p-1 border-x border-b border-green-100 text-gray-600 flex-1 overflow-hidden">
          <div className="text-center text-[9px] text-blue-700">
            {resultado.slots} slots de {resultado.duracionSlot * 60}min
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioDiaDetail; 