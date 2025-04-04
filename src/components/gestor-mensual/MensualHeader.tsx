'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import MesSelector from './MesSelector';
import Contadores from './Contadores';

export default function MensualHeader() {
  const { storeRecordId } = useAuth();
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('');

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <h1 className="text-2xl font-bold text-gray-900">Gestor Mensual</h1>
        </div>
        
        <MesSelector 
          tiendaId={storeRecordId || ''}
          onSelectMes={setMesSeleccionado}
          mesSeleccionado={mesSeleccionado}
        />
        
        <Contadores />
      </div>
    </div>
  );
} 