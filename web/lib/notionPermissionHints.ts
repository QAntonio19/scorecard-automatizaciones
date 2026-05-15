export type NotionFeatureContext = "task_file_attachment" | "task_comments";

/**
 * Notion a veces responde con mensajes cortos en inglés (p. ej. insufficient permissions…).
 * Añade contexto práctico en español para quien configure la integración.
 */
export function embellishKnownNotionPermissionErrors(
  notionMessage: string,
  ctx: NotionFeatureContext,
): string {
  const msg = notionMessage.trim();
  if (
    !/\binsufficient\s+permissions\b/i.test(msg) &&
    !/\brestricted[_\s]resource\b/i.test(msg.toLowerCase())
  ) {
    return msg.slice(0, 2000);
  }

  const base =
    "Notion rechazó la operación por permisos: la API key es válida pero la integración no puede ejecutar ese endpoint con la página actual.";

  if (ctx === "task_file_attachment") {
    return (
      `${base} ` +
      "En https://developers.notion.com → tu integración → **Capabilities**, activa lo necesario para subir contenido y adjuntos (según opciones disponibles para tu cuenta: file uploads / insertar contenido en páginas). " +
      "En Notion Workspace, **conecta** la página o base de la tarea a la misma integración (menú ⋮ de la página o base → Connections / «Add connections»)."
    ).concat(` Mensaje técnico: «${msg.slice(0, 400)}»`);
  }

  return (
    `${base} ` +
    "Para comentarios, en Developers → tu integración → **Capacidades**, activa las dos: **«Leer comentarios»** y **«Insertar comentarios»** " +
    "(la lista del modal usa la API de lectura; sin «Leer comentarios» falla con *Insufficient permissions* aunque «Insertar» ya esté marcado). " +
    "Conecta la página de la tarea a esa integración (menú ⋮ → Conexiones) y revisa que el token del servidor (`NOTION_API_KEY`) sea de la misma integración."
  ).concat(` Mensaje técnico: «${msg.slice(0, 400)}»`);
}
