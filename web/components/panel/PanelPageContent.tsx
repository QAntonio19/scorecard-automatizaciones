"use client";

import { useMemo } from "react";
import { PanelAttentionList } from "@/components/panel/PanelAttentionList";
import { PanelMetricStrip } from "@/components/panel/PanelMetricStrip";
import { PanelRiskMatrix } from "@/components/panel/PanelRiskMatrix";
import { useMergedItProjects } from "@/lib/itProjectsLocalStore";

function PanelSkeleton() {
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        <div className="h-80 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
      </div>
    </div>
  );
}

export function PanelPageContent() {
  const { projects, ready } = useMergedItProjects();

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

  if (!ready) return <PanelSkeleton />;

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Panel</h1>
        <p className="mt-2 text-sm text-slate-600">
          Resumen del portafolio de proyectos IT — salud, riesgo y hitos próximos.
        </p>
      </header>

      <PanelMetricStrip projects={projects} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelRiskMatrix projects={projects} />
        <div className="flex flex-col gap-6">
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
        </div>
      </div>
    </div>
  );
}
