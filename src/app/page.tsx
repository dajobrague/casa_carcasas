'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Componente que utiliza useSearchParams
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Efecto para redirigir a la nueva ruta del editor si se proporciona un storeId
  useEffect(() => {
    const storeId = searchParams.get('storeId');
    
    if (storeId) {
      // Redirigir a la nueva ruta del editor
      router.push(`/editor/${storeId}`);
    }
  }, [searchParams, router]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Gestor de Horarios</h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Para acceder al editor de horarios, necesitas proporcionar un ID de tienda.
          </p>
          <p className="text-gray-600">
            Usa la URL con el siguiente formato:
          </p>
          <div className="bg-gray-100 p-3 rounded-md mt-2 font-mono text-sm">
            https://tu-app.vercel.app/editor/ID_DE_TIENDA
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Acceso rápido (solo desarrollo)</h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              En un entorno de producción, aquí podrías mostrar enlaces a las tiendas autorizadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de carga mientras suspense está activo
function LoadingHome() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingHome />}>
      <HomeContent />
    </Suspense>
  );
} 