'use client';

import { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';

export type ProgressStatus = 'pending' | 'success' | 'error';

interface ProgressToastProps {
  isVisible: boolean;
  status: ProgressStatus;
  title: string;
  message: string;
  progress?: number;
  onClose: () => void;
}

export default function ProgressToast({
  isVisible,
  status,
  title,
  message,
  progress = 0,
  onClose
}: ProgressToastProps) {
  const [isClosing, setIsClosing] = useState(false);

  // Auto-hide after success or error, with delay
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isVisible && (status === 'success' || status === 'error')) {
      timer = setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          onClose();
          setIsClosing(false);
        }, 300); // Match transition duration
      }, 5000); // 5 seconds before auto-close
    }
    return () => clearTimeout(timer);
  }, [isVisible, status, onClose]);

  if (!isVisible) return null;

  // Determine icon based on status
  const StatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <ClockIcon className="h-6 w-6 text-blue-500 animate-pulse" />;
    }
  };

  // Get background color based on status
  const getBgColor = () => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-white border-blue-200';
    }
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 max-w-md w-full md:w-96 shadow-lg border rounded-lg ${getBgColor()} transition-all duration-300 ${
        isClosing ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <StatusIcon />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
            
            {/* Progress bar for pending status */}
            {status === 'pending' && (
              <div className="mt-2 w-full">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
                  <div 
                    style={{ width: `${Math.min(100, progress)}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                  ></div>
                </div>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => {
                setIsClosing(true);
                setTimeout(() => {
                  onClose();
                  setIsClosing(false);
                }, 300);
              }}
              className="inline-flex text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 