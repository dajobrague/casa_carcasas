import { useEffect, useState } from 'react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type ImportStatus = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: string[];
  isCompleted: boolean;
};

interface ImportProgressProps {
  sessionId: string;
  onComplete: (results: ImportStatus) => void;
}

export default function ImportProgress({ sessionId, onComplete }: ImportProgressProps) {
  const [status, setStatus] = useState<ImportStatus>({
    created: 0,
    updated: 0,
    skipped: 0,
    total: 0,
    errors: [],
    isCompleted: false
  });
  
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Verificar periódicamente si la importación ha finalizado
  useEffect(() => {
    if (!sessionId) return;
    
    let isMounted = true;
    let checkInterval: NodeJS.Timeout;
    let checkCount = 0;
    const maxChecks = 60; // 5 minutos máximo (60 * 5s)
    
    const checkStatus = async () => {
      try {
        checkCount++;
        console.log(`Verificando estado (intento ${checkCount}/${maxChecks})...`);
        
        const response = await fetch(`/api/admin/import-status/check?sessionId=${sessionId}&t=${Date.now()}`);
        if (!response.ok) {
          console.error(`Error en respuesta: ${response.status}`);
          throw new Error('Error al verificar el estado de la importación');
        }
        
        const data = await response.json();
        console.log('Estado recibido:', data);
        
        if (!isMounted) return;
        
        // Siempre actualizar el estado mostrado
        setStatus(data);
        
        // Actualizar el estado solo si la importación ha finalizado o hay datos significativos
        if (data.isCompleted || data.created > 0 || data.updated > 0 || data.skipped > 0) {
          setLoading(false);
          
          // Notificar al componente padre si está completado
          if (data.isCompleted) {
            console.log('Importación completada, notificando al componente padre');
            onComplete(data);
            
            // Limpiar el intervalo
            clearInterval(checkInterval);
          }
        }
        
        // Si llevamos muchos intentos sin completar, detener las verificaciones
        if (checkCount >= maxChecks) {
          console.warn('Se alcanzó el número máximo de verificaciones');
          clearInterval(checkInterval);
          
          if (!data.isCompleted) {
            setFailed(true);
          }
        }
      } catch (error) {
        console.error('Error al verificar el estado:', error);
        if (!isMounted) return;
        
        // Si hay muchos errores consecutivos, marcar como fallido
        if (checkCount >= 12) { // Después de 1 minuto de errores (12 * 5s)
          setFailed(true);
          clearInterval(checkInterval);
        }
      }
    };
    
    // Verificar inmediatamente
    checkStatus();
    
    // Establecer un intervalo para verificar cada 5 segundos
    checkInterval = setInterval(checkStatus, 5000);
    
    return () => {
      isMounted = false;
      clearInterval(checkInterval);
    };
  }, [sessionId, onComplete]);

  // Mostrar estado de carga
  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              {loading ? "Importando datos..." : 
               failed ? "Error de conexión" : 
               "Importación completada"}
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-primary" />}
            </CardTitle>
          </div>
          <CardDescription>
            {loading 
              ? "Por favor espere mientras procesamos la importación. Esto puede tomar unos minutos..." 
              : failed
                ? "No se ha podido verificar el estado de la importación, pero el proceso continúa en el servidor."
                : "La importación se ha completado correctamente."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <>
                <Progress value={undefined} className="h-2 w-full animate-pulse" />
                <div className="py-8 text-center text-muted-foreground">
                  <p>La importación está en proceso.</p>
                  <p className="text-sm mt-2">Puede continuar trabajando en otras pestañas mientras se completa.</p>
                </div>
              </>
            ) : failed ? (
              <>
                <Progress value={undefined} className="h-2 w-full" />
                <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                  <AlertTitle>Problema de conexión</AlertTitle>
                  <AlertDescription>
                    No hemos podido verificar el estado de la importación, pero el proceso continúa en el servidor.
                    Puede volver más tarde a la sección de importación para comprobar el resultado.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <>
                <Progress value={100} className="h-2 w-full" />
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-muted-foreground text-sm">Creados</p>
                    <p className="text-2xl font-semibold">{status.created}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Actualizados</p>
                    <p className="text-2xl font-semibold">{status.updated}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Sin cambios</p>
                    <p className="text-2xl font-semibold">{status.skipped}</p>
                  </div>
                </div>
                
                {status.errors.length > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Errores durante la importación</AlertTitle>
                    <AlertDescription>
                      <div className="max-h-32 overflow-y-auto text-sm">
                        <ul className="list-disc pl-5">
                          {status.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-sm text-blue-800">
        <p className="font-medium mb-2">Información importante:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>La importación continuará procesándose en el servidor incluso si cierra esta página.</li>
          <li>Cuando finalice, será dirigido automáticamente a la pantalla de resultados.</li>
          <li>Si cierra esta página, puede volver a importaciones posteriormente para ver los resultados.</li>
        </ul>
      </div>
    </div>
  );
}