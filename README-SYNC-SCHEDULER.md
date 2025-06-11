# Programador de Sincronización Casa Carcasas

Este documento explica el funcionamiento del programador de sincronización automática entre la API de LCDC y Airtable.

## Características

- **Sincronización Automática**: Permite programar la sincronización diaria o semanal de datos.
- **Tipos de Sincronización**: Puede sincronizar tiendas o usuarios automáticamente.
- **Horario Configurable**: Permite definir la hora exacta y el día de la semana para las sincronizaciones.
- **Ejecución Manual**: Ofrece la posibilidad de ejecutar sincronizaciones inmediatas bajo demanda.

## Acceso al Programador

1. Acceda al panel de administración en `/admin`
2. Inicie sesión con sus credenciales de administrador
3. Haga clic en la tarjeta "Programador" o use el menú principal para acceder al programador

## Configuración del Programador

### Activar/Desactivar Sincronización Automática

- Use el interruptor principal para activar o desactivar completamente la sincronización automática.
- Cuando está desactivado, ninguna tarea programada se ejecutará.

### Configuración de Sincronización

1. **Tipo de datos**:
   - Tiendas: Sincroniza los datos de tiendas desde la API a Airtable
   - Usuarios: Sincroniza los datos de usuarios desde la API a Airtable

2. **Frecuencia**:
   - Diariamente: La sincronización se ejecutará todos los días a la hora configurada
   - Semanalmente: La sincronización se ejecutará solo el día de la semana seleccionado

3. **Día de la semana** (solo para frecuencia semanal):
   - Seleccione el día específico de la semana en que se ejecutará la sincronización

4. **Hora de ejecución**:
   - Configure la hora exacta (horas:minutos) en que se ejecutará la sincronización programada
   - Se recomienda elegir horas de baja actividad (ej. 3:00 AM)

### Ejecución Manual

- El botón "Ejecutar ahora" permite realizar una sincronización inmediata sin esperar a la programación
- Útil para verificar que el proceso funciona correctamente o para sincronizaciones urgentes

## Funcionamiento Interno

El programador funciona de la siguiente manera:

1. La aplicación verifica cada 5 minutos si hay tareas programadas pendientes de ejecución
2. Si una tarea está programada para ejecutarse y aún no se ha ejecutado ese día, se inicia el proceso
3. La aplicación llama al mismo endpoint de sincronización que usa la interfaz manual
4. Los resultados se registran en el sistema y se actualiza la marca de tiempo de última ejecución

## Solución de Problemas

Si la sincronización programada no funciona:

1. Verifique que el programador esté activado (interruptor principal en posición "Activado")
2. Compruebe que la hora configurada ya ha pasado para el día actual
3. Verifique que si está en modo semanal, coincida con el día de la semana actual
4. Revise los registros del servidor para detectar posibles errores durante la ejecución
5. Intente una ejecución manual para comprobar si hay problemas con la sincronización
6. Asegúrese de que la API de LCDC está disponible y funcionando correctamente

## Recomendaciones de Uso

- **Frecuencia recomendada**: Diaria para mantener los datos actualizados regularmente
- **Hora recomendada**: Durante horas de baja actividad (2:00 AM - 5:00 AM)
- **Orden recomendado**: Sincronizar primero tiendas y luego usuarios para mantener referencias correctas

## Notas Adicionales

- Las sincronizaciones programadas no se ejecutarán si el servidor está apagado en el momento programado
- Si el servidor se inicia después de la hora programada (dentro de los siguientes 30 minutos), la tarea se ejecutará automáticamente
- La configuración del programador se guarda en un archivo JSON dentro de la carpeta `data/config` del proyecto 