import { createContext, useContext } from 'react';

// Definir el contexto de navegación interna
export type ViewType = 'dashboard' | 'editor' | 'gestor-mensual' | 'horarios';

export interface TiendaNavigationContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

export const TiendaNavigationContext = createContext<TiendaNavigationContextType | undefined>(undefined);

// Hook para usar el contexto
export function useTiendaNavigation() {
  const context = useContext(TiendaNavigationContext);
  if (context === undefined) {
    throw new Error('useTiendaNavigation debe usarse dentro de un TiendaNavigationProvider');
  }
  return context;
} 