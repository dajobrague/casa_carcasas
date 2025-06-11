'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

// Función auxiliar para obtener URL base
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

interface AuthContextType {
  isLoggedIn: boolean;
  storeRecordId: string | null;
  storeNumber: number | null;
  storeName: string | null;
  esHistorica: boolean | null;
  isAdminLoggedIn: boolean;
  login: (storeNumber: number, password: string) => Promise<boolean>;
  loginWithRecordId: (recordId: string) => Promise<boolean>;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  adminLogout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [storeRecordId, setStoreRecordId] = useState<string | null>(null);
  const [storeNumber, setStoreNumber] = useState<number | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [esHistorica, setEsHistorica] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Función para refrescar los datos de la tienda desde Airtable
  const refreshStoreData = async (storeRecordId: string) => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/airtable?action=obtenerDatosTienda&storeId=${storeRecordId}`);
      
      if (response.ok) {
        const data = await response.json();
        const esHistoricaActualizada = Boolean(data.fields['Tienda Histórica?']);
        
        console.log('Debug - Datos actualizados desde Airtable:');
        console.log('Debug - Campo "Tienda Histórica?" actualizado:', data.fields['Tienda Histórica?']);
        console.log('Debug - esHistorica actualizada:', esHistoricaActualizada);
        
        // Actualizar solo si hay diferencia
        if (esHistorica !== esHistoricaActualizada) {
          console.log('Debug - Actualizando esHistorica de', esHistorica, 'a', esHistoricaActualizada);
          setEsHistorica(esHistoricaActualizada);
          
          // Actualizar también en sessionStorage
          const storedAuth = sessionStorage.getItem('storeAuth');
          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            authData.esHistorica = esHistoricaActualizada;
            sessionStorage.setItem('storeAuth', JSON.stringify(authData));
            console.log('Debug - sessionStorage actualizado con nuevo valor de esHistorica');
          }
        }
      }
    } catch (error) {
      console.error('Error al refrescar datos de tienda:', error);
    }
  };

  // Verificar si hay sesión guardada al cargar
  useEffect(() => {
    const storedAuth = sessionStorage.getItem('storeAuth');
    const storedAdminAuth = sessionStorage.getItem('adminAuth');
    const cookieAdminAuth = Cookies.get('adminAuth');
    
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        console.log('Debug - Datos cargados desde sessionStorage:', authData);
        console.log('Debug - esHistorica desde sessionStorage:', authData.esHistorica);
        
        setIsLoggedIn(true);
        setStoreRecordId(authData.storeRecordId);
        setStoreNumber(authData.storeNumber);
        setStoreName(authData.storeName);
        setEsHistorica(authData.esHistorica);
        
        // Verificar y actualizar los datos de la tienda si es necesario
        if (authData.storeRecordId) {
          console.log('Debug - Verificando datos de tienda actualizados...');
          refreshStoreData(authData.storeRecordId);
        }
      } catch (err) {
        console.error('Error al cargar datos de autenticación:', err);
        sessionStorage.removeItem('storeAuth');
      }
    }
    
    // Verificar tanto en sessionStorage como en cookies
    if (storedAdminAuth || cookieAdminAuth) {
      try {
        const adminAuthData = storedAdminAuth 
          ? JSON.parse(storedAdminAuth)
          : (cookieAdminAuth ? JSON.parse(cookieAdminAuth) : null);
          
        if (adminAuthData && adminAuthData.isLoggedIn) {
          setIsAdminLoggedIn(true);
        }
      } catch (err) {
        console.error('Error al cargar datos de autenticación de admin:', err);
        sessionStorage.removeItem('adminAuth');
        Cookies.remove('adminAuth');
      }
    }
    
    setLoading(false);
  }, []);

  // Función para iniciar sesión con número de tienda y contraseña (record ID)
  const login = async (storeNumber: number, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const baseUrl = getBaseUrl();
      // Verificar si el password (record ID) permite obtener datos de la tienda
      const response = await fetch(`${baseUrl}/api/airtable?action=obtenerDatosTienda&storeId=${password}`);
      
      if (!response.ok) {
        throw new Error('No se pudo autenticar con los datos proporcionados');
      }
      
      const data = await response.json();
      
      // Verificar que el número de tienda coincida con el dato en Airtable
      const tiendaNumero = data.fields['N°'] || data.fields['Tienda Numero'] || null;
      
      if (!tiendaNumero || parseInt(String(tiendaNumero)) !== storeNumber) {
        throw new Error('El número de tienda no coincide con el record ID proporcionado');
      }
      
      // Debug: verificar el valor del campo "Tienda Histórica?" y todos los campos disponibles
      console.log('Debug - Todos los campos disponibles:', Object.keys(data.fields));
      console.log('Debug - Campo "Tienda Histórica?" valor crudo:', data.fields['Tienda Histórica?']);
      console.log('Debug - Tipo del valor:', typeof data.fields['Tienda Histórica?']);
      
      // Guardar datos de autenticación
      const authData = {
        storeRecordId: password,
        storeNumber: storeNumber,
        storeName: data.fields['TIENDA'] || data.fields.Name || 'Tienda',
        esHistorica: Boolean(data.fields['Tienda Histórica?'])
      };
      
      console.log('Debug - esHistorica final:', authData.esHistorica);
      sessionStorage.setItem('storeAuth', JSON.stringify(authData));
      
      setIsLoggedIn(true);
      setStoreRecordId(password);
      setStoreNumber(storeNumber);
      setStoreName(authData.storeName);
      setEsHistorica(authData.esHistorica);
      
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
      const baseUrl = getBaseUrl();
      // Verificar si el record ID permite obtener datos de la tienda
      const response = await fetch(`${baseUrl}/api/airtable?action=obtenerDatosTienda&storeId=${recordId}`);
      
      if (!response.ok) {
        throw new Error('No se pudo autenticar con el record ID proporcionado');
      }
      
      const data = await response.json();
      
      // Obtener el número de tienda
      const tiendaNumero = data.fields['N°'] || data.fields['Tienda Numero'] || 0;
      const numeroTienda = parseInt(String(tiendaNumero));
      
      // Debug: verificar el valor del campo "Tienda Histórica?" y todos los campos disponibles en loginWithRecordId
      console.log('Debug (loginWithRecordId) - Todos los campos disponibles:', Object.keys(data.fields));
      console.log('Debug (loginWithRecordId) - Campo "Tienda Histórica?" valor crudo:', data.fields['Tienda Histórica?']);
      console.log('Debug (loginWithRecordId) - Tipo del valor:', typeof data.fields['Tienda Histórica?']);
      
      // Guardar datos de autenticación
      const authData = {
        storeRecordId: recordId,
        storeNumber: numeroTienda,
        storeName: data.fields['TIENDA'] || data.fields.Name || 'Tienda',
        esHistorica: Boolean(data.fields['Tienda Histórica?'])
      };
      
      console.log('Debug (loginWithRecordId) - esHistorica final:', authData.esHistorica);
      sessionStorage.setItem('storeAuth', JSON.stringify(authData));
      
      setIsLoggedIn(true);
      setStoreRecordId(recordId);
      setStoreNumber(numeroTienda);
      setStoreName(authData.storeName);
      setEsHistorica(authData.esHistorica);
      
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error de autenticación';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Función para iniciar sesión como administrador
  const adminLogin = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Credenciales hardcodeadas como solicitado
      if (username === 'CDLC' && password === 'Casa2025!') {
        const adminAuthData = {
          isLoggedIn: true,
          username
        };
        
        // Guardar en sessionStorage para compatibilidad
        sessionStorage.setItem('adminAuth', JSON.stringify(adminAuthData));
        
        // Guardar en cookies para que el middleware pueda acceder
        Cookies.set('adminAuth', JSON.stringify(adminAuthData), { 
          expires: 1, // Expira en 1 día
          path: '/',
          sameSite: 'strict'
        });
        
        // También establecer la cookie admin_session que usa validateAdminSession
        Cookies.set('admin_session', process.env.NEXT_PUBLIC_ADMIN_SECRET || 'Casa2025!', {
          expires: 1,
          path: '/',
          sameSite: 'strict'
        });
        
        setIsAdminLoggedIn(true);
        return true;
      } else {
        throw new Error('Credenciales incorrectas');
      }
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
    setEsHistorica(null);
    router.push('/login');
  };

  // Función para cerrar sesión de administrador
  const adminLogout = () => {
    sessionStorage.removeItem('adminAuth');
    Cookies.remove('adminAuth', { path: '/' });
    setIsAdminLoggedIn(false);
    router.push('/admin/login');
  };

  const value = {
    isLoggedIn,
    storeRecordId,
    storeNumber,
    storeName,
    esHistorica,
    isAdminLoggedIn,
    login,
    loginWithRecordId,
    adminLogin,
    logout,
    adminLogout,
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