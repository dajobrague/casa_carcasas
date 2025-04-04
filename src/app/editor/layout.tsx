import React from 'react';
import StoreNavigation from '@/components/StoreNavigation';

export const metadata = {
  title: 'Editor de Horarios',
  description: 'Herramienta para gestionar los horarios de tiendas',
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StoreNavigation />
      <div className="bg-gray-50 min-h-screen">
        {children}
      </div>
    </>
  );
} 