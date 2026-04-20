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

/** Clase `border-t-*` alineada con las columnas del Kanban (borde superior de acento). */
export function workflowPhaseTopBorderClass(phase: ProjectPhase): string {
  const map: Record<ProjectPhase, string> = {
    backlog: "border-t-slate-400",
    por_iniciar: "border-t-amber-400",
    en_proceso: "border-t-sky-500",
    terminados: "border-t-emerald-500",
    archivado: "border-t-slate-500",
  };
  return map[phase];
}
