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
    "Para comentarios, en Developers activa capacidades para **read** + **insert** comments sobre la página. " +
    "Comparte o conecta la página-tarea al workspace donde vive esa integración."
  ).concat(` Mensaje técnico: «${msg.slice(0, 400)}»`);
}
