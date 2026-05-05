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

  milestones: ItProjectMilestone[];
}
