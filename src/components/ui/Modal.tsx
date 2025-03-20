'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  rightContent?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
  rightContent
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Manejar tecla Escape y prevenir scroll del body
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    // En dispositivos móviles no bloqueamos el scroll para permitir interacción fluida
    // Solo bloqueamos en dispositivos desktop
    if (isOpen && window.innerWidth >= 640) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Cerrar al hacer clic fuera del modal - sólo en desktop
  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // En móviles, no cerrar al hacer clic fuera
    if (window.innerWidth >= 640 && modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Mapeo de tamaños a clases
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  };

  if (!isOpen) return null;

  // Determinar si estamos en móvil
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div 
      className={`fixed inset-0 z-50 ${
        isMobile 
          ? 'bg-white' 
          : 'flex items-center justify-center bg-black bg-opacity-50 transition-opacity overflow-y-auto'
      }`}
      onClick={handleOutsideClick}
    >
      <div 
        ref={modalRef}
        className={cn(
          isMobile 
            ? 'w-full h-full flex flex-col'
            : 'bg-white shadow-xl transform transition-all max-h-[85vh] w-full sm:rounded-lg',
          !isMobile && sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <div className="flex items-center gap-2">
              {rightContent}
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        <div className={cn(
          'flex-1 overflow-y-auto',
          !className?.includes('p-0') ? 'p-6' : ''
        )}>
          {children}
        </div>
      </div>
    </div>
  );
} 