'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Save, Building, Users, AlertCircle, Check, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs as TabsComponent, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

enum SyncType {
  USERS = 'usuarios',
  STORES = 'tiendas'
}

interface TypeConfig {
  enabled: boolean;
  schedule: string;
  time: string;
  dayOfWeek: string;
}

// Componente de carga
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Componente para configurar un tipo específico
function SyncTypeConfig({ 
  type, 
  config, 
  onSave, 
  onRunNow, 
  isSaving, 
  isRunning 
}: { 
  type: SyncType; 
  config: TypeConfig; 
  onSave: (type: SyncType, updatedConfig: TypeConfig) => Promise<void>;
  onRunNow: (type: SyncType) => Promise<void>;
  isSaving: boolean;
  isRunning: boolean;
}) {
  const [isSchedulerEnabled, setIsSchedulerEnabled] = useState<boolean>(config.enabled);
  const [schedule, setSchedule] = useState<string>(config.schedule);
  const [timeHour, setTimeHour] = useState<string>(config.time.split(':')[0] || '03');
  const [timeMinute, setTimeMinute] = useState<string>(config.time.split(':')[1] || '00');
  const [dayOfWeek, setDayOfWeek] = useState<string>(config.dayOfWeek);

  // Actualizar estado cuando cambia la configuración desde props
  useEffect(() => {
    setIsSchedulerEnabled(config.enabled);
    setSchedule(config.schedule);
    setTimeHour(config.time.split(':')[0] || '03');
    setTimeMinute(config.time.split(':')[1] || '00');
    setDayOfWeek(config.dayOfWeek);
  }, [config]);
  
  // Guardar la configuración
  const saveConfig = async () => {
    const updatedConfig = {
      enabled: isSchedulerEnabled,
      schedule,
      time: `${timeHour}:${timeMinute}`,
      dayOfWeek
    };
    
    await onSave(type, updatedConfig);
  };
  
  // Ejecutar ahora
  const runNow = () => {
    onRunNow(type);
  };

  return (
    <div className="space-y-6">
      {/* Interruptor principal */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sincronización Programada</h2>
          <p className="text-sm text-gray-500">Activar o desactivar la sincronización automática</p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id={`scheduler-enabled-${type}`}
            checked={isSchedulerEnabled}
            onCheckedChange={setIsSchedulerEnabled}
            className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300 [&>span]:bg-white"
          />
          <Label htmlFor={`scheduler-enabled-${type}`} className={`font-medium ${isSchedulerEnabled ? 'text-blue-600' : 'text-gray-500'}`}>
            {isSchedulerEnabled ? 'Activado' : 'Desactivado'}
          </Label>
        </div>
      </div>
      
      <Separator />
      
      {/* Configuración */}
      <div className={isSchedulerEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Programador</CardTitle>
            <CardDescription>Defina cuándo sincronizar {type === SyncType.USERS ? 'usuarios' : 'tiendas'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Programación */}
            <div className="space-y-2">
              <Label htmlFor={`schedule-${type}`}>Frecuencia</Label>
              <select
                id={`schedule-${type}`}
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Diariamente</option>
                <option value="weekly">Semanalmente</option>
              </select>
            </div>
            
            {/* Día de la semana (solo para semanal) */}
            {schedule === 'weekly' && (
              <div className="space-y-2">
                <Label htmlFor={`dayOfWeek-${type}`}>Día de la semana</Label>
                <select
                  id={`dayOfWeek-${type}`}
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Lunes</option>
                  <option value="2">Martes</option>
                  <option value="3">Miércoles</option>
                  <option value="4">Jueves</option>
                  <option value="5">Viernes</option>
                  <option value="6">Sábado</option>
                  <option value="0">Domingo</option>
                </select>
              </div>
            )}
            
            {/* Hora */}
            <div className="space-y-2">
              <Label>Hora de ejecución</Label>
              <div className="flex space-x-2">
                <select
                  value={timeHour}
                  onChange={(e) => setTimeHour(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => i)
                    .map(hour => (
                      <option 
                        key={hour} 
                        value={hour.toString().padStart(2, '0')}
                      >
                        {hour.toString().padStart(2, '0')}
                      </option>
                    ))
                  }
                </select>
                <span className="flex items-center">:</span>
                <select
                  value={timeMinute}
                  onChange={(e) => setTimeMinute(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 60 }, (_, i) => i)
                    .filter(min => min % 5 === 0) // Solo mostrar múltiplos de 5
                    .map(min => (
                      <option 
                        key={min} 
                        value={min.toString().padStart(2, '0')}
                      >
                        {min.toString().padStart(2, '0')}
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Botones de acción */}
      <div className="flex justify-between items-center mt-6">
        <Button
          variant="outline"
          onClick={runNow}
          disabled={isRunning}
          className="flex items-center"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-600 mr-3"></div>
              Ejecutando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Ejecutar ahora
            </>
          )}
        </Button>
        
        <Button
          onClick={saveConfig}
          disabled={isSaving}
          className="flex items-center bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Guardar configuración
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function SyncSchedulerPage() {
  const router = useRouter();
  
  // Usamos la autenticación de administrador
  const { isAdminLoggedIn, loading, adminLogout } = useAuth();
  
  // Estado para configuración del programador
  const [configs, setConfigs] = useState<Record<SyncType, TypeConfig>>({
    [SyncType.USERS]: {
      enabled: false,
      schedule: 'daily',
      time: '03:00',
      dayOfWeek: '1'
    },
    [SyncType.STORES]: {
      enabled: false,
      schedule: 'daily',
      time: '03:00',
      dayOfWeek: '1'
    }
  });
  
  const [activeTab, setActiveTab] = useState<SyncType>(SyncType.STORES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<Record<SyncType, boolean>>({
    [SyncType.USERS]: false,
    [SyncType.STORES]: false
  });
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Protección de ruta para administradores
  useEffect(() => {
    if (!loading && !isAdminLoggedIn) {
      router.push('/admin/login');
    }
  }, [isAdminLoggedIn, loading, router]);
  
  // Cargar configuración actual al iniciar
  useEffect(() => {
    const fetchCurrentConfig = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/sync-schedule', {
          headers: {
            'X-Internal-Scheduler': 'true'
          }
        });
        if (!response.ok) {
          throw new Error('Error al cargar la configuración');
        }
        
        const data = await response.json();
        
        // Actualizar el estado con la configuración
        if (data.config) {
          setConfigs({
            [SyncType.USERS]: {
              enabled: data.config.usuarios?.enabled || false,
              schedule: data.config.usuarios?.schedule || 'daily',
              time: data.config.usuarios?.time || '03:00',
              dayOfWeek: data.config.usuarios?.dayOfWeek || '1'
            },
            [SyncType.STORES]: {
              enabled: data.config.tiendas?.enabled || false,
              schedule: data.config.tiendas?.schedule || 'daily',
              time: data.config.tiendas?.time || '03:00',
              dayOfWeek: data.config.tiendas?.dayOfWeek || '1'
            }
          });
        }
      } catch (err) {
        setError('Error al cargar la configuración. Intente de nuevo más tarde.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAdminLoggedIn) {
      fetchCurrentConfig();
    }
  }, [isAdminLoggedIn]);
  
  // Guardar configuración
  const saveSchedulerConfig = async (type: SyncType, updatedConfig: TypeConfig) => {
    setIsSaving(true);
    setSuccess(false);
    setError(null);
    
    try {
      const config = {
        enabled: updatedConfig.enabled,
        schedule: updatedConfig.schedule,
        time: updatedConfig.time,
        dayOfWeek: updatedConfig.dayOfWeek
      };
      
      const response = await fetch('/api/admin/sync-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Scheduler': 'true'
        },
        body: JSON.stringify({ config, type })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la configuración');
      }
      
      // Actualizar el estado local
      setConfigs(prev => ({
        ...prev,
        [type]: updatedConfig
      }));
      
      setSuccess(true);
      
      // Ocultar el mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError((err as Error).message || 'Ocurrió un error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Ejecutar sincronización manual
  const runManualSync = async (type: SyncType) => {
    setIsRunning(prev => ({ ...prev, [type]: true }));
    setError(null);
    
    try {
      const url = `/api/admin/scheduler?operation=run&type=${type}`;
      
      const response = await fetch(url, {
        headers: {
          'X-Internal-Scheduler': 'true'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al ejecutar la sincronización');
      }
      
      // Mostrar éxito
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError((err as Error).message || 'Ocurrió un error durante la sincronización.');
    } finally {
      setIsRunning(prev => ({ ...prev, [type]: false }));
    }
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAdminLoggedIn) {
    return null; // Redirecciona en useEffect
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Contenido principal */}
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h1 className="text-xl font-bold text-gray-900">Programador de Sincronización</h1>
              <p className="mt-1 text-sm text-gray-500">
                Configure la sincronización automática de datos entre la API de LCDC y Airtable
              </p>
            </div>
            
            <div className="p-6">
              {/* Estado de carga */}
              {isLoading && (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              {!isLoading && (
                <div className="space-y-6">
                  {/* Mensaje de error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                      <div className="flex">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">Error</p>
                          <p className="text-sm">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Mensaje de éxito */}
                  {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
                      <div className="flex">
                        <Check className="w-5 h-5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">Operación exitosa</p>
                          <p className="text-sm">La acción se completó correctamente.</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Pestañas para configurar diferentes tipos */}
                  <TabsComponent
                    defaultValue={SyncType.STORES}
                    onValueChange={(value) => setActiveTab(value as SyncType)}
                    className="w-full"
                  >
                    <TabsList className="mb-6 w-full grid grid-cols-2 bg-gray-100 p-1 rounded-lg">
                      <TabsTrigger 
                        value={SyncType.STORES} 
                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 py-2 transition-all"
                      >
                        <Building className="w-4 h-4" />
                        <span className="font-medium">Tiendas</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value={SyncType.USERS} 
                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 py-2 transition-all"
                      >
                        <Users className="w-4 h-4" />
                        <span className="font-medium">Usuarios</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value={SyncType.STORES}>
                      <SyncTypeConfig
                        type={SyncType.STORES}
                        config={configs[SyncType.STORES]}
                        onSave={saveSchedulerConfig}
                        onRunNow={runManualSync}
                        isSaving={isSaving}
                        isRunning={isRunning[SyncType.STORES]}
                      />
                    </TabsContent>
                    
                    <TabsContent value={SyncType.USERS}>
                      <SyncTypeConfig
                        type={SyncType.USERS}
                        config={configs[SyncType.USERS]}
                        onSave={saveSchedulerConfig}
                        onRunNow={runManualSync}
                        isSaving={isSaving}
                        isRunning={isRunning[SyncType.USERS]}
                      />
                    </TabsContent>
                  </TabsComponent>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 