import type { ItProjectPhase } from "@/lib/itProjectTypes";

/**
 * Mapea la propiedad Notion `Estatus` (tipo status) → fase del portafolio.
 * Un estatus de Notion = una fase (Backlog y Sin empezar van en columnas distintas).
 */
export function mapNotionEstatusToPhase(
  estatusName: string | undefined,
  isArchivedCheckbox: boolean,
): ItProjectPhase {
  if (isArchivedCheckbox) return "archivado";

  const v = estatusName?.trim() ?? "";
  const lower = v.toLowerCase();

  if (lower === "archivado") return "archivado";

  if (lower === "backlog") return "backlog";

  if (lower === "sin empezar") return "sin_empezar";

  if (lower === "en planificacion" || lower === "en planificación") {
    return "planificacion";
  }

  if (lower === "en proceso") {
    return "ejecucion";
  }

  if (lower === "completado") {
    return "cierre";
  }

  if (lower === "estrategia") return "sin_empezar";
  if (lower === "planificación" || lower === "planificacion") return "planificacion";
  if (lower === "ejecución" || lower === "ejecucion") return "ejecucion";
  if (lower === "cierre") return "cierre";

  if (!v) return "sin_empezar";

  return "sin_empezar";
}

/** Inverso de `mapNotionEstatusToPhase`: fase UI → opción visible de la propiedad Notion **Estatus** (tipo status). */
export function mapPhaseToNotionEstatus(phase: ItProjectPhase): string {
  switch (phase) {
    case "backlog":
      return "Backlog";
    case "sin_empezar":
      return "Sin empezar";
    case "planificacion":
      return "En planificación";
    case "ejecucion":
      return "En proceso";
    case "cierre":
      return "Completado";
    case "archivado":
      return "Archivado";
  }
}
