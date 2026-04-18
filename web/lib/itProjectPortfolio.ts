/**
 * Proyectos de portafolio IT (iniciativas / programas).
 * Distintos del scorecard de flujos: aquí viven hitos, sponsor, PM y vínculos opcionales a `/workflows/[id]`.
 */

import { IT_PROJECTS_SEED } from "@/data/it-projects.seed";
import type { ItProject, ItProjectPhase, ItProjectRisk } from "@/lib/itProjectTypes";

export type { ItProject, ItProjectMilestone, ItProjectPhase, ItProjectRisk } from "@/lib/itProjectTypes";

export function listItProjects(): ItProject[] {
  return IT_PROJECTS_SEED;
}

export function getItProjectById(id: string): ItProject | undefined {
  return IT_PROJECTS_SEED.find((p) => p.id === id);
}

export function phaseLabel(phase: ItProjectPhase): string {
  const map: Record<ItProjectPhase, string> = {
    estrategia: "Estrategia",
    planificacion: "Planificación",
    ejecucion: "Ejecución",
    cierre: "Cierre",
    archivado: "Archivado",
  };
  return map[phase];
}

export function riskLabel(risk: ItProjectRisk): string {
  const map: Record<ItProjectRisk, string> = {
    bajo: "Bajo",
    medio: "Medio",
    alto: "Alto",
  };
  return map[risk];
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
