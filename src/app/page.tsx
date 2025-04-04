'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Componente de carga
function LoadingHome() {
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Componente que utiliza useSearchParams
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, loginWithRecordId, loading } = useAuth();
  
  useEffect(() => {
    const handleInitialNavigation = async () => {
      // Si está cargando, esperar
      if (loading) return;
      
      // Si ya está autenticado, ir a /tienda
      if (isLoggedIn) {
        router.push('/tienda');
        return;
      }
      
      // Si hay un recordId en la URL, intentar login automático
      if (searchParams) {
        const recordId = searchParams.get('recordId');
        
        if (recordId) {
          try {
            // Intentar login con el recordId
            const success = await loginWithRecordId(recordId);
            if (success) {
              // Si funciona, ir a /tienda
              router.push('/tienda');
              return;
            }
          } catch (err) {
            console.error('Error en login automático:', err);
          }
        }
      }
      
      // Si no hay autenticación, ir a login
      router.push('/login');
    };
    
    handleInitialNavigation();
  }, [searchParams, router, isLoggedIn, loginWithRecordId, loading]);
  
  // Mostrar un indicador de carga mientras se decide dónde redirigir
  return <LoadingHome />;
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingHome />}>
      <HomeContent />
    </Suspense>
  );
} 