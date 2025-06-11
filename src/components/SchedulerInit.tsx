'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

// Este componente se encarga de inicializar el programador de tareas
// y configurar la verificación periódica de tareas programadas
export default function SchedulerInit() {
  const [initialized, setInitialized] = useState(false);

  // Función para verificar y ejecutar tareas programadas a través de la API
  const checkAndRunScheduledTasks = async () => {
    try {
      // Obtener la cookie de autenticación de administrador
      const adminAuth = Cookies.get('adminAuth');
      const headers: Record<string, string> = {
        'X-Internal-Scheduler': 'true'
      };

      // Verificamos si hay tareas pendientes (sin especificar tipo para verificar ambos)
      const checkResponse = await fetch('/api/admin/scheduler?operation=check', {
        headers
      });
      
      if (!checkResponse.ok) {
        console.error('Error verificando tareas programadas:', await checkResponse.text());
        return;
      }
      
      const checkData = await checkResponse.json();
      
      // Si hay al menos una tarea pendiente, ejecutamos todas las pendientes
      if (checkData.hasScheduledTask) {
        console.log('Hay tareas programadas pendientes. Ejecutando...');
        
        const runResponse = await fetch('/api/admin/scheduler?operation=run', {
          headers
        });
        
        if (!runResponse.ok) {
          console.error('Error ejecutando tareas programadas:', await runResponse.text());
          return;
        }
        
        const runData = await runResponse.json();
        console.log('Resultado de las tareas programadas:', runData);
        
        // Mostrar resultados específicos de cada tipo
        if (runData.results) {
          if (runData.results.usuarios.executed) {
            console.log('Usuarios:', runData.results.usuarios.message);
          }
          if (runData.results.tiendas.executed) {
            console.log('Tiendas:', runData.results.tiendas.message);
          }
        }
      } else {
        console.log('No hay tareas programadas pendientes');
      }
    } catch (error) {
      console.error('Error en la verificación de tareas programadas:', error);
    }
  };

  useEffect(() => {
    // Evitar inicializar más de una vez
    if (initialized) return;
    
    console.log('Inicializando programador de tareas...');
    setInitialized(true);
    
    // Ejecutar la verificación inicial
    checkAndRunScheduledTasks();
    
    // Configurar un intervalo para verificar periódicamente
    // Se ejecuta cada 5 minutos (300000 ms)
    const intervalId = setInterval(() => {
      checkAndRunScheduledTasks();
    }, 300000);
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => {
      clearInterval(intervalId);
    };
  }, [initialized]);

  // Este componente no renderiza nada visible
  return null;
} 