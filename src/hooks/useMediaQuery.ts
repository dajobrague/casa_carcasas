'use client';

import { useState, useEffect } from 'react';

/**
 * Hook para detectar media queries
 * @param query La media query a evaluar (ej: '(max-width: 640px)')
 * @returns boolean indicando si la media query coincide
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    // Verificar si estamos en el navegador (evitar errores durante SSR)
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      
      // Establecer el estado inicial
      setMatches(media.matches);
      
      // Función para actualizar el estado cuando cambia la media query
      const listener = () => setMatches(media.matches);
      
      // Añadir listener
      media.addEventListener('change', listener);
      
      // Limpiar listener al desmontar
      return () => media.removeEventListener('change', listener);
    }
    
    // Valor por defecto para SSR
    return undefined;
  }, [query]);
  
  return matches;
} 