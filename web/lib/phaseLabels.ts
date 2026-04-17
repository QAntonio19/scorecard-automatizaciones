import type { ProjectPhase } from "@/lib/projectTypes";

const LABELS: Record<ProjectPhase, string> = {
  backlog: "Backlog",
  por_iniciar: "Por iniciar",
  en_proceso: "En proceso",
  terminados: "Terminados",
  archivado: "Archivado",
};

export function phaseLabel(phase: ProjectPhase | string): string {
  if (phase in LABELS) return LABELS[phase as ProjectPhase];
  return String(phase);
}

/** Orden del Kanban (izquierda → derecha). */
export const KANBAN_PHASE_ORDER: ProjectPhase[] = [
  "backlog",
  "por_iniciar",
  "en_proceso",
  "terminados",
  "archivado",
];
