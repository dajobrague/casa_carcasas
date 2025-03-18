import React from 'react';

export const metadata = {
  title: 'Vista de Horarios',
  description: 'Visualización de horarios de tiendas',
};

export default function ViewLayout({
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