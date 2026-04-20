"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ItProjectsFilters } from "@/components/it-projects/ItProjectsFilters";
import { ItProjectsKanbanBoard } from "@/components/it-projects/ItProjectsKanbanBoard";
import { ItProjectsTable } from "@/components/it-projects/ItProjectsTable";
import { ItProjectsToolbar } from "@/components/it-projects/ItProjectsToolbar";
import {
  filterItProjects,
  IT_PROJECT_PHASE_ORDER,
  phaseLabel,
} from "@/lib/itProjectPortfolio";
import { useMergedItProjects } from "@/lib/itProjectsLocalStore";
import { parseVistaProyectosIt } from "@/lib/itProjectsUrl";
import type { ItProjectPhase } from "@/lib/itProjectTypes";

function parsePhase(raw: string | null): ItProjectPhase | "" {
  if (!raw) return "";
  return IT_PROJECT_PHASE_ORDER.includes(raw as ItProjectPhase) ? (raw as ItProjectPhase) : "";
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-10 max-w-md animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    </div>
  );
}

export function ProyectosPortfolioContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const fase = parsePhase(searchParams.get("fase"));
  const vista = parseVistaProyectosIt(searchParams.get("vista") ?? undefined);

  const { projects: all, ready } = useMergedItProjects();

  const filtered = useMemo(() => filterItProjects(all, { q, phase: fase }), [all, q, fase]);
  const inExecution = useMemo(() => all.filter((p) => p.phase === "ejecucion").length, [all]);

  if (!ready) {
    return <PortfolioSkeleton />;
  }

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Proyectos</h1>
          <p className="mt-2 text-sm text-slate-600">
            Portafolio de iniciativas IT — alcance, hitos, riesgos y vínculos con el scorecard de flujos.
          </p>
        </div>
        <Link
          href="/proyectos/nuevo"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800"
        >
          Nuevo proyecto
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">En cartera</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{all.length}</p>
          <p className="mt-1 text-xs text-slate-500">proyectos (ejemplo + creados en este navegador)</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {phaseLabel("ejecucion")}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-sky-800">{inExecution}</p>
          <p className="mt-1 text-xs text-slate-500">con entregas activas</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Resultado filtro</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{filtered.length}</p>
          <p className="mt-1 text-xs text-slate-500">coinciden con búsqueda / fase</p>
        </div>
      </div>

      <ItProjectsFilters />

      <ItProjectsToolbar />

      <p className="text-sm font-medium text-slate-600">
        Mostrando <span className="font-bold text-slate-900">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "proyecto" : "proyectos"}
      </p>

      {vista === "tabla" ? (
        <ItProjectsTable projects={filtered} />
      ) : (
        <ItProjectsKanbanBoard projects={filtered} />
      )}
    </div>
  );
}
