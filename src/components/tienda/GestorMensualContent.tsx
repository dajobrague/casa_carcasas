'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { obtenerDatosTienda } from '@/components/gestor-mensual/api';
import { TiendaData } from '@/components/gestor-mensual/types';
import MesSelector from '@/components/gestor-mensual/MesSelector';
import EmpleadosSection from '@/components/gestor-mensual/EmpleadosSection';

export default function GestorMensualContent() {
  const { storeRecordId } = useAuth();
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [tiendaData, setTiendaData] = useState<TiendaData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState({
    tienda: false,
    meses: false
  });

  // Cargar datos de la tienda cuando se tenga el recordId
  useEffect(() => {
    const fetchTiendaData = async () => {
      if (!storeRecordId) return;
      
      console.log('Cargando datos para tienda:', storeRecordId);
      setLoadingDetails(prev => ({ ...prev, tienda: true }));
      
      try {
        const data = await obtenerDatosTienda(storeRecordId);
        setTiendaData(data);
      } catch (err) {
        console.error('Error al cargar datos de tienda:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar datos de tienda');
      } finally {
        setLoadingDetails(prev => ({ ...prev, tienda: false }));
        setLoading(false);
      }
    };

    fetchTiendaData();
  }, [storeRecordId]);

  return (
    <div className="lcdc-gestor-mensual">
      {/* Header */}
      <div className="lcdc-header mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
        <p className="text-gray-500">Gestiona la información y actividades de los empleados</p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <MesSelector 
            tiendaId={storeRecordId || ''}
            onSelectMes={setMesSeleccionado}
            mesSeleccionado={mesSeleccionado}
          />
          
          {mesSeleccionado && (
            <EmpleadosSection
              tiendaId={storeRecordId}
              mesSeleccionado={mesSeleccionado}
              tiendaData={tiendaData}
            />
          )}
        </>
      )}
    </div>
  );
} 