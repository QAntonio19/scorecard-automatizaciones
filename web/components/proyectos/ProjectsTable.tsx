"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { phaseLabel } from "@/lib/phaseLabels";
import type { ProjectRecord } from "@/lib/projectTypes";

type SortKey = "name" | "phase" | "health" | "owner" | "category" | "steps" | "failureRate";

function sortString(p: ProjectRecord, key: Exclude<SortKey, "steps" | "failureRate">): string {
  switch (key) {
    case "name":
      return p.name;
    case "phase":
      return p.phase;
    case "health":
      return p.health;
    case "owner":
      return p.ownerName;
    case "category":
      return p.category;
    default:
      return "";
  }
}

export function ProjectsTable({ projects }: { projects: ProjectRecord[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const rows = useMemo(() => {
    const copy = [...projects];
    copy.sort((a, b) => {
      const sign = dir === "asc" ? 1 : -1;
      if (sortKey === "failureRate") {
        const av = a.failureRate ?? -1;
        const bv = b.failureRate ?? -1;
        return (av - bv) * sign;
      }
      if (sortKey === "steps") return (a.steps - b.steps) * sign;
      const textKey = sortKey as Exclude<SortKey, "steps" | "failureRate">;
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

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs">
          <tr className="border-b border-slate-200">
            {th("name", "Proyecto")}
            {th("phase", "Fase")}
            {th("health", "Salud")}
            {th("owner", "Responsable")}
            {th("category", "Categoría")}
            {th("steps", "Pasos")}
            {th("failureRate", "Tasa fallo")}
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
              <td className="px-3 py-3 text-slate-600">{p.healthLabel}</td>
              <td className="px-3 py-3 text-slate-600">{p.ownerName}</td>
              <td className="px-3 py-3 text-slate-600">{p.category}</td>
              <td className="px-3 py-3 text-slate-600">{p.steps}</td>
              <td className="px-3 py-3 text-slate-600">
                {p.failureRate != null ? `${p.failureRate.toFixed(2)}%` : "—"}
              </td>
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
