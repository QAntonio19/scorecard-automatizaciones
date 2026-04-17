"use client";

import { useState } from "react";
import { IconDownload } from "@/components/icons/NavIcons";
import { phaseLabel } from "@/lib/phaseLabels";
import type { ProjectsQuery } from "@/lib/projectsApi";
import type { ProjectPhase } from "@/lib/projectTypes";

function toCsv(rows: Record<string, string | number | null | undefined>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ];
  return lines.join("\n");
}

function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return raw.replace(/\/$/, "");
}

export function CsvExportButton({ query }: { query: ProjectsQuery }) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const search = new URLSearchParams();
      if (query.owners) search.set("owners", query.owners);
      if (query.health) search.set("health", query.health);
      if (query.platform) search.set("platform", query.platform);
      if (query.category) search.set("category", query.category);
      if (query.q) search.set("q", query.q);
      const qs = search.toString();
      const url = `${getApiBaseUrl()}/api/projects${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("No se pudo exportar");
      const data = (await res.json()) as {
        items: Array<{
          id: string;
          name: string;
          phase: string;
          health: string;
          healthLabel: string;
          ownerName: string;
          category: string;
          steps: number;
          schedule: string;
          failureRate: number | null;
        }>;
      };
      const rows = data.items.map((p) => ({
        id: p.id,
        nombre: p.name,
        fase: phaseLabel(p.phase as ProjectPhase),
        salud: p.health,
        etiqueta_salud: p.healthLabel,
        responsable: p.ownerName,
        categoria: p.category,
        pasos: p.steps,
        programacion: p.schedule,
        tasa_fallo_pct: p.failureRate,
      }));
      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "proyectos-itai.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
    >
      <IconDownload className="h-3.5 w-3.5" />
      CSV
    </button>
  );
}
