'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  verificarConexionAirtable, 
  obtenerSemanasLaborales,
  obtenerDatosSemanasLaborales,
  obtenerDatosTienda,
  SemanaLaboralRecord,
  TiendaSupervisorRecord,
  obtenerMesesEditor
} from '@/lib/airtable';
import { mostrarNotificacion } from '@/lib/utils';

interface ScheduleContextType {
  // Estado
  storeRecordId: string | null;
  setStoreRecordId: (id: string) => void;
  currentYear: string;
  setCurrentYear: (year: string) => void;
  availableYears: string[];
  setAvailableYears: (years: string[]) => void;
  isLoading: boolean;
  error: string | null;
  
  // Datos de la tienda
  storeName: string | null;
  storeNumber: string | null;
  semanasLaborales: SemanaLaboralRecord[];
  tiendaData: TiendaSupervisorRecord | null;
  mesesDisponibles: string[];
  
  // Funciones
  cargarDatosIniciales: () => Promise<void>;
  cargarDatosTienda: (recordId: string) => Promise<void>;
  cargarSemanasLaborales: () => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  // Estado
  const [storeRecordId, setStoreRecordId] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<string>(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Datos de la tienda
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeNumber, setStoreNumber] = useState<string | null>(null);
  const [semanasLaborales, setSemanasLaborales] = useState<SemanaLaboralRecord[]>([]);
  const [tiendaData, setTiendaData] = useState<TiendaSupervisorRecord | null>(null);
  const [mesesDisponibles, setMesesDisponibles] = useState<string[]>([]);
  
  // Cargar datos iniciales
  const cargarDatosIniciales = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Verificar conexión a Airtable
      const isConnected = await verificarConexionAirtable();
      if (!isConnected) {
        throw new Error('No se pudo conectar a Airtable. Verifique su API key y permisos.');
      }
      
      // Cargar semanas laborales
      await cargarSemanasLaborales();
      
      // Si hay un storeRecordId, cargar datos de la tienda
      if (storeRecordId) {
        await cargarDatosTienda(storeRecordId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      mostrarNotificacion(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cargar datos de la tienda
  const cargarDatosTienda = async (recordId: string) => {
    try {
      const data = await obtenerDatosTienda(recordId);
      if (data) {
        setTiendaData(data);
        // Extraer y establecer el nombre y número de la tienda
        setStoreName(data.fields['TIENDA'] || data.fields.Name || null);
        setStoreNumber(data.fields['N°'] || data.fields['Codigo Tienda'] || null);
      } else {
        throw new Error('No se pudo obtener información de la tienda');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos de la tienda';
      setError(errorMessage);
      mostrarNotificacion(errorMessage, 'error');
    }
  };
  
  // Cargar semanas laborales
  const cargarSemanasLaborales = async () => {
    try {
      // Obtener todas las semanas laborales para todos los meses y años
      const records = await obtenerSemanasLaborales('all', 'all');
      setSemanasLaborales(records);
      
      // Obtener los meses disponibles del nuevo endpoint para el editor
      // Esta función devuelve los meses con el formato correcto
      const meses = await obtenerMesesEditor();
      
      setMesesDisponibles(meses);
      
      // Extraer años únicos de los meses disponibles
      const years = [...new Set(meses.map(mesCompleto => {
        const partes = mesCompleto.split(' ');
        return partes[partes.length - 1]; // El año es la última parte
      }))].filter(Boolean).sort() as string[];
      
      setAvailableYears(years);
      
      // Si el año actual no está en la lista, usar el primer año disponible
      if (years.length > 0 && !years.includes(currentYear)) {
        setCurrentYear(years[0] || '');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar semanas laborales';
      setError(errorMessage);
      mostrarNotificacion(errorMessage, 'error');
    }
  };
  
  // Efecto para cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, [storeRecordId]);
  
  const value = {
    storeRecordId,
    setStoreRecordId,
    currentYear,
    setCurrentYear,
    availableYears,
    setAvailableYears,
    isLoading,
    error,
    storeName,
    storeNumber,
    semanasLaborales,
    tiendaData,
    mesesDisponibles,
    cargarDatosIniciales,
    cargarDatosTienda,
    cargarSemanasLaborales
  };
  
  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
} 