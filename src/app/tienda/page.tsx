'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTiendaNavigation } from '@/hooks/useTiendaNavigation';
import { Calendar, FileText, Clock, Users, Building, Map, Phone, Mail } from 'lucide-react';
import { ScheduleProvider } from '@/context/ScheduleContext';
import dynamic from 'next/dynamic';
import RouteGuard from '@/components/auth/RouteGuard';

// Componente de carga
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Importaciones dinámicas para los componentes
const DashboardContent = dynamic(() => import('@/components/tienda/DashboardContent'), {
  loading: () => <LoadingSpinner />
});

const EditorContent = dynamic(() => import('@/components/tienda/EditorContent'), {
  loading: () => <LoadingSpinner />
});

const GestorMensualContent = dynamic(() => import('@/components/tienda/GestorMensualContent'), {
  loading: () => <LoadingSpinner />
});

const HorariosContent = dynamic(() => import('@/components/tienda/HorariosContent'), {
  loading: () => <LoadingSpinner />
});

// Componente principal que requiere autenticación
function TiendaContent() {
  const { storeRecordId } = useAuth();
  const { currentView } = useTiendaNavigation();
  
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardContent />;
      case 'editor':
        return (
          <ScheduleProvider>
            <EditorContent storeId={storeRecordId || ''} />
          </ScheduleProvider>
        );
      case 'gestor-mensual':
        return <GestorMensualContent />;
      case 'horarios':
        return <HorariosContent storeId={storeRecordId || ''} />;
      default:
        return <DashboardContent />;
    }
  };

  return <>{renderContent()}</>;
}

export default function TiendaPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RouteGuard>
        <TiendaContent />
      </RouteGuard>
    </Suspense>
  );
} 