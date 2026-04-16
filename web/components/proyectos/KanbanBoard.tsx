import type { ProjectPhase, ProjectRecord } from "@/lib/projectTypes";
import { ProjectKanbanCard } from "@/components/proyectos/ProjectKanbanCard";

const phases: Array<{
  id: ProjectPhase;
  title: string;
  border: string;
}> = [
  { id: "sin_iniciar", title: "Sin iniciar", border: "border-t-slate-400" },
  { id: "en_progreso", title: "En progreso", border: "border-t-sky-500" },
  { id: "completado", title: "Completado", border: "border-t-emerald-500" },
];

export function KanbanBoard({ projects }: { projects: ProjectRecord[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {phases.map((col) => {
        const colProjects = projects.filter((p) => p.phase === col.id);
        const atRisk = colProjects.filter((p) => p.health === "en_riesgo").length;
        const suffix =
          col.id === "en_progreso" && atRisk > 0
            ? ` — ${atRisk} en riesgo`
            : "";
        return (
          <section
            key={col.id}
            className={`rounded-xl border border-slate-200 bg-white shadow-sm ${col.border} border-t-4`}
          >
            <header className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">
                {col.title}{" "}
                <span className="font-semibold text-slate-500">
                  / {colProjects.length}{" "}
                  {colProjects.length === 1 ? "proyecto" : "proyectos"}
                  {suffix}
                </span>
              </h2>
            </header>
            <div className="space-y-3 p-3">
              {colProjects.map((p) => (
                <ProjectKanbanCard key={p.id} project={p} />
              ))}
              {colProjects.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-slate-400">Sin proyectos</p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
