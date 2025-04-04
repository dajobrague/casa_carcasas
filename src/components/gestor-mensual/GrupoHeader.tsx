'use client';

import { useState } from 'react';

interface GrupoHeaderProps {
  titulo: string;
  icono?: string;
  cantidad: number;
  collapsed?: boolean;
  onCollapseToggle?: (collapsed: boolean) => void;
}

export default function GrupoHeader({ 
  titulo, 
  icono = '📄', 
  cantidad, 
  collapsed = false,
  onCollapseToggle 
}: GrupoHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  
  const handleToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onCollapseToggle) {
      onCollapseToggle(newCollapsedState);
    }
  };
  
  return (
    <div 
      className="flex items-center justify-between py-3 px-2 border-b border-gray-200 cursor-pointer user-select-none"
      onClick={handleToggle}
    >
      <div className="flex items-center gap-2 font-medium text-gray-700">
        <span>{icono}</span>
        <span>{titulo}</span>
        <span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs text-gray-600 ml-2">
          {cantidad}
        </span>
      </div>
      
      <button className="text-gray-500 hover:text-gray-700 transition-colors">
        {isCollapsed ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>
    </div>
  );
} 