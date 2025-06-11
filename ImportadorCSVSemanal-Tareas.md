# Plan de Desarrollo: Importador CSV Semanal

## Resumen del Proyecto
Crear un nuevo importador CSV para datos semanales que permita:
- Seleccionar una semana específica
- Importar datos de tiendas (Horas, Crecimiento y Atención Deseada) para esa semana
- Crear registros en la tabla `tblYNlCMYPXDMlPZk` de Airtable

## Estructura de Tabla Destino
| Campo | Tipo | Descripción |
|-------|------|-------------|
| Tienda y Supervisor | Relación | Vincula con la tabla de tiendas |
| Semanas Laborales | Relación | Vincula con la tabla de semanas |
| Horas Aprobadas | Número | Valor numérico entero |
| Crecimiento | Número | Valor decimal (porcentaje) |
| Atencion Deseada | Número | Valor numérico entero |

## Tareas de Desarrollo

### 1. Configuración Inicial ✅
- [x] Crear directorio `src/app/admin/semanas-csv-import/`
- [x] Crear archivo `page.tsx` para la página principal
- [x] Crear directorio API `src/app/api/admin/import-datos-semanales/`
- [x] Crear archivo `route.ts` para el endpoint de importación

### 2. Componentes Frontend ✅
#### 2.1. Componente de Selección de Semana ✅
- [x] Crear `src/components/admin/SemanaSelector.tsx`
- [x] Implementar carga de semanas desde API
- [x] Añadir filtros por año/mes para facilitar búsqueda
- [x] Diseñar UI con selector y mensaje instructivo

#### 2.2. Adaptación del Importador CSV ✅
- [x] Crear componente basado en CSVImportForm existente
- [x] Actualizar instrucciones para reflejar importación semanal
- [x] Adaptar validaciones para los campos específicos semanales

#### 2.3. Adaptación de Tabla de Mapeo ✅
- [x] Modificar `CSVMappingTable` para campos semanales
- [x] Implementar mapeo automático para campos comunes
- [x] Añadir validación específica para datos de tipo numérico

#### 2.4. Vista Previa y Confirmación ✅
- [x] Implementar vista previa de datos procesados
- [x] Mostrar indicadores de estado (crear/actualizar)
- [x] Añadir funcionalidad de validación antes de importar

#### 2.5. Componente de Progreso y Resultados ✅
- [x] Reutilizar `ImportProgress` para mostrar estado en tiempo real
- [x] Implementar vista de resumen final con estadísticas
- [x] Añadir opciones para descargar reporte de resultados

### 3. Implementación de API ⬜️
#### 3.1. Setup y Validación ⬜️
- [ ] Crear esquema de validación para la solicitud
- [ ] Implementar verificación de semana y tiendas
- [ ] Añadir validación de formato para datos numéricos

#### 3.2. Procesamiento de Registros ⬜️
- [ ] Implementar búsqueda de tiendas por ID/número
- [ ] Detectar registros existentes (misma tienda-semana)
- [ ] Preparar operaciones batch para crear/actualizar

#### 3.3. Integración con Airtable ⬜️
- [ ] Adaptar conexión a Airtable para la tabla semanal
- [ ] Implementar operaciones CRUD respetando límites de API
- [ ] Añadir manejo de errores y reintentos

#### 3.4. Tracking y Reportes ⬜️
- [ ] Implementar Server-Sent Events para progreso en tiempo real
- [ ] Crear sistema de logging para operaciones
- [ ] Generar reportes detallados post-importación

### 4. Pruebas y Refinamiento ⬜️
- [ ] Probar con diferentes formatos de CSV
- [ ] Verificar manejo de errores y casos límite
- [ ] Optimizar rendimiento para grandes lotes de datos
- [ ] Validar resultados en Airtable

### 5. Documentación ⬜️
- [ ] Documentar proceso de uso paso a paso
- [ ] Crear ejemplos de CSV válidos
- [ ] Añadir sección de solución de problemas comunes
- [ ] Documentar API para referencia de desarrolladores

## Notas Importantes
- No reiniciar servidores durante el desarrollo (compilación en tiempo real)
- Evitar modificar código existente que pueda afectar otras funcionalidades
- Utilizar siempre la biblioteca Airtable para conexiones con la API
- Implementar límites en lotes (máximo 10 registros por operación) para respetar restricciones de Airtable 