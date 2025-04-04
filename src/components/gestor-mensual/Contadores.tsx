'use client';

import { useMensual } from './MensualContext';

export default function Contadores() {
  const { empleados, vacantes } = useMensual();
  
  return (
    <div className="flex flex-wrap gap-3">
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm transition-all duration-200 hover:border-blue-200">
        <span className="font-medium text-gray-700">👥 Empleados:</span>
        <span className="bg-white px-2 py-1 rounded-md min-w-[2rem] text-center font-semibold text-blue-600">
          {empleados.length}
        </span>
      </div>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm transition-all duration-200 hover:border-blue-200">
        <span className="font-medium text-gray-700">📌 Vacantes:</span>
        <span className="bg-white px-2 py-1 rounded-md min-w-[2rem] text-center font-semibold text-blue-600">
          {vacantes.length}
        </span>
      </div>
    </div>
  );
} 