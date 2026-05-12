import type { ItProjectPhase } from "@/lib/itProjectTypes";

export function buildItProjectsQuery(opts: {
  q?: string;
  fase?: ItProjectPhase;
  /** Con filtro «Todas», incluir columna+dataset de backlog (query `bk=1`). */
  kanbanExtraBacklog?: boolean;
  /** Igual para archivado (`ar=1`). */
  kanbanExtraArchivado?: boolean;
}): string {
  const p = new URLSearchParams();
  if (opts.q?.trim()) p.set("q", opts.q.trim());
  if (opts.fase) p.set("fase", opts.fase);
  if (opts.kanbanExtraBacklog) p.set("bk", "1");
  if (opts.kanbanExtraArchivado) p.set("ar", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Opciones opcionales de columnas backlog/archivo en modo «Todas» (`bk=1`, `ar=1`). */
export function parseKanbanExtras(sp: Pick<URLSearchParams, "get">): {
  extraBacklog: boolean;
  extraArchivado: boolean;
} {
  return {
    extraBacklog: sp.get("bk") === "1",
    extraArchivado: sp.get("ar") === "1",
  };
}
