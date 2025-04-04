'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import RouteGuard from '@/components/auth/RouteGuard';

export default function TiendaHorariosPage() {
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