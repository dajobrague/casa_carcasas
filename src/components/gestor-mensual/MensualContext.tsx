'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { GestorMensualState, TiendaData, EmpleadoRecord, VacanteRecord, SemanaLaboralRecord } from './types';

// Definir el contexto
const initialState: GestorMensualState = {
  tiendaId: null,
  tiendaData: null,
  empleados: [],
  vacantes: [],
  mesSeleccionado: null,
  semanasLaborales: [],
  loading: true,
  error: null
};

interface MensualContextType extends GestorMensualState {
  setTiendaId: (id: string) => void;
  setTiendaData: (data: TiendaData | null) => void;
  setEmpleados: (empleados: EmpleadoRecord[]) => void;
  setVacantes: (vacantes: VacanteRecord[]) => void;
  setMesSeleccionado: (mes: string | null) => void;
  setSemanasLaborales: (semanas: SemanaLaboralRecord[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

const MensualContext = createContext<MensualContextType | undefined>(undefined);

interface MensualProviderProps {
  children: ReactNode;
  initialValues?: {
    tiendaId: string | null;
    tiendaData: TiendaData | null;
  };
}

export function MensualProvider({ children, initialValues }: MensualProviderProps) {
  const [state, setState] = useState<GestorMensualState>({
    ...initialState,
    tiendaId: initialValues?.tiendaId || null,
    tiendaData: initialValues?.tiendaData || null
  });

  const setTiendaId = (id: string) => {
    setState(prev => ({ ...prev, tiendaId: id }));
  };

  const setTiendaData = (data: TiendaData | null) => {
    setState(prev => ({ ...prev, tiendaData: data }));
  };

  const setEmpleados = (empleados: EmpleadoRecord[]) => {
    setState(prev => ({ ...prev, empleados }));
  };

  const setVacantes = (vacantes: VacanteRecord[]) => {
    setState(prev => ({ ...prev, vacantes }));
  };

  const setMesSeleccionado = (mes: string | null) => {
    setState(prev => ({ ...prev, mesSeleccionado: mes }));
  };

  const setSemanasLaborales = (semanas: SemanaLaboralRecord[]) => {
    setState(prev => ({ ...prev, semanasLaborales: semanas }));
  };

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const resetState = () => {
    setState(initialState);
  };

  const value = {
    ...state,
    setTiendaId,
    setTiendaData,
    setEmpleados,
    setVacantes,
    setMesSeleccionado,
    setSemanasLaborales,
    setLoading,
    setError,
    resetState
  };

  return (
    <MensualContext.Provider value={value}>
      {children}
    </MensualContext.Provider>
  );
}

export function useMensual() {
  const context = useContext(MensualContext);
  if (context === undefined) {
    throw new Error('useMensual debe usarse dentro de un MensualProvider');
  }
  return context;
} 