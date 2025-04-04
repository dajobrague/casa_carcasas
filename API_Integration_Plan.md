# Plan de Implementación - Integración API RRHH y Airtable

## Contexto Técnico
La aplicación actual utiliza Next.js y está estructurada siguiendo el patrón de App Router con directorios en `src/app/` para las rutas, y API endpoints en `src/app/api/`. La integración propuesta debe seguir esta estructura existente.

## Fases de Implementación

### Fase 1: Preparación de Infraestructura

1. **Crear directorios necesarios**:
   ```
   src/app/admin/
   src/app/admin/api-sync/
   src/app/api/lcdc/
   src/app/api/lcdc/users/
   src/app/api/lcdc/stores/
   src/app/api/lcdc/stores-access/
   src/lib/lcdc/
   ```

2. **Configurar variables de entorno**:
   - Añadir en `.env.local`:
     ```
     LCDC_API_HOST=https://apiintranet.lacasadelascarcasas.es
     LCDC_API_TOKEN=token_seguro_aqui
     LCDC_CACHE_DIRECTORY=./cache/lcdc
     ```

### Fase 2: Implementación del Sistema de Caché

1. **Crear archivo `/src/lib/lcdc/cache.ts`**:
   - Implementar funciones para:
     - Verificar existencia de caché
     - Guardar respuesta a caché
     - Leer datos de caché
     - Generar nombres de archivo con timestamp

2. **Implementar estructura de directorios de caché**:
   ```
   cache/
   ├── lcdc/
   │   ├── users/
   │   │   └── YYYY-MM-DD-HH-MM-SS.json
   │   ├── stores/
   │   │   └── YYYY-MM-DD-HH-MM-SS.json
   │   └── stores-access/
   │       └── store_XX-YYYY-MM-DD-HH-MM-SS.json
   ```

### Fase 3: Cliente API para LCDC

1. **Crear archivo `/src/lib/lcdc/api.ts`**:
   - Implementar cliente para los endpoints:
     - `getUsers()`
     - `getStores()`
     - `getStoresAccess(storeCode, date)`
   - Incorporar sistema de reintentos
   - Integrar con sistema de caché

### Fase 4: Integración con Airtable

1. **Crear archivo `/src/lib/lcdc/airtable.ts`**:
   - Adaptar lógica de scripts existentes:
     - `syncUsers(userData)`
     - `syncStores(storeData)`
     - `syncStoresAccess(accessData)`
   - Implementar operaciones en lotes
   - Manejar validaciones de campo

### Fase 5: Implementación de Endpoints API

1. **Crear `/src/app/api/lcdc/users/route.ts`**:
   ```typescript
   import { NextResponse } from 'next/server';
   import { getUsers } from '@/lib/lcdc/api';
   import { syncUsers } from '@/lib/lcdc/airtable';
   
   export async function GET() {
     try {
       const data = await getUsers();
       await syncUsers(data);
       return NextResponse.json({ success: true, data });
     } catch (error) {
       return NextResponse.json({ success: false, error: error.message }, { status: 500 });
     }
   }
   ```

2. **Implementar archivos similares para stores y stores-access**

### Fase 6: Interfaz de Usuario para Sincronización

1. **Crear `/src/app/admin/api-sync/page.tsx`**:
   - Implementar página con autenticación
   - Crear interfaz para seleccionar tipo de sincronización
   - Mostrar resultados y estado

2. **Crear componentes necesarios**:
   - Panel de selección
   - Indicador de progreso
   - Visor de resultados
   - Mensajes de error/éxito

## Consideraciones de Seguridad

1. **Protección de endpoints y página admin**:
   - Verificar autenticación en todas las rutas
   - Limitar acceso a roles específicos

2. **Almacenamiento seguro de credenciales**:
   - Usar variables de entorno
   - No exponer token en código cliente

## Plan de Pruebas

1. **Pruebas unitarias**:
   - Cliente API
   - Sistema de caché
   - Funciones de sincronización

2. **Pruebas de integración**:
   - Flujo completo de sincronización
   - Manejo de errores
   - Validación de datos

## Documentación Final

1. **Guía de usuario para página de sincronización**
2. **Documentación técnica de la implementación**
3. **Protocolo de solución de problemas**

## Próximos pasos inmediatos

1. Crear la estructura de directorios
2. Implementar sistema de caché
3. Desarrollar cliente API básico
4. Implementar endpoints API internos
5. Desarrollar página de administración básica 