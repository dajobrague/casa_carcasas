'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

// Función para obtener datos de la tienda
async function fetchTiendaData(recordId: string) {
  try {
    const response = await fetch(`/api/airtable?action=obtenerTienda&recordId=${recordId}`);
    if (!response.ok) {
      throw new Error('Error al obtener los datos de la tienda');
    }
    return await response.json();
  } catch (error) {
    console.error('Error al cargar datos de tienda:', error);
    return null;
  }
}

export default function StoreNavigation() {
  const searchParams = useSearchParams();
  const pathname = usePathname() || '';
  const recordId = searchParams?.get('recordId') || pathname.split('/')[2];
  const [tiendaData, setTiendaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos de la tienda
  useEffect(() => {
    if (recordId) {
      setLoading(true);
      fetchTiendaData(recordId)
        .then(data => {
          setTiendaData(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [recordId]);

  if (!recordId) return null;

  const isEditor = pathname.startsWith('/editor/');
  const isHorarios = pathname.startsWith('/tienda-horarios');
  const isGestorMensual = pathname.startsWith('/gestor-mensual');

  // Obtener nombre y número de la tienda
  const nombreTienda = tiendaData?.record?.fields?.TIENDA || tiendaData?.record?.fields?.Name || 'Tienda';
  const numeroTienda = tiendaData?.record?.fields?.['N°'] || '';

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-6 sm:px-8">
        {/* Logo a la izquierda */}
        <div className="flex items-center pl-1">
          <div className="flex-shrink-0">
            {/* Ruta del logo en la carpeta public */}
            <Image 
              src="/images/a1f5f4d1aeb6ac161feb1b4d91bda0240020897d.png" 
              alt="Logo La Casa de las Carcasas" 
              width={100} 
              height={32}
              className="h-8 w-auto"
            />
          </div>
        </div>
        
        {/* Navegación en el centro */}
        <div className="flex justify-center flex-1">
          <div className="flex space-x-2">
            <Link
              href={`/editor/${recordId}`}
              className={`
                relative px-4 py-2 text-sm font-medium transition-all duration-200
                ${isEditor 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Horario Empleados</span>
              </div>
              {isEditor && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
              )}
            </Link>
            <Link
              href={`/gestor-mensual?recordId=${recordId}`}
              className={`
                relative px-4 py-2 text-sm font-medium transition-all duration-200
                ${isGestorMensual 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Gestión Empleados</span>
              </div>
              {isGestorMensual && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
              )}
            </Link>
            <Link
              href={`/tienda-horarios?recordId=${recordId}`}
              className={`
                relative px-4 py-2 text-sm font-medium transition-all duration-200
                ${isHorarios 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Horario Tienda</span>
              </div>
              {isHorarios && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
              )}
            </Link>
          </div>
        </div>
        
        {/* Información de la tienda a la derecha */}
        <div className="flex items-center pr-1">
          {loading ? (
            <div className="text-xs text-gray-500">Cargando...</div>
          ) : (
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{nombreTienda}</div>
              {numeroTienda && (
                <div className="text-xs text-gray-500">N° {numeroTienda}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 