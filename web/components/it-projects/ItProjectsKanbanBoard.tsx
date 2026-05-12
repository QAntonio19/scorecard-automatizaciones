"use client";

import { ItProjectCard } from "@/components/it-projects/ItProjectCard";
import {
  itPhaseTopBorderClass,
  phaseLabel,
} from "@/lib/itProjectPortfolio";
import type { ItProject, ItProjectPhase } from "@/lib/itProjectTypes";

function KanbanColumn({
  phase,
  projects,
}: {
  phase: ItProjectPhase;
  projects: ItProject[];
}) {
  const colProjects = projects.filter((p) => p.phase === phase);
  const atRisk = colProjects.filter((p) => p.riskLevel === "alto").length;
  const suffix =
    phase === "ejecucion" && atRisk > 0 ? ` — ${atRisk} alto riesgo` : "";

  return (
    <section
      className={`flex min-h-0 max-h-[min(75vh,calc(100dvh-13rem))] flex-col rounded-xl border border-slate-200 bg-white shadow-sm ${itPhaseTopBorderClass(
        phase,
      )} border-t-4`}
    >
      <header className="shrink-0 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">
          {phaseLabel(phase)}{" "}
          <span className="font-semibold text-slate-500">
            / {colProjects.length}{" "}
            {colProjects.length === 1 ? "proyecto" : "proyectos"}
            {suffix}
          </span>
        </h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch]">
        {colProjects.map((p) => (
          <ItProjectCard key={p.id} project={p} phaseBorderOnCard={false} />
        ))}
        {colProjects.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-1 py-8 text-center text-xs text-slate-400">
            Sin proyectos en esta fase
          </p>
        ) : null}
      </div>
    </section>
  );
}

export type ItProjectsKanbanBoardProps = {
  projects: ItProject[];
  /** Orden izquierda → derecha; el padre construye columna Backlog/Archivo sólo si aplican. */
  columnPhases: readonly ItProjectPhase[];
};

export function ItProjectsKanbanBoard({ projects, columnPhases }: ItProjectsKanbanBoardProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
        No hay proyectos con los filtros seleccionados.
      </div>
    );
  }

  /** `auto-fit` contrae huecos sin tarjetas; `auto-fill` deja ranuras vacías (espacio lateral «fantasma»). */
  return (
    <div
      className="grid min-h-0 items-stretch gap-5"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))",
      }}
    >
      {columnPhases.map((phase) => (
        <KanbanColumn key={phase} phase={phase} projects={projects} />
      ))}
    </div>
  );
}
