'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  verificarConexionAirtable, 
  obtenerDatosSemanasLaborales,
  obtenerDatosTienda,
  SemanasLaboralesRecord,
  TiendaSupervisorRecord
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
  
  // Datos
  semanasLaborales: SemanasLaboralesRecord[];
  tiendaData: TiendaSupervisorRecord | null;
  
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
  
  // Datos
  const [semanasLaborales, setSemanasLaborales] = useState<SemanasLaboralesRecord[]>([]);
  const [tiendaData, setTiendaData] = useState<TiendaSupervisorRecord | null>(null);
  
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
      const records = await obtenerDatosSemanasLaborales();
      setSemanasLaborales(records);
      
      // Obtener años únicos
      const years = [...new Set(records.map(record => record.fields.Year))].sort();
      setAvailableYears(years);
      
      // Si el año actual no está en la lista, usar el primer año disponible
      if (years.length > 0 && !years.includes(currentYear)) {
        setCurrentYear(years[0]);
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
    semanasLaborales,
    tiendaData,
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