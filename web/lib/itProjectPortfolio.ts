/**
 * Proyectos de portafolio IT (iniciativas / programas).
 * Distintos del scorecard de flujos: aquí viven hitos, sponsor, PM y vínculos opcionales a `/workflows/[id]`.
 */

import { IT_PROJECTS_SEED } from "@/data/it-projects.seed";
import type { ItProject, ItProjectPhase, ItProjectRisk, ItProjectUrgency } from "@/lib/itProjectTypes";

export type {
  ItProject,
  ItProjectDeliverable,
  ItProjectKeyResult,
  ItProjectMilestone,
  ItProjectPhase,
  ItProjectPlannedTask,
  ItProjectRisk,
  ItProjectSprint,
  ItProjectUrgency,
} from "@/lib/itProjectTypes";

export function listItProjects(): ItProject[] {
  return IT_PROJECTS_SEED;
}

export function getItProjectById(id: string): ItProject | undefined {
  return IT_PROJECTS_SEED.find((p) => p.id === id);
}

/** Etiquetas = nombres de opción en Notion (`Estatus`). */
export function phaseLabel(phase: ItProjectPhase): string {
  const map: Record<ItProjectPhase, string> = {
    backlog: "Backlog",
    sin_empezar: "Sin empezar",
    planificacion: "En planificación",
    ejecucion: "En proceso",
    cierre: "Completado",
    archivado: "Archivado",
  };
  return map[phase];
}

/** Orden de columnas en el Kanban de proyectos IT (izquierda → derecha). */
export const IT_PROJECT_PHASE_ORDER: ItProjectPhase[] = [
  "backlog",
  "sin_empezar",
  "planificacion",
  "ejecucion",
  "cierre",
  "archivado",
];

export function riskLabel(risk: ItProjectRisk): string {
  const map: Record<ItProjectRisk, string> = {
    bajo: "Bajo",
    medio: "Medio",
    alto: "Alto",
  };
  return map[risk];
}

export function urgencyLabel(urgency: ItProjectUrgency | undefined): string {
  if (!urgency) return "Media";
  const map: Record<ItProjectUrgency, string> = {
    baja: "Baja",
    media: "Media",
    alta: "Alta",
  };
  return map[urgency];
}

export function urgencyBadgeClass(urgency: ItProjectUrgency | undefined): string {
  if (urgency === "alta") return "bg-rose-100 text-rose-800 ring-rose-200";
  if (urgency === "baja") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  return "bg-amber-100 text-amber-800 ring-amber-200";
}

/** Misma lógica visual que `workflowPhaseTopBorderClass` en flujos (acento por fase). */
export function itPhaseTopBorderClass(phase: ItProjectPhase): string {
  const map: Record<ItProjectPhase, string> = {
    backlog: "border-t-slate-500",
    sin_empezar: "border-t-slate-400",
    planificacion: "border-t-amber-400",
    ejecucion: "border-t-sky-500",
    cierre: "border-t-emerald-500",
    archivado: "border-t-slate-600",
  };
  return map[phase];
}

export function filterItProjects(
  projects: ItProject[],
  opts: { q?: string; phase?: ItProjectPhase | "" },
): ItProject[] {
  let out = projects;
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }
  if (opts.phase) {
    out = out.filter((p) => p.phase === opts.phase);
  }
  return out;
}
