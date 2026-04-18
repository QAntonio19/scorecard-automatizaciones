"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ItProject } from "@/lib/itProjectTypes";
import { phaseLabel, riskLabel } from "@/lib/itProjectPortfolio";

/**
 * Misma rejilla y cabeceras que `ProjectsTable` (Workflows): Proyecto, Fase, Salud, Responsable,
 * Categoría, Pasos, Tasa fallo, Acciones. Solo cambia el origen de los datos.
 */
type SortKey = "name" | "phase" | "risk" | "pm" | "sponsor" | "steps";

function sortString(p: ItProject, key: Exclude<SortKey, "steps" | "linked">): string {
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
      const textKey = sortKey as Exclude<SortKey, "steps" | "linked">;
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

  const th = (key: SortKey, label: string) => (
    <th className="px-3 py-2 text-left">
      <button
        type="button"
        onClick={() => toggle(key)}
        className="text-[11px] font-bold uppercase tracking-wide text-slate-500 hover:text-slate-800"
      >
        {label}
        {sortKey === key ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
        No hay proyectos con los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs">
          <tr className="border-b border-slate-200">
            {th("name", "Proyecto")}
            {th("phase", "Fase")}
            {th("risk", "Salud")}
            {th("pm", "Responsable")}
            {th("sponsor", "Categoría")}
            {th("steps", "Pasos")}
            <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Tasa fallo
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/80">
              <td className="px-3 py-3 font-semibold text-slate-900">{p.name}</td>
              <td className="px-3 py-3 text-slate-600">{phaseLabel(p.phase)}</td>
              <td className="px-3 py-3 text-slate-600">{riskLabel(p.riskLevel)}</td>
              <td className="px-3 py-3 text-slate-600">{p.pmName}</td>
              <td className="px-3 py-3 text-slate-600">{p.sponsor}</td>
              <td className="px-3 py-3 text-slate-600">{p.milestones.length}</td>
              <td className="px-3 py-3 text-slate-600">—</td>
              <td className="px-3 py-3 text-right">
                <Link
                  href={`/proyectos/${p.id}`}
                  className="text-sm font-semibold text-sky-800 hover:text-sky-950"
                >
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
