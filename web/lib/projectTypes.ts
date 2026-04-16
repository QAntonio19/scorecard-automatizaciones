export type ProjectPhase = "sin_iniciar" | "en_progreso" | "completado";

export type ProjectHealth = "activo" | "pausado" | "en_riesgo";

export type OwnerCode = "JA" | "EV";

/** Plataforma de automatización inferida o por filtro. */
export type AutomationPlatform = "n8n" | "make" | "codigo_puro";

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  phase: ProjectPhase;
  health: ProjectHealth;
  healthLabel: string;
  ownerCode: OwnerCode;
  ownerName: string;
  category: string;
  /** Plataforma de automatización (p. ej. Make, n8n). */
  platform?: string;
  /** Solo en respuesta API GET: responsable fijado manualmente (override). */
  ownerIsManual?: boolean;
  steps: number;
  schedule: string;
  progress: number;
  technologies: string[];
  failureRate: number | null;
  riskNote: string | null;
  complexity: number;
  businessValue: number;
}

export interface ProjectsListResponse {
  items: ProjectRecord[];
  total: number;
}

export interface WorkflowPlatformCounts {
  n8n: number;
  make: number;
  codigo_puro: number;
}

export interface PortfolioSummaryResponse {
  total: number;
  activos: number;
  pausados: number;
  enRiesgo: number;
  workflowCounts: WorkflowPlatformCounts;
  categories: string[];
  workload: Array<{ ownerCode: OwnerCode; ownerName: string; count: number }>;
  matrixPoints: Array<{
    id: string;
    name: string;
    category: string;
    complexity: number;
    businessValue: number;
    health: ProjectHealth;
    healthLabel: string;
    phase: ProjectPhase;
    ownerName: string;
    platform?: string;
  }>;
  attention: Array<{
    id: string;
    name: string;
    ownerName: string;
    health: ProjectHealth;
    healthLabel: string;
    failureRate: number | null;
  }>;
}

export type VistaProyectos = "kanban" | "tabla" | "tarjetas";
