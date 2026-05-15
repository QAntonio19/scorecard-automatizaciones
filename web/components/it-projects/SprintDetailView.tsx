"use client";

import Link from "next/link";
import { notFound } from "next/navigation";

import { useResolvedItProject } from "@/hooks/useResolvedItProject";
import { ItSprintKanbanBoard } from "@/components/it-projects/ItSprintKanbanBoard";
import {
  plannedTasksAssignedToSprint,
  resolvedSprintTaskKanbanColumn,
} from "@/lib/itProjectScopeProgress";
import { phaseLabel } from "@/lib/itProjectPortfolio";

type Props = {
  projectId: string;
  sprintId: string;
};

function SprintDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-5 w-full max-w-md animate-pulse rounded bg-slate-100" />
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

export function SprintDetailView({ projectId, sprintId }: Props) {
  const { loading, project: project } = useResolvedItProject(projectId);

  if (loading) {
    return <SprintDetailSkeleton />;
  }
  if (!project) {
    notFound();
  }

  const sprint = project.sprints.find((s) => s.id === sprintId);
  if (!sprint) {
    notFound();
  }

  const tasks = plannedTasksAssignedToSprint(project.plannedTasks, sprint.id);
  const done = tasks.filter((t) => resolvedSprintTaskKanbanColumn(t) === "hecho").length;

  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  const projectHref = `/proyectos/${encodeURIComponent(project.id)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
        <Link href="/proyectos" className="text-slate-500 hover:text-indigo-600 transition-colors">
          Proyectos
        </Link>
        <span className="text-slate-300">/</span>
        <Link href={projectHref} className="text-slate-500 hover:text-indigo-600 transition-colors">
          {project.name}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">Sprint</span>
      </nav>

      <header className="relative mt-4 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/40 to-slate-50/90 px-6 py-8 shadow-sm sm:px-8 sm:py-10 border-l-4 border-l-violet-500">
        <div className="flex flex-wrap items-start justify-between gap-6 relative z-10">
          <div className="flex-1 min-w-[280px]">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl animate-fade-in">{sprint.title}</h1>
            {sprint.timeframe ? (
              <p className="mt-3 font-mono text-sm text-violet-700 bg-violet-50/80 inline-flex px-3 py-1 rounded-lg border border-violet-100/50 animate-fade-in" style={{animationDelay: '100ms'}}>{sprint.timeframe}</p>
            ) : null}
            <div className="mt-4 flex items-center gap-3 animate-fade-in" style={{animationDelay: '200ms'}}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Proyecto:</span>
              <Link href={projectHref} className="font-semibold text-indigo-700 hover:underline hover:text-indigo-900 transition-colors">
                {project.name}
              </Link>
              <span className="mx-1 text-slate-300">·</span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset shadow-sm transition hover:scale-105 bg-slate-100 text-slate-700 ring-slate-200`}>
                {phaseLabel(project.phase)}
              </span>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-violet-100/50 bg-white/60 backdrop-blur-sm px-6 py-5 text-left shadow-sm ring-1 ring-inset ring-slate-200/50 animate-fade-in transition-transform hover:-translate-y-1 hover:shadow-md min-w-[260px]" style={{animationDelay: '300ms'}}>
            <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Progreso del Sprint
            </h2>
            <div className="flex items-end justify-between gap-4 mb-2 mt-4">
              <div className="text-sm text-slate-600">
                <span className="font-bold text-slate-900 text-xl">{done}</span> de {tasks.length} tareas
              </div>
              <div className="text-2xl font-black text-slate-800 tracking-tighter">{percent}%</div>
            </div>
            <div className="mt-4">
              <div
                className="h-2.5 overflow-hidden rounded-full bg-slate-200/50 border border-slate-200/50 shadow-inner"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso del sprint"
              >
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${percent >= 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-indigo-500' : 'bg-amber-400'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" aria-hidden="true" />
      </header>

      <section className="mt-10" aria-labelledby="sprint-board-heading">
        <h2 id="sprint-board-heading" className="sr-only">
          Tablero de tareas del sprint
        </h2>

        <ItSprintKanbanBoard tasks={tasks} project={project} />
      </section>
    </div>
  );
}
