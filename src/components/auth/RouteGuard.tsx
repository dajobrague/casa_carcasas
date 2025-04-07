'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface RouteGuardProps {
  children: ReactNode;
}

// Token fijo para el bypass de autenticación - Debería ser más seguro en un entorno real
const BYPASS_TOKEN = 'cc_access_token';

export default function RouteGuard({ children }: RouteGuardProps) {
  const { isLoggedIn, loading, loginWithRecordId } = useAuth();
  const router = useRouter();
  const [bypassChecked, setBypassChecked] = useState(false);
  const [bypassLoading, setBypassLoading] = useState(true);

  useEffect(() => {
    // Solo ejecutar en el lado del cliente
    if (typeof window === 'undefined') {
      setBypassLoading(false);
      setBypassChecked(true);
      return;
    }

    const checkBypass = async () => {
      // Usar URLSearchParams en lugar de useSearchParams hook
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token');
      const id = searchParams.get('id');
      
      if (token === BYPASS_TOKEN && id) {
        // Este es un acceso directo con token válido, intentar login con el ID de la tienda
        try {
          console.log('Bypass de autenticación detectado. Intentando login automático con ID:', id);
          const success = await loginWithRecordId(id);
          
          if (success) {
            console.log('Login por bypass exitoso');
          } else {
            console.error('Login por bypass falló - ID inválido');
            router.push('/login');
          }
        } catch (err) {
          console.error('Error en bypass de autenticación:', err);
          router.push('/login');
        }
      }
      
      setBypassChecked(true);
      setBypassLoading(false);
    };
    
    if (!isLoggedIn && !loading) {
      checkBypass();
    } else {
      setBypassLoading(false);
      setBypassChecked(true);
    }
  }, [isLoggedIn, loading, loginWithRecordId, router]);

  useEffect(() => {
    // No ejecutar en el servidor
    if (typeof window === 'undefined') return;

    // Redirección a login solo si:
    // 1. No está cargando la autenticación normal
    // 2. No está cargando el proceso de bypass 
    // 3. El bypass ya fue verificado
    // 4. No está autenticado
    if (!loading && !bypassLoading && bypassChecked && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, loading, router, bypassLoading, bypassChecked]);

  // Mostrar loader mientras se verifica la autenticación (normal o bypass)
  if (loading || bypassLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Si está autenticado, mostrar el contenido
  return isLoggedIn ? <>{children}</> : null;
} 