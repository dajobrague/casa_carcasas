# Esquema de Base de Datos - Airtable

## Descripción General
Este documento detalla la estructura de las tablas y sus relaciones en la base de datos de Airtable para la aplicación Casa Carcasas.

## Tablas

### 1. Semanas Laborales
**ID**: `tblY4azExiLi7dbcw`

#### Campos
| Nombre | Tipo | Descripción |
|--------|------|-------------|
| Name | Text | Nombre de la semana laboral |
| Fecha de Inicio | Date | Fecha de inicio de la semana |
| Fecha de fin | Date | Fecha de fin de la semana |
| Year | Text | Año de la semana laboral |

#### Relaciones
- Tiene muchos Días Laborales (one-to-many)

### 2. Tienda y Supervisor
**ID**: `tblpHRqsBrADEkeUL`

#### Campos
| Nombre | Tipo | Descripción |
|--------|------|-------------|
| Name | Text | Nombre de la tienda |
| Supervisor | Text | Nombre del supervisor |
| Tienda | Text | Identificador de la tienda |

#### Relaciones
- Tiene muchas Actividades Diarias (one-to-many)

### 3. Actividad Diaria
**ID**: `tblbkzixVwxZ8oVqb`

#### Campos
| Nombre | Tipo | Descripción |
|--------|------|-------------|
| record_Id (from Tienda y Supervisor) | Link | Referencia a la tienda |
| recordId (from Fecha) | Link | Referencia al día laboral |
| Actividades | Text | Detalles de las actividades |

#### Relaciones
- Pertenece a una Tienda (many-to-one)
- Pertenece a un Día Laboral (many-to-one)

### 4. Días Laborales
**ID**: `tblY4azExiLi7dbcw`

#### Campos
| Nombre | Tipo | Descripción |
|--------|------|-------------|
| Name | Text | Nombre del día |
| Semanas Laborales | Link | Referencia a las semanas laborales |
| Fecha | Date | Fecha del día laboral |

#### Relaciones
- Pertenece a muchas Semanas Laborales (many-to-many)
- Tiene muchas Actividades Diarias (one-to-many)

## Relaciones entre Tablas

### Jerarquía de Datos
```
Semanas Laborales
    └── Días Laborales
        └── Actividades Diarias
            └── Tienda y Supervisor
```

### Flujo de Datos
1. Se crea una Semana Laboral
2. Se asocian Días Laborales a la Semana
3. Se vinculan Actividades Diarias a los Días
4. Las Actividades se asocian con Tiendas

## Reglas de Negocio

### Semanas Laborales
- Cada semana debe tener una fecha de inicio y fin
- Las fechas no pueden solaparse entre semanas
- El año debe ser válido

### Días Laborales
- Cada día debe pertenecer a al menos una semana
- Las fechas deben estar dentro del rango de la semana
- No pueden existir días duplicados

### Actividades Diarias
- Cada actividad debe estar asociada a una tienda
- Cada actividad debe estar asociada a un día
- No pueden existir actividades sin tienda o día

### Tiendas
- Cada tienda debe tener un supervisor asignado
- Los identificadores de tienda deben ser únicos

## Validaciones

### Campos Obligatorios
- Name en todas las tablas
- Fechas en Semanas y Días Laborales
- Referencias en Actividades Diarias

### Tipos de Datos
- Fechas: Formato ISO 8601
- Textos: Máximo 255 caracteres
- Links: Referencias válidas a registros existentes

## Índices y Búsqueda

### Campos Indexados
- Fecha en Días Laborales
- Year en Semanas Laborales
- Tienda en Actividades Diarias

### Fórmulas de Filtrado
```javascript
// Filtrar semanas por año
{Year} = "2025"

// Filtrar días por semana
{Semanas Laborales} = "rec123"

// Filtrar actividades por tienda y día
AND(
  {record_Id (from Tienda y Supervisor)} = "rec456",
  {recordId (from Fecha)} = "rec789"
)
```

## Mantenimiento

### Limpieza de Datos
- Eliminar semanas antiguas
- Actualizar referencias rotas
- Validar integridad de datos

### Backups
- Realizar backups semanales
- Mantener historial de cambios
- Documentar modificaciones

## Consideraciones de Rendimiento

### Optimización
- Usar filtros eficientes
- Limitar número de registros por consulta
- Implementar paginación

### Límites
- Máximo 100,000 registros por tabla
- Máximo 50,000 registros por vista
- Máximo 100 campos por tabla

## Seguridad

### Permisos
- Lectura: Todos los usuarios autenticados
- Escritura: Solo administradores
- Eliminación: Solo administradores

### Auditoría
- Registrar cambios en datos sensibles
- Mantener historial de modificaciones
- Monitorear acceso a datos 