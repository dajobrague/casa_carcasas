'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import RouteGuard from '@/components/auth/RouteGuard';
import { obtenerDatosTienda } from '@/components/gestor-mensual/api';
import { TiendaData } from '@/components/gestor-mensual/types';
import MesSelector from '@/components/gestor-mensual/MesSelector';
import EmpleadosSection from '@/components/gestor-mensual/EmpleadosSection';

function GestorMensualContent() {
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

  // Renderizar componente
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Gestor Mensual</h1>
      
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

// Fallback para Suspense
function GestorMensualFallback() {
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function GestorMensual() {
  return (
    <Suspense fallback={<GestorMensualFallback />}>
      <RouteGuard>
        <GestorMensualContent />
      </RouteGuard>
    </Suspense>
  );
} 