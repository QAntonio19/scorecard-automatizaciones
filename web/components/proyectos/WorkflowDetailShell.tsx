"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { HealthDot } from "@/components/proyectos/HealthDot";
import { ProjectDetailsForm } from "@/components/proyectos/ProjectDetailsForm";
import { ProjectPhasePicker } from "@/components/proyectos/ProjectPhasePicker";
import { ProjectOwnerPicker } from "@/components/proyectos/ProjectOwnerPicker";
import { phaseLabel } from "@/lib/phaseLabels";
import type { OwnerCode, ProjectPhase, ProjectRecord } from "@/lib/projectTypes";

function healthBadgeClasses(health: ProjectRecord["health"]): string {
  if (health === "en_riesgo") {
    return "bg-rose-50 text-rose-800 ring-rose-200/80";
  }
  if (health === "pausado") {
    return "bg-amber-50 text-amber-900 ring-amber-200/80";
  }
  return "bg-emerald-50 text-emerald-900 ring-emerald-200/80";
}

const roLabel = "text-[11px] font-bold uppercase tracking-wider text-slate-400";
const roBox = "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80";

type Props = { project: ProjectRecord };

export function WorkflowDetailShell({ project: initial }: Props) {
  const [project, setProject] = useState<ProjectRecord>(initial);
  const [editOpen, setEditOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const panelId = useId();

  useEffect(() => {
    setProject(initial);
  }, [initial]);

  const close = useCallback(() => setEditOpen(false), []);

  useEffect(() => {
    if (!editOpen) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [editOpen]);

  useEffect(() => {
    if (!editOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editOpen, close]);

  useEffect(() => {
    if (editOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [editOpen]);

  const onFormSaved = useCallback(() => close(), [close]);

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/workflows"
            className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm font-medium text-sky-800 transition hover:bg-sky-50 hover:text-sky-950"
          >
            <span aria-hidden className="text-lg leading-none">
              ←
            </span>
            Volver a workflows
          </Link>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-500/30"
          >
            Editar
          </button>
        </div>

        <header className="relative mt-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-sky-50/40 px-6 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-200/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-violet-200/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              <span className="inline-flex max-w-full items-center rounded-full bg-sky-100/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-900 ring-1 ring-sky-200/60">
                {project.category}
              </span>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {project.name}
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-slate-600">{project.description}</p>
              <p className="text-xs text-slate-500">
                Vista de solo lectura. Pulsa <strong className="font-semibold text-slate-700">Editar</strong> para
                cambiar fase, responsable y el resto de campos.
              </p>
            </div>

            <div
              className={`flex shrink-0 items-center gap-2.5 self-start rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm ring-1 ${healthBadgeClasses(project.health)}`}
            >
              <HealthDot health={project.health} />
              <span>{project.healthLabel}</span>
            </div>
          </div>
        </header>

        <section className="mt-8 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Gestión</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className={roBox}>
              <h3 className="text-sm font-semibold text-slate-800">Fase</h3>
              <p className="mt-3 text-lg font-semibold text-slate-900">{phaseLabel(project.phase)}</p>
              {project.phaseIsManual ? (
                <p className="mt-2 text-xs text-sky-700">Fase fijada manualmente (no la sobrescribe el sync).</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Según datos del scorecard o sincronización.</p>
              )}
            </div>
            <div className={roBox}>
              <h3 className="text-sm font-semibold text-slate-800">Responsable</h3>
              <p className="mt-3 text-lg font-semibold text-slate-900">{project.ownerName}</p>
              {project.ownerIsManual ? (
                <p className="mt-2 text-xs text-sky-700">Responsable fijado manualmente.</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Según valor por defecto del sync o scorecard.</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos del workflow</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Métricas y estado tal como están guardados ahora.
          </p>
          <div className={`${roBox} mt-6 space-y-6`}>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Identidad</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:justify-between">
                  <dt className={roLabel}>Nombre</dt>
                  <dd className="font-medium text-slate-900">{project.name}</dd>
                </div>
                <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:justify-between">
                  <dt className={roLabel}>Descripción</dt>
                  <dd className="max-w-xl text-right font-medium leading-relaxed text-slate-800">{project.description}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                  <dt className={roLabel}>Categoría</dt>
                  <dd className="font-medium text-slate-900">{project.category}</dd>
                </div>
              </dl>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className={roLabel}>Pasos del flujo</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{project.steps}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className={roLabel}>Complejidad (1–10)</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{project.complexity}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className={roLabel}>Valor negocio (1–10)</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{project.businessValue}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className={roLabel}>Tasa de fallo</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {project.failureRate != null ? `${project.failureRate.toFixed(2)}%` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className={roLabel}>Programación</p>
                <p className="mt-1 font-medium text-slate-900">{project.schedule}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 sm:col-span-2 lg:col-span-1">
                <p className={roLabel}>Progreso</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{project.progress}%</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, project.progress))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className={roLabel}>Estado (salud)</p>
                <p className="mt-1 font-semibold text-slate-900">{project.healthLabel}</p>
              </div>
              {project.platform ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className={roLabel}>Plataforma</p>
                  <p className="mt-1 font-medium text-slate-900">{project.platform}</p>
                </div>
              ) : null}
            </div>

            <div>
              <p className={roLabel}>Notas de riesgo</p>
              <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
                {project.riskNote?.trim() ? project.riskNote : "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tags e integraciones</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {project.technologies.map((t) => (
              <li key={t}>
                <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100/80">
                  {t}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-8 sm:py-10">
          <button
            type="button"
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
            aria-label="Cerrar edición"
            onClick={close}
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <h2 id={titleId} className="text-xl font-bold text-slate-900">
                Editar workflow
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={close}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Los cambios de fase y responsable se guardan al elegir otra opción. El resto de campos se guarda con{" "}
              <strong className="font-semibold text-slate-800">Guardar cambios</strong>.
            </p>

            <div className="mt-6 space-y-6">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Gestión</h3>
                <div className="mt-3 grid gap-5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 ring-1 ring-slate-100/80">
                    <h4 className="text-sm font-semibold text-slate-800">Fase</h4>
                    <div className="mt-4">
                      <ProjectPhasePicker
                        projectId={project.id}
                        phase={project.phase as ProjectPhase}
                        phaseIsManual={Boolean(project.phaseIsManual)}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 ring-1 ring-slate-100/80">
                    <h4 className="text-sm font-semibold text-slate-800">Responsable</h4>
                    <div className="mt-4">
                      <ProjectOwnerPicker
                        projectId={project.id}
                        ownerCode={project.ownerCode as OwnerCode}
                        ownerIsManual={Boolean(project.ownerIsManual)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos del workflow</h3>
                <div className="mt-3">
                  <ProjectDetailsForm project={project} onSaved={onFormSaved} />
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
