import type { ProjectPhase, ProjectRecord } from "./projectTypes.js";

/** Valores canónicos almacenados en API y JSON. */
export const PROJECT_PHASE_VALUES = [
  "backlog",
  "por_iniciar",
  "en_proceso",
  "terminados",
  "archivado",
] as const;

const LEGACY_MAP: Record<string, ProjectPhase> = {
  sin_iniciar: "por_iniciar",
  en_progreso: "en_proceso",
  completado: "terminados",
};

/**
 * Convierte fases antiguas o desconocidas al modelo actual (p. ej. al leer JSON o sync).
 */
function isCanonicalPhase(key: string): key is ProjectPhase {
  return (PROJECT_PHASE_VALUES as readonly string[]).includes(key);
}

export function normalizePhaseValue(raw: unknown): ProjectPhase {
  if (typeof raw !== "string" || !raw.trim()) return "por_iniciar";
  const key = raw.trim();
  if (isCanonicalPhase(key)) return key;
  return LEGACY_MAP[key] ?? "por_iniciar";
}

export function normalizeProjectRecordPhase(p: ProjectRecord): ProjectRecord {
  return { ...p, phase: normalizePhaseValue(p.phase) };
}
