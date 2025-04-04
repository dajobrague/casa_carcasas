# Documentación de la API de Airtable

## Descripción
Este documento detalla la implementación y uso de la API de Airtable en la aplicación Casa Carcasas.

## Configuración

### Variables de Entorno
```env
AIRTABLE_API_KEY=patFKh76g2DNkVk36.8f69188009d491d86e0ba54081887c274e21eb540a5f0cc5c4c8a7ed72332dde
AIRTABLE_BASE_ID=appxCzcdyajOiece8
```

### Tablas
1. **Semanas Laborales**
   - ID: `tblY4azExiLi7dbcw`
   - Descripción: Almacena las semanas laborales y sus fechas

2. **Tienda y Supervisor**
   - ID: `tblpHRqsBrADEkeUL`
   - Descripción: Almacena información de tiendas y supervisores

3. **Actividad Diaria**
   - ID: `tblbkzixVwxZ8oVqb`
   - Descripción: Registra las actividades diarias por tienda

4. **Días Laborales**
   - ID: `tblY4azExiLi7dbcw`
   - Descripción: Gestiona los días laborales y su relación con semanas

## Implementación

### Función Base de Conexión
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

## Endpoints

### GET /api/airtable

#### 1. Verificar Conexión
```typescript
// URL: /api/airtable?action=verificarConexion
// Método: GET
// Respuesta: { connected: boolean }
```

#### 2. Obtener Datos de Tienda
```typescript
// URL: /api/airtable?action=obtenerDatosTienda&storeId={storeId}
// Método: GET
// Respuesta: { fields: { ... } }
```

#### 3. Obtener Actividades Diarias
```typescript
// URL: /api/airtable?action=obtenerActividadesDiarias&storeId={storeId}&diaId={diaId}
// Método: GET
// Respuesta: { records: Array<{ fields: { ... } }> }
```

#### 4. Obtener Días Laborales de Semana
```typescript
// URL: /api/airtable?action=obtenerDiasLaboralesSemana&semanaId={semanaId}
// Método: GET
// Respuesta: { records: Array<{ fields: { ... } }> }
```

#### 5. Obtener Día Laboral por ID
```typescript
// URL: /api/airtable?action=obtenerDiaLaboralPorId&diaId={diaId}
// Método: GET
// Respuesta: { fields: { ... } }
```

#### 6. Obtener Semana por ID
```typescript
// URL: /api/airtable?action=obtenerSemanaPorId&semanaId={semanaId}
// Método: GET
// Respuesta: { fields: { ... } }
```

#### 7. Obtener Semanas Laborales
```typescript
// URL: /api/airtable?action=obtenerSemanasLaborales&mes={mes}&año={año}
// Método: GET
// Respuesta: { records: Array<{ fields: { ... } }> }
```

### POST /api/airtable

#### 1. Actualizar Actividad
```typescript
// URL: /api/airtable
// Método: POST
// Body: {
//   "action": "actualizarActividad",
//   "actividadId": "string",
//   "campos": {}
// }
// Respuesta: { fields: { ... } }
```

## Estructura de Datos

### Semanas Laborales
```typescript
interface SemanaLaboral {
  fields: {
    Name: string;
    'Fecha de Inicio': string;
    'Fecha de fin': string;
    Year: string;
  }
}
```

### Tienda y Supervisor
```typescript
interface TiendaSupervisor {
  fields: {
    Name: string;
    Supervisor: string;
    Tienda: string;
  }
}
```

### Actividad Diaria
```typescript
interface ActividadDiaria {
  fields: {
    'record_Id (from Tienda y Supervisor)': string;
    'recordId (from Fecha)': string;
    Actividades: any;
  }
}
```

### Días Laborales
```typescript
interface DiaLaboral {
  fields: {
    Name: string;
    'Semanas Laborales': string[];
    Fecha: string;
  }
}
```

## Manejo de Errores

### Tipos de Errores
1. **Error de Conexión**
   ```typescript
   {
     connected: false,
     error: string,
     details?: string
   }
   ```

2. **Error de Validación**
   ```typescript
   {
     error: string,
     status: 400
   }
   ```

3. **Error Interno**
   ```typescript
   {
     error: string,
     status: 500
   }
   ```

### Logging
- Todos los errores son registrados usando el logger
- Se incluyen detalles de la petición y respuesta
- Se mantiene un registro de errores para debugging

## Consideraciones de Rendimiento

### Caché
- No se implementa caché en el servidor
- Se recomienda implementar caché del lado del cliente

### Timeouts
- Timeout por defecto: 30 segundos
- Se recomienda ajustar según necesidades

### Rate Limiting
- Airtable tiene límites de rate
- Se recomienda monitorear el uso

## Seguridad

### Autenticación
- Se usa Bearer Token
- Las API keys no se exponen al cliente
- Las peticiones se validan en el servidor

### Validación de Datos
- Se validan todos los parámetros de entrada
- Se sanitizan los datos antes de enviar a Airtable
- Se manejan casos de error y excepciones

## Mantenimiento

### Monitoreo
- Revisar logs regularmente
- Monitorear errores y excepciones
- Verificar uso de la API

### Actualizaciones
- Mantener actualizadas las dependencias
- Revisar cambios en la API de Airtable
- Actualizar documentación según cambios 