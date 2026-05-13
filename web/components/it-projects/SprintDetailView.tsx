"use client";

import Link from "next/link";
import { notFound } from "next/navigation";

import { useResolvedItProject } from "@/hooks/useResolvedItProject";
import { ItSprintKanbanBoard } from "@/components/it-projects/ItSprintKanbanBoard";
import { inferScopeItemCompletedFromTitle, plannedTasksAssignedToSprint } from "@/lib/itProjectScopeProgress";
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
  const done = tasks.filter((t) => inferScopeItemCompletedFromTitle(t.title)).length;

  const projectHref = `/proyectos/${encodeURIComponent(project.id)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Link href="/proyectos" className="text-sky-700 hover:underline">
          Proyectos
        </Link>
        <span className="mx-2 text-slate-300">/</span>
        <Link href={projectHref} className="text-sky-700 hover:underline">
          {project.name}
        </Link>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-slate-600">Sprint</span>
      </nav>

      <header className="mt-4 border-b border-slate-100 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{sprint.title}</h1>
            {sprint.timeframe ? (
              <p className="mt-2 font-mono text-sm text-violet-900/90">{sprint.timeframe}</p>
            ) : null}
            <p className="mt-3 text-sm text-slate-600">
              Proyecto:{" "}
              <Link href={projectHref} className="font-semibold text-sky-800 hover:underline">
                {project.name}
              </Link>
              <span className="mx-2 text-slate-300">·</span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                {phaseLabel(project.phase)}
              </span>
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-right text-sm">
            <p className="font-bold text-slate-900">{tasks.length}</p>
            <p className="text-xs text-slate-600">{tasks.length === 1 ? "tarea asignada" : "tareas asignadas"}</p>
            {tasks.length > 0 ? (
              <p className="mt-2 text-xs text-emerald-800">
                {done} marcada{done !== 1 ? "s" : ""} como hecha (por prefijo en el título)
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mt-8" aria-labelledby="sprint-board-heading">
        <h2 id="sprint-board-heading" className="sr-only">
          Tablero de tareas del sprint
        </h2>
        <p className="mb-5 text-xs leading-relaxed text-slate-500">
          Las columnas se asignan con la misma convención que el avance de alcance:{" "}
          <span className="font-mono">[ ]</span> pendiente (por defecto), prefijos tipo{" "}
          <span className="font-mono">[~]</span> o «en curso:» para <strong>En curso</strong>, y{" "}
          <span className="font-mono">[x]</span> o ✅ para <strong>Hecho</strong>.
        </p>
        <ItSprintKanbanBoard tasks={tasks} />
      </section>
    </div>
  );
}
