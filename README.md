# Casa Carcasas - Aplicación de Gestión de Horarios

## Descripción General
Esta aplicación web permite gestionar horarios y actividades diarias para tiendas, utilizando Airtable como base de datos. La aplicación está construida con Next.js 14 y utiliza TypeScript para el desarrollo.

## Tecnologías Principales
- Next.js 14
- TypeScript
- Tailwind CSS
- Airtable API
- React Context API
- React Query

## Estructura del Proyecto
```
src/
├── app/                    # Rutas y páginas de Next.js
│   ├── api/               # API Routes
│   ├── editor/            # Página de edición
│   └── view/              # Página de visualización
├── components/            # Componentes React reutilizables
├── lib/                   # Utilidades y configuraciones
└── types/                 # Definiciones de tipos TypeScript
```

## Configuración del Entorno

### Variables de Entorno
Crear un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here
AIRTABLE_SEMANAS_LABORALES_TABLE_ID=your_semanas_laborales_table_id
AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID=your_tienda_supervisor_table_id
AIRTABLE_ACTIVIDAD_DIARIA_TABLE_ID=your_actividad_diaria_table_id
AIRTABLE_DIAS_LABORALES_TABLE_ID=your_dias_laborales_table_id

# Traffic API Configuration
TRAFICO_API_TOKEN=your_trafico_api_token_here
TRAFICO_API_BASE_URL=https://api.airtable.com/v0/your_base_id/your_table_id

# Application URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Conexión con Airtable

### Implementación
La conexión con Airtable se realiza a través de la API REST utilizando `curl` para manejar las peticiones HTTP. Esta implementación fue elegida para resolver problemas de latencia y conexión en ciertas ubicaciones geográficas.

### Estructura de la Conexión
1. **Configuración Base**
   - API Key: Token de autenticación
   - Base ID: Identificador de la base de datos
   - Table IDs: Identificadores de las tablas específicas

2. **Método de Conexión**
   ```typescript
   async function curlRequest(url: string, method: string = 'GET', data?: any) {
     const headers = [
       `-H "Authorization: Bearer ${apiKey}"`,
       '-H "Content-Type: application/json"'
     ];
     
     let command = `curl -s ${headers.join(' ')}`;
     
     if (method === 'PATCH' && data) {
       command += ` -X PATCH -d '${JSON.stringify(data)}'`;
     }
     
     command += ` "${url}"`;
     
     const { stdout, stderr } = await execAsync(command);
     
     if (stderr) {
       throw new Error(stderr);
     }
     
     return JSON.parse(stdout);
   }
   ```

## API Routes

### 1. `/api/airtable`
Maneja todas las operaciones relacionadas con Airtable.

#### Endpoints GET
1. **verificarConexion**
   - Verifica la conexión con Airtable
   - URL: `/api/airtable?action=verificarConexion`

2. **obtenerDatosTienda**
   - Obtiene datos de una tienda específica
   - URL: `/api/airtable?action=obtenerDatosTienda&storeId={storeId}`

3. **obtenerActividadesDiarias**
   - Obtiene actividades para una tienda y día específicos
   - URL: `/api/airtable?action=obtenerActividadesDiarias&storeId={storeId}&diaId={diaId}`

4. **obtenerDiasLaboralesSemana**
   - Obtiene días laborales para una semana específica
   - URL: `/api/airtable?action=obtenerDiasLaboralesSemana&semanaId={semanaId}`

5. **obtenerDiaLaboralPorId**
   - Obtiene un día laboral específico
   - URL: `/api/airtable?action=obtenerDiaLaboralPorId&diaId={diaId}`

6. **obtenerSemanaPorId**
   - Obtiene una semana específica
   - URL: `/api/airtable?action=obtenerSemanaPorId&semanaId={semanaId}`

7. **obtenerSemanasLaborales**
   - Obtiene semanas laborales para un mes y año específicos
   - URL: `/api/airtable?action=obtenerSemanasLaborales&mes={mes}&año={año}`

#### Endpoints POST
1. **actualizarActividad**
   - Actualiza una actividad específica
   - URL: `/api/airtable`
   - Body: 
     ```json
     {
       "action": "actualizarActividad",
       "actividadId": "string",
       "campos": {}
     }
     ```

## Estructura de Datos en Airtable

### Tablas Principales
1. **Semanas Laborales**
   - Campos principales:
     - Name
     - Fecha de Inicio
     - Fecha de fin
     - Year

2. **Tienda y Supervisor**
   - Campos principales:
     - Name
     - Supervisor
     - Tienda

3. **Actividad Diaria**
   - Campos principales:
     - record_Id (from Tienda y Supervisor)
     - recordId (from Fecha)
     - Actividades

4. **Días Laborales**
   - Campos principales:
     - Name
     - Semanas Laborales
     - Fecha

## Manejo de Errores
La aplicación implementa un sistema robusto de manejo de errores:
1. Logging detallado de errores
2. Respuestas HTTP apropiadas
3. Mensajes de error descriptivos
4. Manejo de timeouts y reintentos

## Instalación y Ejecución

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno
4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Construir para producción:
   ```bash
   npm run build
   ```

## Consideraciones de Seguridad
1. Las variables de entorno no están expuestas al cliente
2. Las API keys se manejan de forma segura
3. Las peticiones a Airtable incluyen autenticación
4. Los datos sensibles no se almacenan en el cliente

## Mantenimiento y Actualizaciones
1. Verificar regularmente las dependencias
2. Monitorear el uso de la API de Airtable
3. Mantener actualizadas las variables de entorno
4. Revisar los logs de error periódicamente

## Solución de Problemas
1. Verificar la conexión con Airtable
2. Comprobar las variables de entorno
3. Revisar los logs de error
4. Verificar la disponibilidad de la API de Airtable 