import Link from "next/link";
import { phaseLabel } from "@/lib/phaseLabels";
import type { ProjectRecord } from "@/lib/projectTypes";
import { HealthDot } from "@/components/proyectos/HealthDot";

export function ProjectsGallery({ projects }: { projects: ProjectRecord[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => (
        <Link
          key={p.id}
          href={`/proyectos/${p.id}`}
          className="flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800">
                {p.category}
              </p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{p.name}</h3>
            </div>
            <HealthDot health={p.health} />
          </div>
          <p className="mt-3 flex-1 text-sm text-slate-600">{p.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
            <div>
              <dt className="font-semibold text-slate-400">Fase</dt>
              <dd className="text-slate-800">{phaseLabel(p.phase)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-400">Responsable</dt>
              <dd className="text-slate-800">{p.ownerName}</dd>
            </div>
            <div className="col-span-2">
              <dt className="font-semibold text-slate-400">Stack</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {p.technologies.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          {p.riskNote ? (
            <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-950 ring-1 ring-amber-100">
              {p.riskNote}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
