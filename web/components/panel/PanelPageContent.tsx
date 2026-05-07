"use client";

import { useMemo } from "react";
import { PanelAttentionList } from "@/components/panel/PanelAttentionList";
import { PanelMetricStrip } from "@/components/panel/PanelMetricStrip";
import { PanelRiskMatrix } from "@/components/panel/PanelRiskMatrix";
import { useMergedItProjects } from "@/lib/itProjectsLocalStore";
import { ItProjectCard } from "@/components/it-projects/ItProjectCard";
import { itPhaseTopBorderClass } from "@/lib/itProjectPortfolio";

function PanelSkeleton() {
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        ))}
      </div>
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-sky-600" />
        <p className="text-sm font-medium text-slate-500">Sincronizando con Notion…</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        <div className="h-80 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
      </div>
    </div>
  );
}

function PanelError({ message }: { message: string }) {
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Panel</h1>
        <p className="mt-2 text-sm text-slate-600">
          Resumen del portafolio de proyectos IT — salud, riesgo y hitos próximos.
        </p>
      </header>
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
    </div>
  );
}

export function PanelPageContent() {
  const { projects, loading, ready, error } = useMergedItProjects();

  const recentMilestones = useMemo(() => {
    const now = new Date().toISOString().split("T")[0];
    return projects
      .filter((p) => p.phase !== "archivado")
      .flatMap((p) =>
        p.milestones
          .filter((m) => !m.done && m.dueDate >= now)
          .map((m) => ({ ...m, projectId: p.id, projectName: p.name, projectCode: p.code })),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [projects]);

  const backlogProjects = useMemo(() => projects.filter((p) => p.phase === "backlog"), [projects]);
  const archivedProjects = useMemo(() => projects.filter((p) => p.phase === "archivado"), [projects]);

  if (loading && !ready) return <PanelSkeleton />;
  if (error) return <PanelError message={error} />;

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Panel</h1>
        <p className="mt-2 text-sm text-slate-600">
          Resumen del portafolio de proyectos IT — salud, riesgo y hitos próximos.
        </p>
      </header>

      <PanelMetricStrip projects={projects} />

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-1">
          <PanelRiskMatrix projects={projects} />
        </div>
        
        <div className="flex flex-col gap-6 lg:col-span-2">
          <PanelAttentionList projects={projects} />

          {/* Próximos hitos */}
          {recentMilestones.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">Próximos hitos</h2>
                <p className="mt-0.5 text-xs text-slate-500">Los 5 más cercanos sin completar</p>
              </header>
              <ul className="divide-y divide-slate-100">
                {recentMilestones.map((m) => (
                  <li key={`${m.projectId}-${m.id}`} className="flex items-center gap-3 px-5 py-3">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{m.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        <span className="font-mono">{m.projectCode}</span> · {m.projectName}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-50 px-2 py-1 font-mono text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                      {m.dueDate}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Backlog & Archivados */}
          {(backlogProjects.length > 0 || archivedProjects.length > 0) ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Backlog */}
              {backlogProjects.length > 0 ? (
                <section className={`flex min-h-0 max-h-[30rem] flex-col rounded-xl border border-slate-200 bg-white shadow-sm ${itPhaseTopBorderClass("backlog")} border-t-4`}>
                  <header className="shrink-0 border-b border-slate-100 px-4 py-3">
                    <h2 className="text-sm font-bold text-slate-900">
                      Backlog{" "}
                      <span className="font-semibold text-slate-500">
                        / {backlogProjects.length}
                      </span>
                    </h2>
                  </header>
                  <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch]">
                    {backlogProjects.map((p) => (
                      <ItProjectCard key={p.id} project={p} phaseBorderOnCard={false} />
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Archivados */}
              {archivedProjects.length > 0 ? (
                <section className={`flex min-h-0 max-h-[30rem] flex-col rounded-xl border border-slate-200 bg-white shadow-sm ${itPhaseTopBorderClass("archivado")} border-t-4`}>
                  <header className="shrink-0 border-b border-slate-100 px-4 py-3">
                    <h2 className="text-sm font-bold text-slate-900">
                      Archivado{" "}
                      <span className="font-semibold text-slate-500">
                        / {archivedProjects.length}
                      </span>
                    </h2>
                  </header>
                  <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch]">
                    {archivedProjects.map((p) => (
                      <ItProjectCard key={p.id} project={p} phaseBorderOnCard={false} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No hay proyectos en backlog ni archivados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
