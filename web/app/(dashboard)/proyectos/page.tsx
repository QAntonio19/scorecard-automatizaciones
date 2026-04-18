import { Suspense } from "react";
import { ItProjectsFilters } from "@/components/it-projects/ItProjectsFilters";
import { ItProjectsTable } from "@/components/it-projects/ItProjectsTable";
import {
  filterItProjects,
  listItProjects,
  phaseLabel,
} from "@/lib/itProjectPortfolio";
import type { ItProjectPhase } from "@/lib/itProjectTypes";

const PHASES: ItProjectPhase[] = [
  "estrategia",
  "planificacion",
  "ejecucion",
  "cierre",
  "archivado",
];

function parsePhase(raw: string | undefined): ItProjectPhase | "" {
  if (!raw) return "";
  return PHASES.includes(raw as ItProjectPhase) ? (raw as ItProjectPhase) : "";
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProyectosPortfolioPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q : "";
  const fase = parsePhase(typeof raw.fase === "string" ? raw.fase : undefined);

  const all = listItProjects();
  const filtered = filterItProjects(all, { q, phase: fase });
  const inExecution = all.filter((p) => p.phase === "ejecucion").length;

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Proyectos</h1>
        <p className="mt-2 text-sm text-slate-600">
          Portafolio de iniciativas IT — alcance, hitos, riesgos y vínculos con el scorecard de flujos.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">En cartera</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{all.length}</p>
          <p className="mt-1 text-xs text-slate-500">proyectos registrados (datos de ejemplo)</p>
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

      <Suspense
        fallback={<div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />}
      >
        <ItProjectsFilters />
      </Suspense>

      <p className="text-sm font-medium text-slate-600">
        Mostrando <span className="font-bold text-slate-900">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "proyecto" : "proyectos"}
      </p>

      <ItProjectsTable projects={filtered} />
    </div>
  );
}
