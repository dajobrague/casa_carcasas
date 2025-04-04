# Autenticación de Administradores

## Descripción

El sistema de autenticación de administradores proporciona una capa de seguridad adicional para el acceso a la sección de sincronización de la API (/admin/api-sync). Esta funcionalidad restringe el acceso a usuarios autorizados mediante credenciales específicas.

## Credenciales por defecto

Las credenciales iniciales para acceder a la sección de administración son:
- **Usuario**: CDLC
- **Contraseña**: Casa2025!

Estas credenciales están codificadas directamente en el código y se recomienda cambiarlas en un entorno de producción.

## Rutas protegidas

Las siguientes rutas están protegidas por el sistema de autenticación de administradores:
- `/admin/api-sync`
- `/admin/api-sync/*` (cualquier ruta dentro de api-sync)

## Cómo funciona

El sistema de autenticación utiliza tanto sessionStorage como cookies para mantener el estado de la sesión:

1. **SessionStorage**: Almacena los datos de autenticación en el navegador mientras la sesión esté activa.
2. **Cookies**: Se utilizan para que el middleware de Next.js pueda verificar la autenticación antes de renderizar las páginas protegidas.

La autenticación expira después de 1 día o cuando el usuario cierra sesión manualmente.

## Flujo de autenticación

1. El usuario accede a `/admin/api-sync`
2. Si no está autenticado, es redirigido a `/admin/login`
3. Ingresa las credenciales correctas
4. Es redirigido automáticamente a `/admin/api-sync`
5. Puede cerrar sesión en cualquier momento usando el botón "Cerrar sesión"

## Cambiar las credenciales

Para cambiar las credenciales de administrador, modifica la función `adminLogin` en el archivo `src/context/AuthContext.tsx`. Busca el siguiente bloque de código:

```javascript
// Credenciales hardcodeadas como solicitado
if (username === 'CDLC' && password === 'Casa2025!') {
  // Código de autenticación...
}
```

Y reemplaza 'CDLC' y 'Casa2025!' con las nuevas credenciales deseadas.

## Consideraciones de seguridad

Este sistema de autenticación es básico y está diseñado para una protección simple. Para un entorno de producción, se recomienda:

1. Mover las credenciales a variables de entorno
2. Implementar un sistema de hashing de contraseñas
3. Considerar la integración con un sistema de autenticación más robusto como Auth0, NextAuth, etc.
4. Implementar limitación de intentos de inicio de sesión
5. Agregar autenticación de dos factores para mayor seguridad

## Troubleshooting

**Problema**: La redirección a la página de login no funciona.  
**Solución**: Verifica que el middleware esté configurado correctamente en `src/middleware.ts`.

**Problema**: Las credenciales no funcionan a pesar de ser correctas.  
**Solución**: Asegúrate de que no haya espacios adicionales en el nombre de usuario o contraseña. Verifica que la función `adminLogin` esté comparando las credenciales correctamente.

**Problema**: La sesión expira demasiado rápido.  
**Solución**: Ajusta el tiempo de expiración de la cookie en la función `adminLogin` modificando el parámetro `expires` de `Cookies.set`. 