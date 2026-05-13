import type { ItProject, ItProjectPlannedTask } from "@/lib/itProjectTypes";

/**
 * Heurística sobre el título del ítem: la vista Notion sólo enlaza página + título;
 * así marcamos “completado” si empieza con convenciones habituales (checkbox en texto).
 */
export function inferScopeItemCompletedFromTitle(title: string): boolean {
  const t = title.trim();
  if (!t) return false;
  if (/^\[\s*[xX]\s*\]/.test(t)) return true;
  if (/^[✅✔☑]/.test(t)) return true;
  if (/^✓(?:\s|$)/u.test(t)) return true;
  if (/^\[[Hh]echo\]/.test(t)) return true;
  if (/^\[[Dd]one\]/.test(t)) return true;
  if (/^(completad[oa]|hecho)\s*[:\-.–]/iu.test(t)) return true;
  if (/^[Dd](?:one\s*[:\-.–]|DONE\s*[:\-.–])/iu.test(t)) return true;
  return false;
}

/** Columnas del tablero por sprint (misma filosofía que el avance de alcance: convenciones en el título). */
export type SprintTaskKanbanColumn = "pendiente" | "en_curso" | "hecho";

export const SPRINT_TASK_KANBAN_COLUMN_ORDER: readonly SprintTaskKanbanColumn[] = [
  "pendiente",
  "en_curso",
  "hecho",
];

export function sprintTaskKanbanColumnLabel(col: SprintTaskKanbanColumn): string {
  const map: Record<SprintTaskKanbanColumn, string> = {
    pendiente: "Pendiente",
    en_curso: "En curso",
    hecho: "Hecho",
  };
  return map[col];
}

/** Clase `border-t-4` por columna (alineado visualmente al Kanban de proyectos). */
export function sprintTaskKanbanColumnTopBorderClass(col: SprintTaskKanbanColumn): string {
  const map: Record<SprintTaskKanbanColumn, string> = {
    pendiente: "border-t-slate-400",
    en_curso: "border-t-amber-400",
    hecho: "border-t-emerald-500",
  };
  return map[col];
}

/**
 * Clasifica una tarea en columna Kanban usando el título (Notion sólo nos da título en esta app).
 */
export function inferSprintTaskKanbanColumn(title: string): SprintTaskKanbanColumn {
  if (inferScopeItemCompletedFromTitle(title)) return "hecho";
  const t = title.trim();
  if (/^\[\s*[~\\/]\s*\]/.test(t)) return "en_curso";
  if (/^(wip|en curso)\s*[:\-.–]/iu.test(t)) return "en_curso";
  if (/^[🔄⏳🔶🔷]/u.test(t)) return "en_curso";
  return "pendiente";
}

export function plannedTasksAssignedToSprint(
  plannedTasks: readonly ItProjectPlannedTask[],
  sprintPageId: string,
): ItProjectPlannedTask[] {
  const sid = sprintPageId.trim();
  if (!sid) return [];
  return plannedTasks.filter((task) => (task.sprintId?.trim() ?? "") === sid);
}

export type ScopeProgress = {
  completed: number;
  total: number;
  /** Entero 0–100 cuando hay ítems; 0 cuando no hay nada que contar */
  percent: number;
};

export function computeProjectScopeProgress(
  p: Pick<ItProject, "keyResults" | "plannedTasks" | "sprints">,
): ScopeProgress {
  const titles = [
    ...p.keyResults.map((x) => x.title),
    ...p.plannedTasks.map((x) => x.title),
    ...p.sprints.map((x) => x.title),
  ];
  const total = titles.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = titles.filter(inferScopeItemCompletedFromTitle).length;
  const percent = Math.round((completed / total) * 100);
  return { completed, total, percent };
}

/** Clase Tailwind del relleno de la barra según rangos pedidos por producto */
export function projectScopeProgressFillClass(percent: number): string {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 70) return "bg-sky-600";
  if (percent >= 40) return "bg-amber-400";
  return "bg-slate-400";
}
