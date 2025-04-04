# Tareas para Integración de API RRHH

## Objetivo
Implementar una integración entre la API de LCDC (La Casa de las Carcasas) y Airtable para sincronizar datos de usuarios, tiendas y accesos de tiendas bajo demanda, evitando la pérdida de datos durante el procesamiento.

## Consideraciones Importantes
- **CRÍTICO**: La primera lectura de datos debe almacenarse en archivos JSON para evitar perder información.
- Los endpoints se implementarán en una página separada de las existentes.
- La implementación debe permitir la ejecución bajo demanda de cualquiera de las funciones.

## Endpoints de la API
- Host: `https://apiintranet.lacasadelascarcasas.es/`
- Rutas:
  - `/api/v1/rrhh/get_users` - Obtener usuarios
  - `/api/v1/rrhh/get_stores` - Obtener tiendas
  - `/api/v1/rrhh/get_stores_access` - Obtener accesos de tiendas
- Parámetros para accesos:
  - `store_code`: (int) - Código de la tienda (Ej: 1)
  - `date`: (string) Y-m-d - Fecha de consulta (Ej: 2024-09-28)

## Tareas Específicas

### 1. Configuración Base
- [ ] Crear archivo de configuración para almacenar credenciales API seguras
- [ ] Implementar sistema de gestión de tokens para la API
- [ ] Definir constantes para las rutas de la API y tablas de Airtable

### 2. Implementación de Endpoints Internos
- [ ] Crear ruta `/api/lcdc/users` para conectar con `/api/v1/rrhh/get_users`
- [ ] Crear ruta `/api/lcdc/stores` para conectar con `/api/v1/rrhh/get_stores`
- [ ] Crear ruta `/api/lcdc/stores-access` para conectar con `/api/v1/rrhh/get_stores_access`

### 3. Sistema de Caché y Respaldo
- [ ] Implementar mecanismo de almacenamiento de respuestas en archivos JSON
- [ ] Crear estructura de directorios para datos de respaldo
- [ ] Implementar sistema de fechas en nombres de archivos para respaldo histórico
- [ ] Desarrollar lógica para verificar si es primera lectura y guardar respuesta

### 4. Integración con Airtable
- [ ] Adaptar la lógica del script existente para tiendas
  - [ ] Mapear campos API → Airtable
  - [ ] Implementar verificación de opciones de países
  - [ ] Manejar actualizaciones y creaciones en lotes
- [ ] Adaptar la lógica del script existente para usuarios
  - [ ] Mapear campos API → Airtable
  - [ ] Manejar relaciones entre tiendas y empleados
  - [ ] Implementar actualizaciones y creaciones en lotes
- [ ] Desarrollar lógica para sincronización de accesos a tiendas

### 5. Interfaz de Usuario
- [ ] Crear página `/admin/api-sync` para la sincronización manual
- [ ] Implementar componentes UI para seleccionar:
  - [ ] Tipo de sincronización (Usuarios, Tiendas, Accesos)
  - [ ] Parámetros adicionales según el tipo
  - [ ] Opción para utilizar cache o forzar actualización
- [ ] Desarrollar componente de visualización de resultados/estado
- [ ] Implementar feedback visual durante la sincronización

### 6. Gestión de Errores
- [ ] Implementar sistema de logging detallado
- [ ] Desarrollar mecanismos de reintentos para fallos de conexión
- [ ] Crear mensajes de error descriptivos para la interfaz
- [ ] Implementar sistema de notificaciones para errores críticos

### 7. Seguridad
- [ ] Almacenar token de API en variables de entorno seguras
- [ ] Implementar autenticación para acceder a la página de sincronización
- [ ] Verificar permisos antes de permitir la sincronización
- [ ] Auditar y registrar quién realiza cada sincronización

### 8. Documentación
- [ ] Documentar proceso de integración completo
- [ ] Crear guía de uso para la página de sincronización
- [ ] Documentar estructura de los archivos de caché
- [ ] Explicar proceso de resolución de problemas

## Estructura de Archivos Sugerida

```
src/
├── app/
│   ├── admin/
│   │   └── api-sync/
│   │       └── page.tsx          # Página para sincronización manual
│   └── api/
│       └── lcdc/
│           ├── users/
│           │   └── route.ts      # Endpoint para usuarios
│           ├── stores/
│           │   └── route.ts      # Endpoint para tiendas
│           └── stores-access/
│               └── route.ts      # Endpoint para accesos
├── components/
│   └── admin/
│       └── ApiSyncPanel.tsx      # Componente de interfaz de sincronización
├── lib/
│   └── lcdc/
│       ├── api.ts                # Cliente de API
│       ├── cache.ts              # Sistema de caché
│       └── airtable.ts           # Integración con Airtable
└── types/
    └── lcdc.ts                   # Definiciones de tipos
```

## Flujo de Trabajo de Integración
1. Usuario accede a la página de sincronización
2. Selecciona el tipo de datos a sincronizar
3. El sistema verifica si hay datos en caché
4. Se realiza solicitud a la API de LCDC
5. Se almacena respuesta en archivo JSON de respaldo
6. Se procesa la respuesta y mapea a estructura de Airtable
7. Se realizan operaciones en lotes (actualizaciones/creaciones)
8. Se muestra resultado al usuario

## Consideraciones Técnicas
- Usar React Query para gestión de estado y caché
- Implementar sistema de throttling para evitar sobrecarga de API
- Considerar uso de worker threads para procesamiento asíncrono
- Estrategia de manejo de errores con reintentos exponenciales 