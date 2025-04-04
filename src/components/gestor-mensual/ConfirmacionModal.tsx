'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';

interface ConfirmacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  type?: 'warning' | 'danger' | 'info';
}

export default function ConfirmacionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  type = 'warning'
}: ConfirmacionModalProps) {
  if (!isOpen) return null;

  // Estilos según el tipo
  let iconColor = 'text-yellow-500';
  let confirmBtnClass = 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-300';
  let iconSvg = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );

  if (type === 'danger') {
    iconColor = 'text-red-500';
    confirmBtnClass = 'bg-red-500 hover:bg-red-600 focus:ring-red-300';
    iconSvg = (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    );
  } else if (type === 'info') {
    iconColor = 'text-blue-500';
    confirmBtnClass = 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300';
    iconSvg = (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Contenido */}
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className={`${iconColor} mb-4`}>
              {iconSvg}
            </div>
            <p className="text-gray-600">{message}</p>
          </div>
          
          {/* Botones */}
          <div className="flex space-x-3 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
            >
              {cancelButtonText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 transition-colors ${confirmBtnClass}`}
            >
              {confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 