'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Indicar a Next.js que esta es una página dinámica
export const dynamic = 'force-dynamic';

// Componente que utiliza useSearchParams
function HomeContent() {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (isLoggedIn && !loading) {
      router.push('/tienda');
    } else if (!loading) {
      router.push('/login');
    }
  }, [isLoggedIn, loading, router]);
  
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Fallback para Suspense
function HomeFallback() {
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
} 