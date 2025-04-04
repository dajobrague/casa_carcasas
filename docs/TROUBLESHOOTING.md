# Solución de Problemas

Este documento proporciona soluciones a problemas comunes que pueden surgir durante el desarrollo y uso de la aplicación.

## Errores de Airtable

### Error: "Cannot parse value for field PAIS"

**Problema**: Al intentar actualizar el campo PAIS de una tienda, aparece el error "Cannot parse value for field PAIS" o "Invalid value for single select field".

**Causa**: El campo PAIS en Airtable es de tipo "Single Select", lo que significa que solo acepta uno de varios valores predefinidos. Este tipo de campo debe ser enviado como un string directo (no como un objeto) al actualizar registros.

**Solución**:
1. Asegúrate de enviar el valor del campo PAIS como un string simple, no como un objeto:
   ```javascript
   // CORRECTO
   {
     fields: {
       PAIS: "ESPAÑA"
     }
   }
   
   // INCORRECTO
   {
     fields: {
       PAIS: { name: "ESPAÑA" }
     }
   }
   ```

2. Verifica que el valor enviado sea uno de los valores permitidos en el campo "Single Select" de Airtable. Los valores actuales son:
   - ESPAÑA
   - ITALIA
   - PORTUGAL
   - FRANCIA
   - ALEMANIA
   - MEXICO
   - CHILE
   - COLOMBIA
   - POLONIA
   - REPUBLICA CHECA
   - RUMANIA
   - TURQUIA
   - GRECIA

3. Si necesitas añadir un nuevo país, primero debes agregarlo como opción en la configuración del campo en Airtable.

**Implementación de la solución**: En el endpoint `src/app/api/tienda/[recordId]/route.ts` hemos implementado un normalizador que convierte automáticamente los valores de tipo objeto a string para los campos de tipo "Single Select".

### Error: "Field N° cannot accept the provided value"

**Problema**: Al intentar crear registros de tiendas, aparece el error "Field N° cannot accept the provided value".

**Causa**: El campo "N°" en Airtable es de tipo numérico, pero se está enviando un valor de tipo string.

**Solución**:
1. Asegúrate de convertir el código de tienda a número antes de enviarlo a Airtable:
   ```javascript
   // CORRECTO
   {
     fields: {
       "N°": parseInt(codigoTienda, 10)
     }
   }
   
   // INCORRECTO
   {
     fields: {
       "N°": codigoTienda // string
     }
   }
   ```

2. Verifica que el valor pueda ser convertido a un número válido. Si contiene caracteres no numéricos, puede fallar.

**Implementación de la solución**: En la función `syncStores` de `src/lib/lcdc/airtable.ts`, hemos modificado la creación de registros para convertir el código de tienda a número usando `parseInt()`.

### Error: "Value is not a valid record ID"

**Problema**: Al intentar actualizar registros aparece el error "Value "[object Object]" is not a valid record ID" o "Value "[DNI]" is not a valid record ID".

**Causa**: Los campos de tipo relación en Airtable requieren IDs válidos de registros existentes, no objetos ni otros identificadores.

**Solución**:
1. Para campos de relación como "Area Manager" o "Tienda [Link]", asegúrate de usar IDs válidos de Airtable.
2. Necesitas mapear identificadores externos (como DNIs) a IDs de Airtable si quieres establecer relaciones.

**Implementación de la solución**: En `src/lib/lcdc/airtable.ts`, hemos implementado:
1. Un sistema para mapear DNIs a IDs de área managers.
2. Solo incluir el campo "Area Manager" cuando tenemos IDs válidos.

### Problema: No verifica correctamente si un registro ya existe

**Problema**: La sincronización no reconoce correctamente cuándo un registro ya existe en Airtable y crea duplicados en lugar de actualizar.

**Causa**: La función estaba buscando el campo `"Tienda Numero"` para hacer la coincidencia, pero el campo correcto en Airtable es `"N°"`.

**Solución**:
1. Asegúrate de que el mapeo entre códigos de tienda y IDs de registro use el campo correcto:
   ```javascript
   // CORRECTO
   query.forEach(record => {
     const tiendaNumero = record.get('N°');
     if (tiendaNumero) {
       storeIdMap.set(tiendaNumero.toString(), record.id);
     }
   });
   
   // INCORRECTO
   query.forEach(record => {
     storeIdMap.set(record.get('Tienda Numero'), record.id);
   });
   ```

2. Asegúrate de hacer comparaciones consistentes, convirtiendo los valores a string cuando sea necesario:
   ```javascript
   const existingRecordId = storeIdMap.get(codigoDepartamento.toString());
   ```

**Implementación de la solución**: En `src/lib/lcdc/airtable.ts`, hemos corregido el mapeo de códigos de tienda a IDs y mejorado la verificación para evitar la creación de duplicados.

### Campos mapeados en la sincronización de tiendas

Durante la sincronización de tiendas con Airtable, se mapean los siguientes campos:

| Campo en JSON | Campo en Airtable | Descripción |
|---------------|-------------------|-------------|
| codigo_departamento | N° | Código numérico de la tienda |
| nombre_departamento | TIENDA | Nombre completo de la tienda |
| pais_departamento | PAIS | País donde está ubicada la tienda |
| area_manager | Area Manager | Relación con el área manager (usando su ID) |
| email_departamento | Email Supervisor | Correo electrónico del supervisor de la tienda |

**Nota**: Para que el campo `area_manager` funcione correctamente, debe coincidir con un DNI o identificador registrado en la tabla de área managers.

### Vinculación de usuarios con tiendas en Airtable

**Estructura del caché de usuarios**:
El archivo de caché de usuarios (ubicado en `cache/lcdc/users/[fecha].json`) contiene un JSON con la siguiente estructura:
```json
{
  "code": 200,
  "count": 3120,
  "message": "",
  "data": [
    {
      "codigo_empleado": "54364887V",
      "nombre": "Dailyn",
      "apellidos": "Padierna Garcia",
      "dni": "54364887V",
      "email": "correo@ejemplo.com",
      "nombre_completo": "Dailyn Padierna Garcia",
      "perfil": "Area Manager",
      "horas_contrato": 0,
      "codigo_departamento": 9442,
      "nombre_departamento": "Zona 17 España"
    },
    // ... más usuarios
  ]
}
```

**Proceso de vinculación**:
1. Cuando se sincronizan los usuarios, el sistema busca en Airtable todas las tiendas existentes usando la tabla definida en `STORE_TABLE_ID`.
2. Crea un mapa (`storeIdMap`) que relaciona cada código de tienda (`N°` en Airtable) con su ID de registro.
3. Para cada usuario, se extrae su `codigo_departamento` y se busca el ID correspondiente en el mapa.
4. Si se encuentra, se establece una relación en el campo "Tienda [Link]" de la tabla de empleados.

**Problemas comunes**:
- **Tiendas no encontradas**: Si un usuario tiene un `codigo_departamento` que no existe en Airtable, no se establecerá la relación.
- **Código de tienda en formato incorrecto**: Asegúrate de que los códigos de tienda se conviertan a string al hacer comparaciones.

**Proceso de diagnóstico**:
La función `syncUsers` ahora incluye logs detallados que muestran:
- Número de tiendas encontradas en Airtable
- Número de tiendas mapeadas correctamente por código
- Códigos de tienda que no pudieron ser encontrados
- Progreso de las operaciones de sincronización

**Solución para tiendas no encontradas**:
1. Verifica en el log los códigos de tienda que no se encontraron
2. Asegúrate de que existan en Airtable con el campo `N°` correctamente establecido
3. Si necesitas crear tiendas faltantes, usa la función `syncStores` primero

### Optimización de memoria en la sincronización

**Problema**: Al sincronizar grandes cantidades de registros, la aplicación puede consumir demasiada memoria y volverse lenta o inestable.

**Causa**: Procesar miles de registros simultáneamente en memoria puede agotar los recursos del servidor, especialmente en entornos con limitaciones de memoria.

**Solución**: Hemos implementado un sistema de procesamiento por lotes (chunks) que:
1. Divide los datos en grupos de 250 registros
2. Procesa cada grupo completamente (identificación, actualización y creación) antes de pasar al siguiente
3. Mantiene un seguimiento del progreso general

**Beneficios**:
- Menor consumo de memoria
- Mejor rendimiento en conjuntos de datos grandes
- Más resistencia a errores (si un chunk falla, los anteriores ya se habrán procesado)
- Logs más detallados del progreso

**Implementación**:
- Las funciones `syncStores` y `syncUsers` en `src/lib/lcdc/airtable.ts` ahora utilizan el procesamiento por chunks
- El tamaño de chunk predeterminado es de 250 registros
- Cada chunk se procesa completamente antes de continuar con el siguiente
- Se proporcionan logs detallados que muestran el progreso por chunk y el total acumulado

## Errores con Campos Vacíos

### Error al generar horarios para tiendas sin país asignado

**Problema**: Al intentar generar horarios para tiendas que no tienen un país asignado, pueden ocurrir errores inesperados.

**Causa**: Muchas funciones de la aplicación dependen del valor del campo PAIS para determinar el formato de hora, intervalos, y otras configuraciones específicas de cada país.

**Solución**:
1. Ejecuta el script de diagnóstico para identificar tiendas sin país asignado:
   ```bash
   node src/scripts/fix-pais-field.js
   ```

2. Corrige los registros problemáticos con el script:
   ```bash
   node src/scripts/fix-pais-field.js --fix --force
   ```

3. Verifica que todos los registros tengan un país válido:
   ```bash
   node src/scripts/fix-pais-field.js
   ```

## Recursos Útiles

### Scripts de Diagnóstico

- `src/scripts/read-airtable.js`: Muestra la estructura de las tablas de Airtable
- `src/scripts/fix-pais-field.js`: Identifica y corrige problemas con el campo PAIS
- `src/scripts/test-update-tienda.js`: Prueba la actualización de una tienda específica

### Cómo Usar el Script de Corrección de PAIS

```bash
# Ver problemas sin corregir
node src/scripts/fix-pais-field.js

# Corregir sólo campos vacíos
node src/scripts/fix-pais-field.js --fix --empty

# Corregir todos los problemas y asignar valores por defecto
node src/scripts/fix-pais-field.js --fix --force
``` 