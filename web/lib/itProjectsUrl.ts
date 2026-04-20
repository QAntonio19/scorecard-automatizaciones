import type { ItProjectPhase } from "@/lib/itProjectTypes";

export type VistaProyectosIt = "kanban" | "tabla";

export function parseVistaProyectosIt(raw: string | undefined): VistaProyectosIt {
  if (raw === "tabla") return "tabla";
  return "kanban";
}

export function buildItProjectsQuery(opts: {
  q?: string;
  fase?: ItProjectPhase;
  vista?: VistaProyectosIt;
}): string {
  const p = new URLSearchParams();
  if (opts.q?.trim()) p.set("q", opts.q.trim());
  if (opts.fase) p.set("fase", opts.fase);
  if (opts.vista === "tabla") p.set("vista", "tabla");
  const s = p.toString();
  return s ? `?${s}` : "";
}
