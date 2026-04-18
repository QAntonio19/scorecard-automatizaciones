import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiBackendMissingEnv, ApiBackendUnreachable } from "@/components/deployment/ApiBackendNotice";
import { HealthDot } from "@/components/proyectos/HealthDot";
import { ProjectDetailsForm } from "@/components/proyectos/ProjectDetailsForm";
import { ProjectPhasePicker } from "@/components/proyectos/ProjectPhasePicker";
import { ProjectOwnerPicker } from "@/components/proyectos/ProjectOwnerPicker";
import { fetchProjectById, isApiNotConfiguredError } from "@/lib/projectsApi";
import type { OwnerCode, ProjectHealth, ProjectPhase } from "@/lib/projectTypes";

type PageProps = { params: Promise<{ id: string }> };

function healthBadgeClasses(health: ProjectHealth): string {
  if (health === "en_riesgo") {
    return "bg-rose-50 text-rose-800 ring-rose-200/80";
  }
  if (health === "pausado") {
    return "bg-amber-50 text-amber-900 ring-amber-200/80";
  }
  return "bg-emerald-50 text-emerald-900 ring-emerald-200/80";
}

export default async function ProyectoDetallePage({ params }: PageProps) {
  const { id } = await params;
  let p: Awaited<ReturnType<typeof fetchProjectById>>;
  try {
    p = await fetchProjectById(id);
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
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/proyectos"
        className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm font-medium text-sky-800 transition hover:bg-sky-50 hover:text-sky-950"
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
        Volver a proyectos
      </Link>

      {/* Cabecera */}
      <header className="relative mt-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-sky-50/40 px-6 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-200/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-violet-200/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <span className="inline-flex max-w-full items-center rounded-full bg-sky-100/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-900 ring-1 ring-sky-200/60">
              {p.category}
            </span>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {p.name}
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-slate-600">{p.description}</p>
            <p className="text-xs text-slate-500">
              Puedes editar nombre, descripción y el resto de métricas en el formulario siguiente; la cabecera se
              actualiza al guardar.
            </p>
          </div>

          <div
            className={`flex shrink-0 items-center gap-2.5 self-start rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm ring-1 ${healthBadgeClasses(p.health)}`}
          >
            <HealthDot health={p.health} />
            <span>{p.healthLabel}</span>
          </div>
        </div>
      </header>

      {/* Gestión: fase y responsable */}
      <section className="mt-8 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Gestión</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
            <h3 className="text-sm font-semibold text-slate-800">Fase</h3>
            <div className="mt-4">
              <ProjectPhasePicker
                projectId={p.id}
                phase={p.phase as ProjectPhase}
                phaseIsManual={Boolean(p.phaseIsManual)}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
            <h3 className="text-sm font-semibold text-slate-800">Responsable</h3>
            <div className="mt-4">
              <ProjectOwnerPicker
                projectId={p.id}
                ownerCode={p.ownerCode as OwnerCode}
                ownerIsManual={Boolean(p.ownerIsManual)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Datos editables */}
      <section className="mt-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos del workflow</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Edita nombre, métricas, estado y notas. Fase y responsable siguen en la sección Gestión.
        </p>
        <div className="mt-6">
          <ProjectDetailsForm project={p} />
        </div>
      </section>

      {/* Tags */}
      <section className="mt-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tags e integraciones</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {p.technologies.map((t) => (
            <li key={t}>
              <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100/80 transition hover:border-slate-300 hover:bg-slate-50">
                {t}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
