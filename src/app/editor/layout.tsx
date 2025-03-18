import React from 'react';

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
    <div className="bg-gray-50 min-h-screen">
      {children}
    </div>
  );
} 