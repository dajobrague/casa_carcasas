# Gestor de Horarios - Casa Carcasas

Este proyecto es una migración del sistema de gestión de horarios de Casa Carcasas a una aplicación moderna con React, Next.js y Tailwind CSS.

## Características

- **Vista de Año**: Muestra todos los meses disponibles para un año seleccionado.
- **Vista de Mes**: Muestra las semanas laborales de un mes seleccionado.
- **Vista de Día**: Permite gestionar los horarios de los empleados para un día específico.
- **Generación de PDFs**: Permite generar PDFs de los horarios semanales.
- **Integración con Airtable**: Utiliza Airtable como base de datos para almacenar y recuperar información.

## Tecnologías Utilizadas

- **Frontend**:
  - React 18
  - Next.js 14
  - Tailwind CSS
  - TypeScript
  - Lucide React (iconos)

- **Backend**:
  - API Routes de Next.js
  - Airtable API

- **Generación de PDFs**:
  - jsPDF
  - html2canvas

## Estructura del Proyecto

```
casa_carcasas/
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── airtable/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Select.tsx
│   │   ├── calendar/
│   │   │   ├── YearView.tsx
│   │   │   ├── MonthView.tsx
│   │   │   └── DayModal.tsx
│   │   └── schedule/
│   │       └── ...
│   ├── lib/
│   │   ├── airtable.ts
│   │   ├── pdf.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   └── ...
│   └── context/
│       └── ScheduleContext.tsx
├── .env.local
├── package.json
└── README.md
```

## Configuración

1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/casa_carcasas.git
   cd casa_carcasas
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env.local` con las siguientes variables:
   ```
   NEXT_PUBLIC_AIRTABLE_API_KEY=tu_api_key
   NEXT_PUBLIC_AIRTABLE_BASE_ID=tu_base_id
   NEXT_PUBLIC_AIRTABLE_SEMANAS_LABORALES_TABLE_ID=tu_tabla_id
   NEXT_PUBLIC_AIRTABLE_TIENDA_SUPERVISOR_TABLE_ID=tu_tabla_id
   NEXT_PUBLIC_AIRTABLE_ACTIVIDAD_DIARIA_TABLE_ID=tu_tabla_id
   NEXT_PUBLIC_AIRTABLE_DIAS_LABORALES_TABLE_ID=tu_tabla_id
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Uso

1. **Vista de Año**: Al iniciar la aplicación, se muestra la vista de año con todos los meses disponibles.
2. **Vista de Mes**: Al hacer clic en un mes, se muestra la vista de mes con todas las semanas laborales.
3. **Vista de Día**: Al hacer clic en un día, se abre un modal con los horarios de los empleados para ese día.
4. **Edición de Horarios**: En la vista de día, puedes editar los horarios de los empleados seleccionando un estado (TRABAJO, VACACIONES, etc.) para cada hora.
5. **Generación de PDFs**: En la vista de mes, puedes generar un PDF de los horarios de una semana haciendo clic en el botón "Generar PDF".

## Contribución

1. Haz un fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Add some amazing feature'`)
4. Haz push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Contacto

David Bracho - [david@casacarcasas.com](mailto:david@casacarcasas.com)

Enlace del proyecto: [https://github.com/tu-usuario/casa_carcasas](https://github.com/tu-usuario/casa_carcasas) 