export type ItProjectPhase =
  | "backlog"
  | "sin_empezar"
  | "planificacion"
  | "ejecucion"
  | "cierre"
  | "archivado";

export type ItProjectRisk = "bajo" | "medio" | "alto";

export type ItProjectUrgency = "baja" | "media" | "alta";

export interface ItProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
}

/** Columna del Kanban sprint (UI ↔ Notión opcional vía propiedad configurada). */
export type ItSprintTaskBoardColumn = "pendiente" | "en_curso" | "hecho";

/** Trabajo planificado asociado al alcance del proyecto */
export interface ItProjectPlannedTask {
  id: string;
  title: string;
  /** Si existe, tiene prioridad sobre prefijos `[x]` / `[~]` en el título para colocar la tarjeta. */
  sprintBoardColumn?: ItSprintTaskBoardColumn;
  /** Texto libre de contexto (formulario; no sincronizado con Notion hasta ampliar la API de tareas). */
  description?: string;
  /** Página sprint en Notion enlazada desde la fila de tarea (si la base lo permite y la lectura encuentra la relación). */
  sprintId?: string;
  sprintTitle?: string;
  /** Nombre del responsable (o responsables) de la tarea. */
  assigneeName?: string;
  /** Fecha límite de la tarea. */
  targetDate?: string;
}

/** Key result vinculado al proyecto (objetivo medible / línea estratégica) */
export interface ItProjectKeyResult {
  id: string;
  title: string;
}

/** Iteración corta dentro del plan del proyecto */
export interface ItProjectSprint {
  id: string;
  /** Nombre corto del sprint */
  title: string;
  /** Período o ventana esperada (texto libre, p. ej. fechas ISO o rango breve) */
  timeframe?: string;
}

/** Resultado tangible acordado con el sponsor o negocio */
export interface ItProjectDeliverable {
  id: string;
  title: string;
  /** Fecha objetivo o compromiso entrega */
  targetDate?: string;
}

export interface ItProject {
  id: string;
  code: string;
  name: string;
  description: string;
  phase: ItProjectPhase;
  sponsor: string;
  pmName: string;
  startDate: string;
  targetEndDate: string;
  riskLevel: ItProjectRisk;
  urgencyLevel?: ItProjectUrgency;
  monthId?: string;
  yearId?: string;

  milestones: ItProjectMilestone[];
  keyResults: ItProjectKeyResult[];
  plannedTasks: ItProjectPlannedTask[];
  sprints: ItProjectSprint[];
  deliverables: ItProjectDeliverable[];
}
