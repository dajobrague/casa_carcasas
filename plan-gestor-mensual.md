# Plan de Implementación - Gestor de Plantilla Mensual

## 1. Estructura de archivos

- [x] `/src/app/gestor-mensual/page.tsx` - Componente principal
- [x] `/src/app/gestor-mensual/layout.tsx` - Layout con la navegación
- [x] `/src/app/gestor-mensual/metadata.ts` - Metadatos de la página
- [x] `/src/components/gestor-mensual` - Carpeta para componentes específicos

## 2. Componentes principales

### Estructura de la página
- [x] Componente principal `GestorMensual`
- [x] Loader inicial con detección de `recordId`
- [x] Manejo de estados de carga, error y contenido

### Componentes de nivel superior
- [x] `MensualHeader` - Título, selector de mes y contadores
- [x] `EmpleadosSection` - Sección de empleados actuales
- [x] `VacantesSection` - Sección de vacantes disponibles

### Tarjetas y elementos visuales
- [x] `EmpleadoCard` - Tarjeta para mostrar cada empleado (implementado dentro de EmpleadosSection)
- [x] `VacanteCard` - Tarjeta para mostrar cada vacante (implementado dentro de EmpleadosSection)
- [x] `GrupoHeader` - Encabezado para cada grupo de tarjetas
- [ ] `CardMenuDropdown` - Menú desplegable para acciones en tarjetas

### Modales
- [ ] `GenerarFechasModal` - Modal para generar fechas/actividades para empleados
- [ ] `AgregarVacanteModal` - Modal para crear nuevas vacantes
- [ ] `AsignarEmpleadoModal` - Modal para asignar empleados a vacantes
- [ ] `EliminarVacanteModal` - Modal para eliminar vacantes

## 3. Funcionalidades por implementar

### Inicialización de la página
- [x] Verificación de `recordId` en la URL
- [x] Pantalla de carga inicial
- [x] Obtención de datos de la tienda por ID
- [x] Inicialización del estado global

### Selector de mes
- [x] Obtener lista de meses disponibles desde Airtable
- [x] Componente de selección con dropdown
- [x] Lógica para ordenar meses cronológicamente
- [x] Actualización de datos al cambiar de mes

### Gestión de empleados
- [x] Obtener empleados de la tienda seleccionada
- [x] Agrupar empleados por tipo de jornada
- [x] Mostrar tarjetas de empleados por grupo
- [x] Implementar colapso/expansión de grupos
- [ ] Botón y funcionalidad para generar fechas

### Gestión de vacantes
- [x] Obtener vacantes de la tienda seleccionada
- [x] Agrupar vacantes por tipo de jornada
- [ ] Botón y lógica para agregar nuevas vacantes
- [ ] Funcionalidad para eliminar vacantes existentes
- [ ] Proceso para asignar empleados a vacantes

### Generación de fechas
- [ ] Obtener semanas laborales del mes seleccionado
- [ ] Modal para seleccionar múltiples semanas
- [ ] Verificar semanas ya generadas para el empleado
- [ ] Generar actividades semanales en Airtable
- [ ] Actualizar UI después de generar fechas

### Contadores y estadísticas
- [x] Contador de empleados activos
- [x] Contador de vacantes disponibles
- [x] Actualización en tiempo real de contadores

## 4. Integraciones con Airtable

### Endpoints y funciones
- [x] `obtenerDatosTienda` - Obtener información de la tienda
- [x] `obtenerEmpleados` - Obtener empleados de la tienda
- [x] `obtenerVacantes` - Obtener vacantes de la tienda
- [x] `obtenerMesesDisponibles` - Obtener lista de meses con datos
- [x] `obtenerSemanasLaborales` - Obtener semanas para un mes específico
- [x] `verificarActividadesGeneradas` - Verificar actividades ya generadas
- [x] `generarActividades` - Crear actividades para un empleado y semanas
- [x] `agregarVacante` - Crear una nueva vacante
- [x] `eliminarVacante` - Eliminar una vacante existente
- [x] `asignarEmpleado` - Asignar empleado a una vacante

### Tablas requeridas
- `tiendaSupervisorTable` - Datos de tiendas
- `empleadosTable` - Empleados y vacantes
- `semanasLaboralesTable` - Semanas laborales
- `actividadSemanalTable` - Actividades generadas para empleados

## 5. Estado global de la aplicación

- [x] Implementado el contexto `MensualContext` con React Context
- [x] Definidos los tipos e interfaces necesarios
- [x] Implementado el proveedor de contexto
- [x] Implementado el hook personalizado `useMensual`

## 6. Estilos y diseño

- [x] Implementar estilos base consistentes con la aplicación
- [x] Adaptar variables CSS del diseño original (usando Tailwind)
- [x] Crear componentes estilizados con Tailwind CSS
- [x] Implementar diseño responsivo para móviles y tablets
- [ ] Animaciones y transiciones para interacciones

## 7. Pruebas y validación

- [ ] Probar carga inicial y validación de `recordId`
- [ ] Verificar flujo de selección de mes y carga de datos
- [ ] Probar proceso de agregar, eliminar y asignar vacantes
- [ ] Probar generación de fechas para empleados
- [ ] Validar manejo de errores y estados de carga

## 8. Integración con navegación existente

- [x] Integrar con el componente `StoreNavigation` existente
- [x] Asegurar navegación correcta entre páginas
- [x] Mantener parámetro `recordId` entre navegaciones

## 9. Implementación de "Generar Fechas"

Esta sección detalla la implementación de la funcionalidad "Generar Fechas" basada en el análisis del código original en view.html.

### 9.1 Componentes principales para Generar Fechas

1. **Componente modal `GenerarFechasModal`**
   - [ ] Estructura base con header, body y footer
   - [ ] Mostrar información del empleado seleccionado (nombre, código)
   - [ ] Lista de semanas disponibles para el mes seleccionado
   - [ ] Checkboxes para selección múltiple de semanas
   - [ ] Indicador visual de semanas ya generadas
   - [ ] Botones de acción (Generar, Cancelar)
   - [ ] Manejo de estado local para selecciones

2. **Componente `ProgressIndicator`**
   - [ ] Overlay para mostrar progreso durante operaciones largas
   - [ ] Spinner o barra de progreso
   - [ ] Mensaje informativo sobre la operación en curso
   - [ ] Lógica para mostrar/ocultar según estado de generación

### 9.2 Funciones API necesarias

1. **Función `obtenerSemanasLaborales`**
   - [ ] Endpoint para obtener semanas del mes seleccionado
   - [ ] Filtrado por mes (nombre y año)
   - [ ] Ordenar semanas por fecha de inicio
   - [ ] Incluir información relevante (número de semana, fechas)

2. **Función `verificarActividadesGeneradas`**
   - [ ] Endpoint para comprobar actividades existentes del empleado
   - [ ] Filtrado por empleado y tipo de actividad
   - [ ] Devolver listado de IDs de semanas ya generadas

3. **Función `generarActividades`**
   - [ ] Endpoint POST para crear actividades en Airtable
   - [ ] Soporte para múltiples semanas en una sola solicitud
   - [ ] Manejo de errores y respuestas parciales
   - [ ] Logging detallado del proceso

### 9.3 Lógica de negocio

1. **Manejo de eventos botón "Calendario"**
   - [ ] Capturar información del empleado al hacer clic
   - [ ] Abrir modal con datos del empleado
   - [ ] Cargar semanas disponibles para el mes actual
   - [ ] Verificar semanas ya generadas

2. **Selección de semanas**
   - [ ] Implementar selección/deselección de semanas
   - [ ] Validar semanas seleccionables (no permitir ya generadas)
   - [ ] Mostrar conteo de semanas seleccionadas
   - [ ] Manejar seleccionar/deseleccionar todas

3. **Proceso de generación**
   - [ ] Validar selección antes de iniciar generación
   - [ ] Mostrar indicador de progreso durante generación
   - [ ] Secuenciar creación de actividades para evitar sobrecarga
   - [ ] Manejo de errores durante la generación
   - [ ] Notificación de éxito/error al completar

4. **Actualización de la UI**
   - [ ] Actualizar estado visual de semanas generadas
   - [ ] Mostrar indicador de éxito en la tarjeta del empleado
   - [ ] Animación o transición para confirmar acción exitosa

### 9.4 Flujo de usuario para Generar Fechas

1. Usuario hace clic en botón "Calendario" en tarjeta de empleado
2. Se abre modal mostrando empleado seleccionado y semanas disponibles
3. Semanas ya generadas aparecen deshabilitadas o marcadas
4. Usuario selecciona semanas deseadas mediante checkboxes
5. Al hacer clic en "Generar", se muestra indicador de progreso
6. Se crean registros de actividad en Airtable para cada semana
7. Al completar, se muestra mensaje de éxito y se cierra modal
8. La UI se actualiza para reflejar las nuevas actividades generadas

## Secuencia de implementación

1. [x] Crear estructura base de archivos y componentes ✓
2. [x] Implementar inicialización y verificación de `recordId` ✓
3. [x] Crear componente de selección de mes ✓
4. [x] Implementar secciones de empleados y vacantes (esqueleto) ✓
5. [x] Desarrollar tarjetas para empleados y vacantes ✓
6. [ ] Implementar componente modal GenerarFechasModal
7. [ ] Desarrollar funciones API para semanas y actividades
8. [ ] Implementar lógica de generación de fechas
9. [ ] Integrar botones de "Calendario" con el modal
10. [ ] Implementar modal para agregar vacantes
11. [ ] Desarrollar modal para asignar empleados a vacantes
12. [ ] Implementar modal para eliminar vacantes
13. [ ] Finalizar estilos, animaciones y detalles de UI
14. [ ] Pruebas completas y correcciones finales 