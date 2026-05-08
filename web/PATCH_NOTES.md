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
