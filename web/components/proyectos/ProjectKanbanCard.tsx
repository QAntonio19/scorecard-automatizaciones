import Link from "next/link";
import type { ProjectRecord } from "@/lib/projectTypes";
import { HealthDot } from "@/components/proyectos/HealthDot";

function ownerBadgeClass(code: ProjectRecord["ownerCode"]) {
  return code === "JA"
    ? "bg-violet-50 text-violet-800 ring-violet-100"
    : "bg-sky-50 text-sky-800 ring-sky-100";
}

export function ProjectKanbanCard({ project }: { project: ProjectRecord }) {
  return (
    <Link
      href={`/workflows/${project.id}`}
      className="block cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{project.name}</h3>
        <HealthDot health={project.health} />
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-slate-600">{project.description}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            project.health === "en_riesgo"
              ? "bg-rose-400"
              : project.health === "pausado"
                ? "bg-amber-300"
                : "bg-sky-500"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
        />
      </div>
      {project.failureRate != null && project.health === "en_riesgo" ? (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 ring-1 ring-rose-100">
          <span aria-hidden>⚠️</span> Fallo: {project.failureRate.toFixed(2)}%
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-600">{project.steps} pasos</span>
        <span className="text-slate-300">·</span>
        <span>{project.schedule}</span>
      </div>
      {project.riskNote && project.health === "en_riesgo" ? (
        <p className="mt-2 rounded-md bg-rose-50/80 p-2 text-[11px] leading-snug text-rose-900 ring-1 ring-rose-100">
          {project.riskNote}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${ownerBadgeClass(
            project.ownerCode,
          )}`}
        >
          {project.ownerCode === "JA" ? "Juan" : "Evelyn"}
        </span>
        <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
          {project.platform ?? project.technologies[0] ?? "—"}
        </span>
      </div>
    </Link>
  );
}
