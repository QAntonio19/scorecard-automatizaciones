import Link from "next/link";
import { notFound } from "next/navigation";
import { HealthDot } from "@/components/proyectos/HealthDot";
import { ProjectOwnerPicker } from "@/components/proyectos/ProjectOwnerPicker";
import { fetchProjectById } from "@/lib/projectsApi";
import type { OwnerCode } from "@/lib/projectTypes";

function phaseLabel(phase: string) {
  if (phase === "sin_iniciar") return "Sin iniciar";
  if (phase === "en_progreso") return "En progreso";
  return "Completado";
}

type PageProps = { params: Promise<{ id: string }> };

export default async function ProyectoDetallePage({ params }: PageProps) {
  const { id } = await params;
  const p = await fetchProjectById(id);
  if (!p) notFound();

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/proyectos"
        className="text-sm font-semibold text-sky-800 hover:text-sky-950"
      >
        ← Volver a proyectos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-sky-800">{p.category}</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{p.name}</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">{p.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <HealthDot health={p.health} />
          <span className="text-sm font-semibold text-slate-700">{p.healthLabel}</span>
        </div>
      </header>

      <section className="grid gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">Fase</dt>
            <dd className="mt-1 text-slate-900">{phaseLabel(p.phase)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">Responsable</dt>
            <dd className="mt-1">
              <ProjectOwnerPicker
                projectId={p.id}
                ownerCode={p.ownerCode as OwnerCode}
                ownerIsManual={Boolean(p.ownerIsManual)}
              />
            </dd>
          </div>
          {p.platform ? (
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">Plataforma</dt>
              <dd className="mt-1 font-semibold text-violet-700">{p.platform}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">Programación</dt>
            <dd className="mt-1 text-slate-900">{p.schedule}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">Progreso</dt>
            <dd className="mt-1 text-slate-900">{p.progress}%</dd>
          </div>
        </dl>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">Pasos del flujo</dt>
            <dd className="mt-1 text-slate-900">{p.steps}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">Complejidad / Valor</dt>
            <dd className="mt-1 text-slate-900">
              {p.complexity} / {p.businessValue}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">Tasa de fallo</dt>
            <dd className="mt-1 text-slate-900">
              {p.failureRate != null ? `${p.failureRate.toFixed(2)}%` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">Notas</dt>
            <dd className="mt-1 text-slate-700">{p.riskNote ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-800">Tags / integraciones</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {p.technologies.map((t) => (
            <li
              key={t}
              className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
