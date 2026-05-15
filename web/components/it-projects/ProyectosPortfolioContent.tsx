"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useCanEdit } from "@/hooks/useCanEdit";
import { ItProjectsFilters } from "@/components/it-projects/ItProjectsFilters";
import { ItProjectsKanbanBoard } from "@/components/it-projects/ItProjectsKanbanBoard";
import {
  filterItProjects,
  IT_PROJECT_PHASE_ORDER,
  phaseLabel,
} from "@/lib/itProjectPortfolio";
import { useMergedItProjects } from "@/lib/itProjectsLocalStore";
import type { ItProjectPhase } from "@/lib/itProjectTypes";

function parsePhase(raw: string | null): ItProjectPhase | "" {
  if (!raw) return "";
  return IT_PROJECT_PHASE_ORDER.includes(raw as ItProjectPhase) ? (raw as ItProjectPhase) : "";
}

/** Fases intermedias cuando el filtro es «Todas» (sin backlog/archivado hasta `bk`/`ar`). */
const KANBAN_MIDDLE_PHASES: readonly ItProjectPhase[] = [
  "sin_empezar",
  "planificacion",
  "ejecucion",
  "cierre",
];

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

function LoadingOverlay() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700">Sincronizando con Notion…</p>
        <p className="mt-1 text-xs text-slate-500">Cargando proyectos desde la base de datos</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center shadow-sm"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-red-900">No se pudo conectar con Notion</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-red-800/80">
          {message}. Verifica que las variables{" "}
          <code className="rounded bg-red-100 px-1 text-[11px]">NOTION_API_KEY</code> y{" "}
          <code className="rounded bg-red-100 px-1 text-[11px]">NOTION_IT_PROJECTS_DB_ID</code>{" "}
          estén configuradas correctamente.
        </p>
      </div>
    </div>
  );
}

export function ProyectosPortfolioContent() {
  const canEdit = useCanEdit();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const fase = parsePhase(searchParams.get("fase"));
  const extraBk = searchParams.get("bk") === "1";
  const extraAr = searchParams.get("ar") === "1";

  const { projects: all, loading, ready, error: notionFetchError } = useMergedItProjects();

  const displayProjects = useMemo(() => {
    if (fase !== "") return filterItProjects(all, { q, phase: fase });
    let out = filterItProjects(all, { q });
    if (!extraBk) out = out.filter((p) => p.phase !== "backlog");
    if (!extraAr) out = out.filter((p) => p.phase !== "archivado");
    return out;
  }, [all, q, fase, extraBk, extraAr]);

  const kanbanColumnPhases = useMemo((): readonly ItProjectPhase[] => {
    if (fase !== "") return [fase];
    const cols: ItProjectPhase[] = [];
    if (extraBk) cols.push("backlog");
    cols.push(...KANBAN_MIDDLE_PHASES);
    if (extraAr) cols.push("archivado");
    return cols;
  }, [fase, extraBk, extraAr]);

  const activeInPortfolio = useMemo(
    () => all.filter((p) => p.phase !== "backlog" && p.phase !== "archivado"),
    [all],
  );

  const inExecution = useMemo(() => activeInPortfolio.filter((p) => p.phase === "ejecucion").length, [
    activeInPortfolio,
  ]);

  if (!ready && loading) {
    return <PortfolioSkeleton />;
  }

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Proyectos</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            Portafolio de iniciativas IT — alcance, hitos, riesgos y vínculos con el scorecard de flujos.
          </p>
        </div>
        {canEdit ? (
          <Link
            href="/proyectos/nuevo"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5"
          >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuevo proyecto
          </Link>
        ) : null}
      </header>

      {/* Error state */}
      {notionFetchError ? (
        <ErrorBanner message={notionFetchError} />
      ) : null}

      {/* Loading state — shown when Notion is still loading and no error */}
      {loading && !notionFetchError ? (
        <LoadingOverlay />
      ) : null}

      {/* Data loaded successfully */}
      {ready && !notionFetchError ? (
        <>
          <div className="grid gap-5 sm:grid-cols-3 mb-8">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                 <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                 En cartera
              </p>
              <p className="mt-3 text-3xl font-black tabular-nums tracking-tighter text-slate-800">
                {activeInPortfolio.length}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">proyectos activos</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-500 flex items-center gap-2">
                 <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {phaseLabel("ejecucion")}
              </p>
              <p className="mt-3 text-3xl font-black tabular-nums tracking-tighter text-sky-700">{inExecution}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">con entregas activas</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                 <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                 Resultado filtro
              </p>
              <p className="mt-3 text-3xl font-black tabular-nums tracking-tighter text-slate-800">{displayProjects.length}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">coinciden con búsqueda</p>
            </div>
          </div>

          <ItProjectsFilters />

          <p className="text-sm font-medium text-slate-600">
            Mostrando <span className="font-bold text-slate-900">{displayProjects.length}</span>{" "}
            {displayProjects.length === 1 ? "proyecto" : "proyectos"}
          </p>

          <ItProjectsKanbanBoard
            projects={displayProjects}
            columnPhases={kanbanColumnPhases}
            phaseDragAllowed={canEdit === true && fase === "" && kanbanColumnPhases.length > 1}
          />
        </>
      ) : null}
    </div>
  );
}

