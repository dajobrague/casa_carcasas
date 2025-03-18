import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LCDLC - Horarios',
  description: 'Aplicación para gestionar los horarios de los empleados de Casa Carcasas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <main className="min-h-screen p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
} 