# Casa Carcasas - Sistema de Gestión

Sistema de administración y sincronización para La Casa de las Carcasas, que permite la gestión de tiendas, usuarios y horarios a través de un panel de administración y APIs personalizadas.

## Características Principales

- **Sincronización Bidireccional**: Integración con Airtable para mantener sincronizados los datos de tiendas y empleados.
- **Programador de Sincronizaciones**: Configuración de tareas automáticas con frecuencia diaria o semanal.
- **Importación CSV**: Carga masiva de datos desde archivos CSV.
- **Panel de Administración**: Gestión completa de tiendas, empleados y horarios.
- **API REST**: Endpoints para acceder a la información desde aplicaciones externas.
- **Sistema de Autenticación**: Control de acceso para administradores y supervisores.

## Tecnologías Utilizadas

- **Next.js**: Framework React para aplicaciones web del lado del servidor
- **TypeScript**: Tipado estático para JavaScript
- **Airtable**: Base de datos/CRM para almacenamiento de datos
- **Tailwind CSS**: Framework CSS para diseño de interfaz
- **NextAuth**: Autenticación y manejo de sesiones

## Estructura del Proyecto

```
/src
  /app                   # Páginas y rutas de la aplicación
    /admin               # Panel de administración
      /api-sync          # Sincronización manual con API
      /csv-import        # Importación de datos CSV
      /sync-scheduler    # Programador de sincronizaciones
    /api                 # Endpoints de API
      /admin             # APIs de administración
      /lcdc              # APIs para datos de tiendas y usuarios
  /components            # Componentes React reutilizables
  /context               # Contextos de React para estado global
  /lib                   # Bibliotecas y utilidades
    /lcdc                # Lógica de integración con API externa
      /api.ts            # Cliente para API externa
      /airtable.ts       # Lógica de sincronización con Airtable
    /auth.ts             # Configuración de autenticación
```

## Configuración

El sistema requiere las siguientes variables de entorno:

```
# Airtable
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID=
AIRTABLE_EMPLEADOS_TABLE_ID=
AIRTABLE_AREA_MANAGER_TABLE_ID=

# API Externa
TRAFICO_API_BASE_URL=
TRAFICO_API_TOKEN=

# Autenticación
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_ADMIN_SECRET=

# Base URL para sincronizaciones programadas
NEXT_PUBLIC_BASE_URL=
```

## Sincronización con Airtable

El sistema sincroniza dos tipos principales de datos:

### Tiendas

- **Campos sincronizados**: 
  - Número de tienda (N°)
  - Nombre de tienda (TIENDA)
  - País (PAIS)
  - Email del supervisor (Email Supervisor)
  - Horas aprobadas (Horas Aprobadas Value)
  - Area Manager (ID de relación con la tabla de managers)

### Usuarios

- **Campos sincronizados**:
  - Código de empleado (CodigoEmpleado)
  - Nombre (Nombre)
  - Apellidos (Apellidos)
  - Perfil (Perfil)
  - Horas semanales (Horas Semanales)
  - Relación con tienda (Tienda [Link])

## API Endpoints

### Sincronización

- `GET /api/lcdc/stores?sync=true` - Sincroniza tiendas con Airtable
- `GET /api/lcdc/users?sync=true` - Sincroniza usuarios con Airtable

### Programador de Sincronización

- `GET /api/admin/scheduler?operation=check` - Verifica tareas programadas
- `GET /api/admin/scheduler?operation=run&type=tiendas` - Ejecuta sincronización de tiendas
- `GET /api/admin/scheduler?operation=run&type=usuarios` - Ejecuta sincronización de usuarios

### Configuración del Programador

- `GET /api/admin/sync-schedule` - Obtiene configuración actual
- `POST /api/admin/sync-schedule` - Actualiza configuración

## Mejoras Recientes

- Optimización del proceso de sincronización para evitar timeouts
- Mejora en el manejo de valores numéricos para "Horas Aprobadas Value"
- Implementación de mecanismo de timeout para sincronizaciones largas
- Eliminación de almacenamiento de resultados detallados para mejorar el rendimiento

## Desarrollo

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Configurar archivo `.env.local` con las variables de entorno necesarias
4. Iniciar servidor de desarrollo: `npm run dev`

## Despliegue

El sistema está configurado para despliegue en Vercel. Para un despliegue manual:

1. Construir la aplicación: `npm run build`
2. Iniciar la aplicación: `npm start`

## Licencia

© 2023-2024 La Casa de las Carcasas. Todos los derechos reservados. 