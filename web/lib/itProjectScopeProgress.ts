import type { ItProject, ItProjectPlannedTask, ItSprintTaskBoardColumn } from "@/lib/itProjectTypes";

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

/** Quita prefijos de estado conocidos al inicio del título (repite hasta estabilizar). */
export function stripLeadingSprintTaskStatusPrefix(raw: string): string {
  const patterns: RegExp[] = [
    /^\[\s*[xX]\s*\]\s*/,
    /^[✅✔☑]\s*/,
    /^✓(?:\s|$)/u,
    /^\[[Hh]echo\]\s*/i,
    /^\[[Dd]one\]\s*/i,
    /^(completad[oa]|hecho)\s*[:\-.–]\s*/iu,
    /^[Dd](?:one\s*[:\-.–]|DONE\s*[:\-.–])/iu,
    /^\[\s*[~\\/]\s*\]\s*/,
    /^\[\s*\]\s*/,
    /^(wip|en curso)\s*[:\-.–]\s*/iu,
    /^[🔄⏳🔶🔷]\s*/u,
  ];

  let t = raw.trim();
  let prev = "";
  while (prev !== t) {
    prev = t;
    for (const re of patterns) {
      t = t.replace(re, "");
    }
    t = t.trim();
  }
  return t;
}

/** Columnas del tablero sprint: lectura/escritura en Notión usa la propiedad de tarea configurada (por defecto `Estatus`; desactivar con `NOTION_DISABLE_TASK_BOARD_STATUS_SYNC=1`). */
export type SprintTaskKanbanColumn = ItSprintTaskBoardColumn;

export const SPRINT_TASK_KANBAN_COLUMN_ORDER: readonly SprintTaskKanbanColumn[] = [
  "pendiente",
  "en_curso",
  "hecho",
];

/** Texto guardado sin prefijos de tablero; la columna se define aparte (`sprintBoardColumn` / Notión). */
export function plannedTaskCanonicalTitle(raw: string): string {
  return stripLeadingSprintTaskStatusPrefix(raw).trim().slice(0, 2000);
}

/**
 * Prefijos en desuso: el tablero no muta `[x]` / `[~]`. Equivalente a `plannedTaskCanonicalTitle`.
 * @deprecated
 */
export function applySprintTaskTitleForKanbanColumn(title: string, _column: SprintTaskKanbanColumn): string {
  return plannedTaskCanonicalTitle(title);
}

/** Preferir `plannedTaskCanonicalTitle` + campo de columna cuando exista migración desde heurísticas en título. */
export function applySprintTaskTitleDoneState(title: string, _done: boolean): string {
  return plannedTaskCanonicalTitle(title);
}

/** Columna mostrada por tarea (campo persistido tiene prioridad; si no, heurísticas en el texto). */
export function resolvedSprintTaskKanbanColumn(
  task: Pick<ItProjectPlannedTask, "title" | "sprintBoardColumn">,
): SprintTaskKanbanColumn {
  const tagged = task.sprintBoardColumn;
  if (tagged === "pendiente" || tagged === "en_curso" || tagged === "hecho") return tagged;
  return inferSprintTaskKanbanColumn(task.title);
}

export function sprintTaskKanbanColumnLabel(col: SprintTaskKanbanColumn): string {
  const map: Record<SprintTaskKanbanColumn, string> = {
    pendiente: "Por empezar",
    en_curso: "En curso",
    hecho: "Completado",
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
 * Clasifica una tarea en columna Kanban usando heurísticas del título si no viene `sprintBoardColumn`;
 * tras guardar con la nueva lógica, los títulos en Notión suelen estar sin `[x]` / `[~]` y cuenta el campo persistido.
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
  const krCompleted = p.keyResults.filter((x) => inferScopeItemCompletedFromTitle(x.title)).length;
  
  // Las tareas pueden estar completadas si su columna Kanban es "hecho" o si su título lo indica
  const tasksCompletedList = p.plannedTasks.filter(
    (x) => resolvedSprintTaskKanbanColumn(x) === "hecho" || inferScopeItemCompletedFromTitle(x.title)
  );
  const tasksCompleted = tasksCompletedList.length;

  const sprintsCompleted = p.sprints.filter((x) => {
    if (inferScopeItemCompletedFromTitle(x.title)) return true;
    // Si no tiene prefijo, verificamos si TODAS sus tareas están completadas
    const sprintTasks = p.plannedTasks.filter(t => t.sprintId === x.id);
    return sprintTasks.length > 0 && sprintTasks.every(t => 
      resolvedSprintTaskKanbanColumn(t) === "hecho" || inferScopeItemCompletedFromTitle(t.title)
    );
  }).length;

  const total = p.keyResults.length + p.plannedTasks.length + p.sprints.length;
  const completed = krCompleted + sprintsCompleted + tasksCompleted;

  if (total === 0) return { completed: 0, total: 0, percent: 0 };
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
