# Patch Notes v1.19.0 — "Responsables UX · Detalle y alta de proyecto más claros"

## Resumen de la versión
Ajusta métricas del portafolio activo, añade gestión local de responsables con su propia ruta, refuerza la eliminación de proyectos y mejora el formulario de alta (KRs/tareas/sprints y fechas de sprint reales), además de ordenar el layout del detalle.

---

## Portafolio (`/proyectos`)
- **En cartera**: el número refleja solo proyectos fuera de Backlog y Archivado; la tarjeta «En ejecución» usa la misma base para ser coherente.

## Responsables
- **Ruta nueva** `/proyectos/responsables`: añadir/quitar nombres persistidos en el navegador; lista conectada al multiselect de «Nuevo proyecto».
- **Sidebar**: enlace dedicado; estado activo sin solapar «Proyectos» en subrutas.
- **Compatibilidad SSR**: carga de opciones sin ruptura de hidratación.
- **UI**: contenido acotado (`max-w-xl`); retirado el botón de restaurar valores por defecto en esa pantalla.

## Detalle de proyecto
- **Descripción** en sección aparte bajo el hero.
- **Zona de riesgo** al pie; **modal** de borrado que exige escribir el nombre del proyecto tal cual.

## Nuevo proyecto
- **KR, tareas y sprints** con entradas tipo lista (Añadir / Quitar) en lugar de sólo textarea.
- **Sprints**: rango de período con dos selectores de fecha (ISO), validación inicio/fin y mensajes de error claros.

---

*Registrado el 11 de mayo de 2026.*

---

# Patch Notes v1.18.0 — "Notion alineado · Portafolio Kanban unificado"

## Resumen de la versión
Profundiza la integración con el esquema real de Notion (tipos de propiedad `status` y `multi_select`), estabiliza las rutas `/api` frente al middleware de sesión y reordena el portafolio de proyectos: un solo tablero Kanban configurable por URL, chips de fase más claros y responsables múltiples al crear filas.

---

## Integración Notion y API
- **Tipos de propiedad al crear proyecto**: riesgo y urgencia se envían como `status`; Responsable como `multi_select` con una o varias opciones (coincidente con ITAI: Proyectos).
- **POST `/api/notion/projects`**: acepta `pmNames` (array); se mantiene compatibilidad con `pmName` suelto.
- **Icono de página**: al crear, se envía icono por defecto (configurable con `NOTION_CREATE_PROJECT_ICON_*` y URL externa opcional).
- **Estado sin claves**: GET de listado y GET por id pasan a **503** con `NOTION_NOT_CONFIGURED` cuando faltan variables, alineado con el POST.
- **Middleware**: las rutas **`/api/*`** quedan fuera del matcher de Supabase para evitar fallos intermedios (p. ej. 500) antes de los route handlers de Notion.

## Formulario «Nuevo proyecto»
- **Responsable**: componente de selección múltiple (`FormStyledMultiSelect`); validación con al menos uno si hay opciones.
- **Copy**: eliminado el bloque explicativo largo bajo «Datos del proyecto».

## Vista Proyectos (`/proyectos`)
- **Solo Kanban**: eliminado el conmutador Kanban/Tabla; retirado el parámetro `vista` de la query y el componente `ItProjectsToolbar`.
- **Modo «Todas»**: el tablero y el dataset muestran únicamente las fases centrales (**Sin empezar → Completado**); **Backlog** y **Archivado** se excluyen salvo `bk=1` y `ar=1` en la URL.
- **Chips de fase**: flujo principal agrupado; **Backlog** y **Archivo** en el bloque «**Colas**» (estilo diferenciado); tooltips para filtro vs columna extra.
- **CSS Grid**: `repeat(auto-fit, …)` en columnas del Kanban para no dejar huecos fantasma.
- **Tabla de proyectos**: componente `ItProjectsTable` conservado en código pero ya no enlazado desde esta página.

## Panel (`/panel`)
- Retirados los bloques de listas **Backlog** y **Archivado** (su lugar operativo es la vista Proyectos).

## Notas técnicas
- Rutas antiguas con `?vista=tabla` se ignoran; la UI siempre muestra el tablero por columnas.

---
*Registrado el 8 de mayo de 2026.*

---

# Patch Notes v1.17.0 - "Sincronización Total y Refinamiento Visual"

## 🚀 Resumen de la Versión
Esta actualización se centra en la integración profunda con Notion, corrigiendo la "fuga de datos" y mejorando la precisión de la matriz de riesgo. También se ha refinado la interfaz de las tarjetas y el detalle del proyecto para una experiencia más profesional y minimalista.

---

## 🛠️ Cambios en la Integración (Backend)
- **Sincronización en Tiempo Real**: Se ha deshabilitado el caché agresivo del servidor (`revalidate = 0`) para asegurar que cualquier cambio en la base de datos de Notion se refleje al instante en la web.
- **Mapeo de Estados Corregido**: Se solucionó el error donde proyectos en estado "Completado" se marcaban como "Archivados". Ahora se muestran correctamente en la fase de **Cierre**.
- **Extracción de Datos Robusta**: El sistema ahora es capaz de extraer niveles de riesgo y urgencia desde cualquier tipo de columna en Notion (Selección, Estado, Fórmulas o Rollups).
- **Consistencia de Nombres**: Se añadieron reglas de detección para variaciones en los nombres de columnas (ej. "Nivel de riesgo" vs "Nivel de Riesgo").

## 🎨 Mejoras en la Interfaz (Frontend)
- **Matriz de Riesgo Unificada**:
  - Todos los puntos de la matriz ahora son de color **azul** por preferencia estética, manteniendo su posición lógica por riesgo/urgencia.
  - Se corrigió la visibilidad de los proyectos en la matriz que estaban siendo filtrados erróneamente.
- **Rediseño de Tarjetas (Cards)**:
  - Se eliminaron las etiquetas de texto de riesgo/urgencia para reducir el ruido visual.
  - Introducción de **Iconos de Urgencia**: Flechas dinámicas (Doble Chevron) codificadas por color (Rojo/Ámbar/Azul) en la esquina superior derecha.
- **Vista de Detalle Refinada**:
  - Nuevo botón **"Abrir en Notion"** con acceso directo al proyecto original.
  - Reubicación del badge de Estatus junto al código del proyecto.
  - Renombramiento de secciones: "Gobierno" → **"Generalidades"**, "Project Manager" → **"Responsable"**.
  - Formateo de fechas simplificado a "Mes Año" (ej. "Octubre 2025") en español.

## ⚠️ Notas Técnicas
- Se recomienda realizar una limpieza de memoria local (`localStorage.clear()`) para eliminar cualquier rastro de los datos de prueba antiguos y ver la sincronización de Notion al 100%.

---
*Generado automáticamente el 07 de Mayo de 2026.*
