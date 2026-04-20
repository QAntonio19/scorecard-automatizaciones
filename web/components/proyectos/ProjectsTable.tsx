"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HealthDot } from "@/components/proyectos/HealthDot";
import { workflowOwnerChipClass } from "@/components/proyectos/workflowOwnerChip";
import { phaseLabel, workflowPhaseTopBorderClass } from "@/lib/phaseLabels";
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

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm border-t-4 border-t-slate-400">
        <header className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">
            Tabla{" "}
            <span className="font-semibold text-slate-500">
              / {projects.length} {projects.length === 1 ? "flujo" : "flujos"}
            </span>
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sortBtn("name", "Workflow")}
            {sortBtn("phase", "Fase")}
            {sortBtn("health", "Salud")}
            {sortBtn("owner", "Resp.")}
            {sortBtn("category", "Categoría")}
            {sortBtn("steps", "Pasos")}
            {sortBtn("failureRate", "Tasa fallo")}
          </div>
        </header>
      </div>

      {rows.map((p) => (
        <Link
          key={p.id}
          href={`/workflows/${p.id}`}
          className={`block cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-sm ${workflowPhaseTopBorderClass(
            p.phase,
          )} border-t-4`}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
            <HealthDot health={p.health} />
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-slate-600">{p.description}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                p.health === "en_riesgo"
                  ? "bg-rose-400"
                  : p.health === "pausado"
                    ? "bg-amber-300"
                    : "bg-sky-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
            />
          </div>
          {p.failureRate != null && p.health === "en_riesgo" ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 ring-1 ring-rose-100">
              <span aria-hidden>⚠️</span> Fallo: {p.failureRate.toFixed(2)}%
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-600">{p.steps} pasos</span>
            <span className="text-slate-300">·</span>
            <span>{p.schedule}</span>
          </div>
          {p.riskNote && p.health === "en_riesgo" ? (
            <p className="mt-2 rounded-md bg-rose-50/80 p-2 text-[11px] leading-snug text-rose-900 ring-1 ring-rose-100">
              {p.riskNote}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
              {phaseLabel(p.phase)}
            </span>
            <span className="text-[11px] text-slate-600">{p.healthLabel}</span>
            <span className="text-slate-300">·</span>
            <span className="truncate text-[11px] text-slate-600">{p.category}</span>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-600">
              {p.failureRate != null ? `${p.failureRate.toFixed(2)}%` : "—"} fallo
            </span>
            <span className="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset text-sky-800 ring-sky-200 bg-sky-50">
              Ver →
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${workflowOwnerChipClass(
                p.ownerCode,
              )}`}
            >
              {p.ownerCode === "JA" ? "Juan" : "Evelyn"}
            </span>
            <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
              {p.platform ?? p.technologies[0] ?? "—"}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
