import { Suspense } from "react";
import { ApiBackendMissingEnv, ApiBackendUnreachable } from "@/components/deployment/ApiBackendNotice";
import { KanbanBoardDynamic } from "@/components/proyectos/KanbanBoardDynamic";
import { ProjectsGallery } from "@/components/proyectos/ProjectsGallery";
import { ProjectsTable } from "@/components/proyectos/ProjectsTable";
import { WorkflowsToolbar } from "@/components/proyectos/WorkflowsToolbar";
import { parseWorkflowsSearchParams, toApiProjectsQuery } from "@/lib/workflowsUrl";
import { fetchPortfolioSummary, fetchProjectsList, isApiNotConfiguredError } from "@/lib/projectsApi";

function flatSearchParams(
  sp: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const o: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    o[k] = Array.isArray(v) ? v[0] : v;
  }
  return o;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkflowsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const state = parseWorkflowsSearchParams(flatSearchParams(raw));
  const apiQuery = toApiProjectsQuery(state);

  let list: Awaited<ReturnType<typeof fetchProjectsList>>;
  let summary: Awaited<ReturnType<typeof fetchPortfolioSummary>>;
  try {
    [list, summary] = await Promise.all([
      fetchProjectsList(apiQuery),
      fetchPortfolioSummary(),
    ]);
  } catch (e) {
    if (isApiNotConfiguredError(e)) {
      return (
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <ApiBackendMissingEnv />
        </div>
      );
    }
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <ApiBackendUnreachable />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Workflows</h1>
        <p className="mt-2 text-sm text-slate-600">Portafolio de automatizaciones ITAI</p>
        <p className="mt-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">En cartera:</span>{" "}
          <span className="tabular-nums">{summary.workflowCounts.n8n}</span> n8n ·{" "}
          <span className="tabular-nums">{summary.workflowCounts.make}</span> Make ·{" "}
          <span className="tabular-nums">{summary.workflowCounts.codigo_puro}</span> código puro
        </p>
      </header>

      <Suspense
        fallback={<div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />}
      >
        <WorkflowsToolbar />
      </Suspense>

      <p className="text-sm font-medium text-slate-600">
        Mostrando <span className="font-bold text-slate-900">{list.total}</span>{" "}
        {list.total === 1 ? "flujo" : "flujos"}
      </p>

      {list.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          No hay flujos con los filtros seleccionados.
        </div>
      ) : state.vista === "tabla" ? (
        <ProjectsTable projects={list.items} />
      ) : state.vista === "tarjetas" ? (
        <ProjectsGallery projects={list.items} />
      ) : (
        <KanbanBoardDynamic projects={list.items} />
      )}
    </div>
  );
}
