'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTiendaNavigation } from '@/hooks/useTiendaNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, FileText, Clock, Users, Building, Map, Phone, Mail } from 'lucide-react';

// Interfaz para datos detallados de la tienda
interface TiendaData {
  nombre?: string;
  codigo?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  pais?: string;
  horarioApertura?: string;
  horarioCierre?: string;
  supervisor?: string;
  empleados?: number;
  emailSupervisor?: string;
  [key: string]: any;
}

export default function DashboardContent() {
  const { storeRecordId, storeName, storeNumber } = useAuth();
  const { setCurrentView } = useTiendaNavigation();
  const [loading, setLoading] = useState(true);
  const [tiendaData, setTiendaData] = useState<TiendaData>({});
  const [error, setError] = useState<string | null>(null);

  // Cargar datos detallados de la tienda
  useEffect(() => {
    const fetchTiendaData = async () => {
      if (!storeRecordId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/airtable?action=obtenerDatosTienda&storeId=${storeRecordId}`);
        
        if (!response.ok) {
          throw new Error('No se pudieron obtener los datos de la tienda');
        }
        
        const data = await response.json();
        
        // Extraer los campos relevantes
        setTiendaData({
          nombre: data.fields['TIENDA'] || data.fields.Name || 'Sin nombre',
          codigo: data.fields['Codigo Tienda'] || 'Sin código',
          pais: data.fields['PAIS'] || data.fields['País'] || 'No disponible',
          horarioApertura: data.fields['Apertura'] || data.fields['Horario Apertura'] || '09:00',
          horarioCierre: data.fields['Cierre'] || data.fields['Horario Cierre'] || '21:00',
          supervisor: data.fields['Nombre + Apellido (from Supervisor [Link] / Area Manager)'] || 'No asignado',
          empleados: data.fields['Numero Empleados'] || data.fields['Empleados en tienda'] || 0,
          emailSupervisor: data.fields['Email Supervisor'] || 'No disponible'
        });
        
      } catch (err) {
        console.error('Error al cargar datos de tienda:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTiendaData();
  }, [storeRecordId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        <h3 className="text-lg font-medium">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tiendaData.nombre}</h1>
        <p className="text-gray-500">Información y acceso a herramientas</p>
      </div>
      
      {/* Tarjetas de acceso rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button 
          onClick={() => setCurrentView('editor')} 
          className="block transition-transform hover:scale-105"
        >
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-medium">Editor de Horarios</CardTitle>
              <Calendar className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Gestiona y visualiza los horarios semanales del personal.
              </p>
            </CardContent>
          </Card>
        </button>
        
        <button 
          onClick={() => setCurrentView('gestor-mensual')} 
          className="block transition-transform hover:scale-105"
        >
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-medium">Gestión Mensual</CardTitle>
              <FileText className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Planifica y gestiona las actividades mensuales de la tienda.
              </p>
            </CardContent>
          </Card>
        </button>
        
        <button 
          onClick={() => setCurrentView('horarios')} 
          className="block transition-transform hover:scale-105"
        >
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-medium">Horario Comercial</CardTitle>
              <Clock className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Configura los horarios de apertura y cierre de la tienda.
              </p>
            </CardContent>
          </Card>
        </button>
      </div>
      
      {/* Información de la tienda */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Información de la Tienda #{storeNumber}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <Building className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Nombre</p>
                  <p className="text-base">{tiendaData.nombre}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Map className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">País</p>
                  <p className="text-base">{tiendaData.pais}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email Supervisor</p>
                  <p className="text-base">{tiendaData.emailSupervisor}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Horario</p>
                  <p className="text-base">{tiendaData.horarioApertura} - {tiendaData.horarioCierre}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Users className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Area Manager</p>
                  <p className="text-base">{tiendaData.supervisor}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Users className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Número de empleados</p>
                  <p className="text-base">{tiendaData.empleados}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 