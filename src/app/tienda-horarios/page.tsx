'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import RouteGuard from '@/components/auth/RouteGuard';

// Indicar a Next.js que esta es una página dinámica
export const dynamic = 'force-dynamic';

function TiendaHorariosContent() {
  const { storeRecordId } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (storeRecordId) {
      router.push(`/tienda`);
    }
  }, [storeRecordId, router]);
  
  return (
    <RouteGuard>
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    </RouteGuard>
  );
}

// Fallback para Suspense
function TiendaHorariosFallback() {
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function TiendaHorariosPage() {
  return (
    <Suspense fallback={<TiendaHorariosFallback />}>
      <TiendaHorariosContent />
    </Suspense>
  );
} 