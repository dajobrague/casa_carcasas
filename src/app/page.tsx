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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Casa de las Carcasas</h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Bienvenido al portal interno de Casa de las Carcasas.
          </p>
          <p className="text-gray-600">
            Este es un sistema de uso exclusivo para personal autorizado.
          </p>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <p className="text-sm text-gray-500 text-center">
            Si necesitas acceso, por favor contacta al departamento de sistemas.
          </p>
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