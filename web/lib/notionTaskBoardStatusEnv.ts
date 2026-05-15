import type { ItSprintTaskBoardColumn } from "@/lib/itProjectTypes";

const DISABLE_SYNC = /^1|true|yes$/i.test(
  process.env.NOTION_DISABLE_TASK_BOARD_STATUS_SYNC?.trim() ?? "",
);

/**
 * Etiqueta de la propiedad en la página de **tarea** donde leer/escribir el estado del tablero sprint.
 *
 * - `NOTION_DISABLE_TASK_BOARD_STATUS_SYNC=1` → desactiva lectura + escritura.
 * - `NOTION_PROP_TASK_BOARD_STATUS=<nombre>` → nombre exacto (override).
 * - Si no configuraste nada → por defecto **Estatus** (convención habitual en bases en español / ITAI).
 */
export function notionTaskBoardStatusPropertyLabel(): string | undefined {
  if (DISABLE_SYNC) return undefined;
  const t = process.env.NOTION_PROP_TASK_BOARD_STATUS?.trim();
  return t !== undefined && t.length > 0 ? t : "Estatus";
}

/** Nombre de opción Notion esperado si no definiste `NOTION_TASK_BOARD_OPTION_*`. Alineado a bases con «Por empezar». */
export function notionTaskBoardStatusOptionFallback(column: ItSprintTaskBoardColumn): string {
  const envPick = {
    pendiente: process.env.NOTION_TASK_BOARD_OPTION_PENDING?.trim(),
    en_curso: process.env.NOTION_TASK_BOARD_OPTION_IN_PROGRESS?.trim(),
    hecho: process.env.NOTION_TASK_BOARD_OPTION_DONE?.trim(),
  }[column];
  if (envPick) return envPick;
  const fallback: Record<ItSprintTaskBoardColumn, string> = {
    pendiente: "Por empezar",
    en_curso: "En curso",
    hecho: "Completado",
  };
  return fallback[column];
}
