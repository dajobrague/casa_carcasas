'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const [storeNumber, setStoreNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { login, loginWithRecordId, isLoggedIn, loading, error } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Verificar si hay un recordId en la URL para login automático
  useEffect(() => {
    const autoLogin = async () => {
      const recordId = searchParams?.get('recordId');
      
      if (recordId && !isLoggedIn && !loading) {
        setIsSubmitting(true);
        try {
          const success = await loginWithRecordId(recordId);
          if (success) {
            router.push('/tienda');
          }
        } catch (err) {
          console.error('Error en login automático:', err);
        } finally {
          setIsSubmitting(false);
        }
      }
    };
    
    autoLogin();
  }, [searchParams, loginWithRecordId, isLoggedIn, loading, router]);
  
  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isLoggedIn && !loading) {
      router.push('/tienda');
    }
  }, [isLoggedIn, loading, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    // Validaciones básicas
    if (!storeNumber.trim()) {
      setLocalError('Ingrese el número de tienda');
      return;
    }
    
    if (!password.trim()) {
      setLocalError('Ingrese la contraseña');
      return;
    }
    
    // Convertir a número
    const storeNumberInt = parseInt(storeNumber.trim());
    if (isNaN(storeNumberInt)) {
      setLocalError('El número de tienda debe ser un valor numérico');
      return;
    }
    
    // Intentar login
    setIsSubmitting(true);
    try {
      const success = await login(storeNumberInt, password.trim());
      if (success) {
        router.push('/tienda');
      }
    } catch (err) {
      console.error('Error en login:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <div className="relative h-16 w-36">
              <Image 
                src="/images/a1f5f4d1aeb6ac161feb1b4d91bda0240020897d.png" 
                alt="Casa de las Carcasas Logo"
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          </Link>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Iniciar Sesión</h1>
          
          {(error || localError) && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
              {localError || error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="storeNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Número de Tienda
              </label>
              <input
                type="text"
                id="storeNumber"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeNumber}
                onChange={(e) => setStoreNumber(e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: 123"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="Ingrese su contraseña"
              />
            </div>
            
            <button
              type="submit"
              className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
        
        <div className="text-center mt-4 text-sm text-gray-600">
          <p>
            Si tienes problemas para acceder, contacta con soporte.
          </p>
        </div>
      </div>
    </div>
  );
} 