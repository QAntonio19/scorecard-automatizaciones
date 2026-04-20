"use client";

import { useMemo, useState } from "react";
import { ItProjectCard } from "@/components/it-projects/ItProjectCard";
import type { ItProject } from "@/lib/itProjectTypes";

type SortKey = "name" | "phase" | "risk" | "pm" | "sponsor" | "steps";

function sortString(p: ItProject, key: Exclude<SortKey, "steps">): string {
  switch (key) {
    case "name":
      return p.name;
    case "phase":
      return p.phase;
    case "risk":
      return p.riskLevel;
    case "pm":
      return p.pmName;
    case "sponsor":
      return p.sponsor;
    default:
      return "";
  }
}

export function ItProjectsTable({ projects }: { projects: ItProject[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const rows = useMemo(() => {
    const copy = [...projects];
    copy.sort((a, b) => {
      const sign = dir === "asc" ? 1 : -1;
      if (sortKey === "steps") {
        return (a.milestones.length - b.milestones.length) * sign;
      }
      const textKey = sortKey as Exclude<SortKey, "steps">;
      const av = sortString(a, textKey);
      const bv = sortString(b, textKey);
      return av.localeCompare(bv, "es-MX") * sign;
    });
    return copy;
  }, [projects, sortKey, dir]);

  const toggle = (key: SortKey) => {
    if (sortKey === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir("asc");
    }
  };

  const sortBtn = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggle(key)}
      className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
        sortKey === key
          ? "bg-slate-900 text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      {label}
      {sortKey === key ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
        No hay proyectos con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm border-t-4 border-t-slate-400">
        <header className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">
            Tabla{" "}
            <span className="font-semibold text-slate-500">
              / {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
            </span>
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sortBtn("name", "Proyecto")}
            {sortBtn("phase", "Fase")}
            {sortBtn("risk", "Salud")}
            {sortBtn("pm", "Resp.")}
            {sortBtn("sponsor", "Categoría")}
            {sortBtn("steps", "Pasos")}
          </div>
        </header>
      </div>

      {rows.map((p) => (
        <ItProjectCard key={p.id} project={p} phaseBorderOnCard />
      ))}
    </div>
  );
}
