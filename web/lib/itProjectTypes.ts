export type ItProjectPhase =
  | "estrategia"
  | "planificacion"
  | "ejecucion"
  | "cierre"
  | "archivado";

export type ItProjectRisk = "bajo" | "medio" | "alto";

export interface ItProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
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
  /** IDs de filas en el scorecard de Workflows (`/workflows/[id]`). */
  linkedWorkflowIds: string[];
  milestones: ItProjectMilestone[];
}
