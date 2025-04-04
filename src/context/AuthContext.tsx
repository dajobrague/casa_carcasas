'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isLoggedIn: boolean;
  storeRecordId: string | null;
  storeNumber: number | null;
  storeName: string | null;
  login: (storeNumber: number, password: string) => Promise<boolean>;
  loginWithRecordId: (recordId: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [storeRecordId, setStoreRecordId] = useState<string | null>(null);
  const [storeNumber, setStoreNumber] = useState<number | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Verificar si hay sesión guardada al cargar
  useEffect(() => {
    const storedAuth = sessionStorage.getItem('storeAuth');
    
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        setIsLoggedIn(true);
        setStoreRecordId(authData.storeRecordId);
        setStoreNumber(authData.storeNumber);
        setStoreName(authData.storeName);
      } catch (err) {
        console.error('Error al cargar datos de autenticación:', err);
        sessionStorage.removeItem('storeAuth');
      }
    }
    
    setLoading(false);
  }, []);

  // Función para iniciar sesión con número de tienda y contraseña (record ID)
  const login = async (storeNumber: number, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Verificar si el password (record ID) permite obtener datos de la tienda
      const response = await fetch(`/api/airtable?action=obtenerDatosTienda&storeId=${password}`);
      
      if (!response.ok) {
        throw new Error('No se pudo autenticar con los datos proporcionados');
      }
      
      const data = await response.json();
      
      // Verificar que el número de tienda coincida con el dato en Airtable
      const tiendaNumero = data.fields['N°'] || data.fields['Tienda Numero'] || null;
      
      if (!tiendaNumero || parseInt(String(tiendaNumero)) !== storeNumber) {
        throw new Error('El número de tienda no coincide con el record ID proporcionado');
      }
      
      // Guardar datos de autenticación
      const authData = {
        storeRecordId: password,
        storeNumber: storeNumber,
        storeName: data.fields['TIENDA'] || data.fields.Name || 'Tienda'
      };
      
      sessionStorage.setItem('storeAuth', JSON.stringify(authData));
      
      setIsLoggedIn(true);
      setStoreRecordId(password);
      setStoreNumber(storeNumber);
      setStoreName(authData.storeName);
      
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error de autenticación';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Función para iniciar sesión directamente con record ID
  const loginWithRecordId = async (recordId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Verificar si el record ID permite obtener datos de la tienda
      const response = await fetch(`/api/airtable?action=obtenerDatosTienda&storeId=${recordId}`);
      
      if (!response.ok) {
        throw new Error('No se pudo autenticar con el record ID proporcionado');
      }
      
      const data = await response.json();
      
      // Obtener el número de tienda
      const tiendaNumero = data.fields['N°'] || data.fields['Tienda Numero'] || 0;
      const numeroTienda = parseInt(String(tiendaNumero));
      
      // Guardar datos de autenticación
      const authData = {
        storeRecordId: recordId,
        storeNumber: numeroTienda,
        storeName: data.fields['TIENDA'] || data.fields.Name || 'Tienda'
      };
      
      sessionStorage.setItem('storeAuth', JSON.stringify(authData));
      
      setIsLoggedIn(true);
      setStoreRecordId(recordId);
      setStoreNumber(numeroTienda);
      setStoreName(authData.storeName);
      
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error de autenticación';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    sessionStorage.removeItem('storeAuth');
    setIsLoggedIn(false);
    setStoreRecordId(null);
    setStoreNumber(null);
    setStoreName(null);
    router.push('/login');
  };

  const value = {
    isLoggedIn,
    storeRecordId,
    storeNumber,
    storeName,
    login,
    loginWithRecordId,
    logout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
} 