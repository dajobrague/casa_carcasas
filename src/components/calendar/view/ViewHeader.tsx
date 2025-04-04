'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Clock } from 'lucide-react';

interface ViewHeaderProps {
  storeName?: string | null;
  storeNumber?: string | null;
}

export function ViewHeader({ storeName, storeNumber }: ViewHeaderProps) {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  
  // Actualizar la fecha y hora cada segundo
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      setCurrentDateTime(now.toLocaleDateString('es-ES', options));
    };
    
    // Actualizar inmediatamente y luego cada segundo
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  }, []);
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="relative h-10 w-24 mr-3">
                <Image 
                  src="/images/a1f5f4d1aeb6ac161feb1b4d91bda0240020897d.png" 
                  alt="Casa de las Carcasas Logo"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              {storeName && (
                <div className="border-l-2 border-gray-200 pl-3">
                  <div className="text-gray-900 text-lg font-bold">{storeName}</div>
                  {storeNumber && (
                    <div className="text-sm text-blue-600 font-medium">Tienda #{storeNumber}</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center text-gray-600">
            <Clock className="h-5 w-5 mr-2 text-blue-500" />
            <span className="text-sm font-medium">{currentDateTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
} 