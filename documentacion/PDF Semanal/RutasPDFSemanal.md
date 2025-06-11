# Documentación de Rutas para Generación de PDF Semanal

Este documento proporciona una guía detallada de las rutas, componentes y archivos involucrados en la generación del PDF semanal de horarios en la aplicación.

## Componentes Principales

### 1. Generador de PDF

**Archivo Principal:** `/src/lib/pdf-generator.ts`
- **Función Principal:** `generarPDFSimple()`
- **Descripción:** Punto de entrada para la generación de PDFs. Coordina la obtención de datos de tienda, actividades y la creación del documento PDF.
- **Parámetros importantes:**
  - `idTienda`: ID de la tienda
  - `semanaId`: ID de la semana
  - `semanaIsoString`: Fecha de la semana en formato ISO
  - `nombreSemana`: Nombre descriptivo de la semana
  - `mostrarModal`: Indica si debe mostrarse el modal de vista previa

### 2. Modal de Vista Previa

**Archivo:** `/src/lib/pdf-components.ts`
- **Función Principal:** `mostrarModalPreviewPDF()`
- **Descripción:** Crea y muestra un modal con vista previa del PDF generado y opciones para descargarlo.
- **Implementación:** Crea un iframe dentro de un modal personalizado que muestra el PDF y tiene botones para impresión y descarga.

### 3. Componentes del PDF

#### Estructura del PDF
- **Archivo:** `/src/components/pdf/sections/WeeklySummary.tsx` 
  - Muestra el resumen semanal con estadísticas globales
- **Archivo:** `/src/components/pdf/sections/DaySection.tsx`
  - Muestra información detallada para cada día
- **Archivo:** `/src/components/pdf/tables/SummaryTable.tsx`
  - Tabla comparativa con datos por día
- **Archivo:** `/src/components/pdf/PDFDownloadButton.tsx`
  - Botón para descargar el PDF

#### Tabla de Horarios
- **Archivo:** `/src/components/semana/EmployeeTable.tsx`
  - Muestra la tabla con los horarios de los empleados
  - Contiene la lógica para mostrar los intervalos de tiempo y evitar los espacios en blanco

## Rutas API

### 1. Datos de Tráfico Semanal

**Ruta:** `/api/trafico-semana`
- **Método:** GET
- **Parámetros de consulta:** 
  - `storeId`: ID de la tienda
  - `semanaId`: ID de la semana
- **Descripción:** Obtiene los datos de tráfico para una semana específica
- **Archivo de implementación:** `/src/pages/api/trafico-semana.ts`

### 2. Datos de Tienda

**Ruta:** `/api/tienda/:id`
- **Método:** GET
- **Descripción:** Obtiene información detallada de una tienda, incluyendo horarios de apertura
- **Archivo de implementación:** `/src/pages/api/tienda/[id].ts`

### 3. Actividades

**Ruta:** `/api/actividades`
- **Método:** POST
- **Cuerpo de la petición:** 
  - `tiendaId`: ID de la tienda
  - `semanaId`: ID de la semana
- **Descripción:** Obtiene las actividades para la semana especificada
- **Archivo de implementación:** `/src/pages/api/actividades.ts`

### 4. Verificación de Slots de Tiempo

**Ruta:** `/api/check-pdf-slots`
- **Método:** GET
- **Parámetros:** 
  - `storeId`: ID de la tienda
  - `semanaId`: ID de la semana
- **Descripción:** Verifica y devuelve los slots de tiempo basados en el horario de la tienda
- **Archivo de implementación:** `/src/pages/api/check-pdf-slots.ts`

## Procesamiento de Datos

### 1. Procesador de Tráfico

**Archivo:** `/src/lib/pdf-traffic-processor.ts`
- **Funciones Principales:**
  - `procesarTraficoParaDia()`: Procesa datos de tráfico para un día específico
  - `procesarTraficoParaTodosLosDias()`: Procesa datos de tráfico para todos los días de la semana
- **Descripción:** Obtiene y procesa los datos de tráfico, generando datos simulados si no hay datos reales disponibles.

### 2. Generación de Estadísticas

**Archivo:** `/src/lib/trafico/estadisticas.ts`
- **Funciones Principales:**
  - `generarResumenSemanal()`: Genera estadísticas resumidas para la semana
  - `formatearResumenParaConsola()`: Genera una versión formateada para mostrar en consola
- **Descripción:** Procesa y organiza las estadísticas de tráfico y recomendaciones.

### 3. Utilidades para PDF

**Archivo:** `/src/lib/utils.ts`
- **Función Principal:** `generarColumnasTiempo()`
- **Descripción:** Genera las columnas de tiempo basadas en el país y horarios de la tienda.
- **Formato de horario:** Soporta dos formatos:
  - **Formato Antiguo:** Horas simples de apertura y cierre (ej. "10:00" y "21:00")
  - **Nuevo Formato:** Múltiples intervalos: "10:00-14:00,15:00-21:00"

## Flujo de Generación del PDF

1. **Solicitud inicial:** Desde un componente de la interfaz de usuario (como `EditorContent.tsx` o `MonthView.tsx`)
2. **Obtención de datos:**
   - Datos de la tienda (incluyendo horarios)
   - Actividades para la semana
   - Datos de tráfico para cada día
3. **Procesamiento de datos:**
   - Generación de recomendaciones basadas en tráfico
   - Creación de estadísticas semanales
4. **Generación del PDF:**
   - Creación del documento PDF con jsPDF
   - Adición de secciones (encabezado, resumen semanal, días)
   - Generación de tablas de horarios
5. **Visualización y descarga:**
   - Mostrar vista previa en modal
   - Opciones para descargar o imprimir

## Notas sobre Horarios

- **Formato de horarios de tienda:**
  - **Formato Antiguo:** Apertura y cierre como horas individuales (ej: "10:00" y "21:00")
  - **Nuevo Formato:** Intervalos separados por comas (ej: "10:00-14:00,15:00-21:00")
- **Intervalos de tiempo:**
  - Francia: Intervalos de 15 minutos (4 slots por hora)
  - Otros países: Intervalos de 30 minutos (2 slots por hora)

## Consideraciones para Futuras Ediciones

1. **Actualización de Formatos:**
   - El componente `EmployeeTable.tsx` ha sido optimizado para eliminar espacios vacíos en los intervalos de cierre
   - Las modificaciones a la visualización de horarios deben mantener coherencia entre la tabla y las estadísticas

2. **Manejo de Intervalos de Apertura:**
   - La función `generarColumnasTiempo()` en `/src/lib/utils.ts` es crítica para la generación correcta de slots
   - Cualquier modificación debe considerar el comportamiento específico según el país (Francia vs. otros)

3. **Vista Previa del PDF:**
   - El modal de vista previa en `/src/lib/pdf-components.ts` ha sido mejorado con un panel lateral informativo
   - Se recomienda mantener la estructura de dos columnas para mejor UX 