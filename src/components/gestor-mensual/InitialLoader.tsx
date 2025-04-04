'use client';

import { useEffect, useState } from 'react';

interface InitialLoaderProps {
  onRecordIdFound: (recordId: string) => void;
  onError: (error: string) => void;
  defaultRecordId?: string;
}

export default function InitialLoader({ onRecordIdFound, onError, defaultRecordId }: InitialLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Cargando aplicación...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const maxAttempts = 50; // 5 segundos con intervalos de 100ms
    let currentAttempt = 0;
    const interval = 100;

    const checkURL = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const recordId = urlParams.get('recordId');

      if (recordId) {
        console.log('Record ID encontrado en URL:', recordId);
        setTimeout(() => {
          // Asegurar un mínimo de tiempo de carga de 1 segundo
          onRecordIdFound(recordId);
          setLoading(false);
        }, 1000);
        return;
      }

      // Si tenemos un ID predeterminado, usarlo después de unos intentos
      if (defaultRecordId && currentAttempt >= 10) {
        console.log('Usando Record ID predeterminado:', defaultRecordId);
        setTimeout(() => {
          onRecordIdFound(defaultRecordId);
          setLoading(false);
        }, 1000);
        return;
      }

      currentAttempt++;
      
      if (currentAttempt >= maxAttempts) {
        const errorMsg = 'No se pudo obtener el ID de la tienda';
        setError(errorMsg);
        setMessage(errorMsg);
        onError(errorMsg);
        setLoading(false);
        return;
      }

      setTimeout(checkURL, interval);
    };

    checkURL();
  }, [onRecordIdFound, onError, defaultRecordId]);

  if (!loading && !error) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col justify-center items-center z-50">
      {loading && (
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      )}
      <div className={`mt-4 text-lg ${error ? 'text-red-600' : 'text-gray-600'} font-medium`}>
        {message}
      </div>
    </div>
  );
} 