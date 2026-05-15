"use client";

import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useCanEdit } from "@/hooks/useCanEdit";
import { useResolvedItProject } from "@/hooks/useResolvedItProject";
import {
  invalidateNotionProjectsCache,
  removeUserProject,
} from "@/lib/itProjectsLocalStore";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";
import { phaseLabel, riskLabel, urgencyLabel, urgencyBadgeClass } from "@/lib/itProjectPortfolio";
import {
  computeProjectScopeProgress,
  projectScopeProgressFillClass,
  inferScopeItemCompletedFromTitle,
  resolvedSprintTaskKanbanColumn,
} from "@/lib/itProjectScopeProgress";
import type { ItProject } from "@/lib/itProjectTypes";

function riskBarClass(risk: "bajo" | "medio" | "alto"): string {
  if (risk === "alto") return "border-l-4 border-l-rose-500";
  if (risk === "medio") return "border-l-4 border-l-amber-400";
  return "border-l-4 border-l-emerald-500";
}

function phaseBadgeClass(phase: ItProject["phase"]): string {
  const map: Record<ItProject["phase"], string> = {
    backlog: "bg-slate-100 text-slate-700 ring-slate-200",
    sin_empezar: "bg-slate-100 text-slate-700 ring-slate-200",
    planificacion: "bg-amber-100 text-amber-800 ring-amber-200",
    ejecucion: "bg-sky-100 text-sky-800 ring-sky-200",
    cierre: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    archivado: "bg-slate-200 text-slate-700 ring-slate-300",
  };
  return map[phase];
}

function riskBadgeClass(risk: ItProject["riskLevel"]): string {
  const map: Record<ItProject["riskLevel"], string> = {
    bajo: "bg-blue-100 text-blue-800 ring-blue-200",
    medio: "bg-amber-100 text-amber-800 ring-amber-200",
    alto: "bg-red-100 text-red-800 ring-red-200",
  };
  return map[risk];
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-slate-100" />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

function ItProjectDeleteActions({ project }: { project: ItProject }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isNotion = isLikelyNotionPageId(project.id);
  const nameMatches = confirmName === project.name;

  useEffect(() => {
    if (!modalOpen) setConfirmName("");
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modalOpen]);

  const runDelete = async () => {
    if (!nameMatches || pending) return;
    setFeedback(null);
    setPending(true);
    try {
      if (isNotion) {
        const res = await fetch(`/api/notion/projects/${encodeURIComponent(project.id)}`, {
          method: "DELETE",
          cache: "no-store",
        });
        let data: unknown = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }
        if (!res.ok) {
          const msg =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof (data as { error: unknown }).error === "string"
              ? (data as { error: string }).error
              : "No se pudo eliminar el proyecto en Notion.";
          throw new Error(msg);
        }
        removeUserProject(project.id);
      } else {
        removeUserProject(project.id);
      }
      invalidateNotionProjectsCache();
      setModalOpen(false);
      router.push("/proyectos");
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "No se pudo completar la operación.");
    } finally {
      setPending(false);
    }
  };

  if (canEdit === null || canEdit === false) {
    return null;
  }

  return (
    <>
      <div className="mt-12 overflow-hidden rounded-2xl border border-rose-200/60 bg-gradient-to-r from-rose-50/50 to-white shadow-sm transition-shadow hover:shadow-md">
        <div className="px-6 py-5 border-b border-rose-100/50">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-rose-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Zona de riesgo
          </h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            {isNotion ? (
              <>
                Al confirmar se quita del portafolio y Notion mueve la página a la{" "}
                <strong className="font-semibold text-rose-900">papelera</strong>. La API pública de Notion no ofrece borrado
                definitivo automático: para eliminarla por completo hay que vaciar la papelera (o borrar la página) desde la
                aplicación o web de Notion.
              </>
            ) : (
              "Es un borrado permanente en este navegador: se eliminan los datos guardados aquí."
            )}
          </p>
          {feedback && !modalOpen ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-start gap-2" role="alert">
               <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               {feedback}
            </div>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setFeedback(null);
              setModalOpen(true);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-5 py-2.5 text-sm font-bold text-rose-700 shadow-sm transition-all hover:bg-rose-50 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {pending ? "Procesando…" : isNotion ? "Eliminar proyecto (papelera en Notion)" : "Eliminar del navegador"}
          </button>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Cerrar sin eliminar"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            onClick={() => {
              setModalOpen(false);
              setFeedback(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-modal-title"
            className="relative w-full max-w-md rounded-2xl border border-rose-200 bg-white shadow-2xl"
          >
            <div className="border-b border-rose-100 px-5 py-4">
              <h2 id="delete-project-modal-title" className="text-lg font-bold text-rose-900">
                ¿Eliminar este proyecto?
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {isNotion
                  ? "El proyecto pasará a la papelera en Notion. Para borrarlo del todo desde Notion usa la papelera en la aplicación."
                  : "Se borrarán los datos locales de este proyecto. Esta acción no se puede deshacer aquí."}
              </p>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Para confirmar, escribe el nombre exacto del proyecto
              </p>
              <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm font-medium text-slate-900 ring-1 ring-slate-200">
                {project.name}
              </p>
              <label htmlFor="delete-project-name-confirm" className="sr-only">
                Confirmar nombre del proyecto
              </label>
              <input
                id="delete-project-name-confirm"
                type="text"
                value={confirmName}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder="Nombre del proyecto"
                onChange={(e) => setConfirmName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm outline-none ring-slate-900/10 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
              />
              {confirmName.length > 0 && !nameMatches ? (
                <p className="text-xs font-medium text-rose-700">Tiene que coincidir por completo con el nombre de arriba.</p>
              ) : null}
              {feedback && modalOpen ? (
                <p className="text-sm text-rose-700" role="alert">
                  {feedback}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setModalOpen(false);
                  setFeedback(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending || !nameMatches}
                onClick={() => void runDelete()}
                className="rounded-lg border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Eliminando…" : "Confirmar eliminación"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ItProjectDetailBody({ p, soloNavegador }: { p: ItProject; soloNavegador: boolean }) {
  const canEdit = useCanEdit();
  const scopeProgress = computeProjectScopeProgress(p);
  const scopeBarPct = scopeProgress.total === 0 ? 0 : scopeProgress.percent;
  const scopeBarFill =
    scopeProgress.total === 0 ? "bg-slate-400" : projectScopeProgressFillClass(scopeProgress.percent);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {soloNavegador ? (
        <p
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Este proyecto se guardó solo en este navegador (Notion no estaba configurado en el servidor al crearlo).
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 gap-y-2">
        <Link
          href="/proyectos"
          className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <span aria-hidden className="text-lg leading-none mt-[-2px]">
            ←
          </span>
          Volver a proyectos
        </Link>
        {canEdit === true ? (
          <Link
            href={`/proyectos/${encodeURIComponent(p.id)}/edit`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-sky-700 hover:ring-sky-200 hover:shadow"
          >
            Editar
          </Link>
        ) : null}
      </div>

      <header
        className={`relative mt-6 overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/40 to-slate-50/90 px-6 py-8 shadow-sm sm:px-8 sm:py-10 ${riskBarClass(
          p.riskLevel,
        )}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-6 relative z-10">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 animate-fade-in">
              <p className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{p.code}</p>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset shadow-sm transition hover:scale-105 ${phaseBadgeClass(p.phase)}`}>
                {phaseLabel(p.phase)}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl animate-fade-in" style={{animationDelay: '100ms'}}>{p.name}</h1>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0 animate-fade-in" style={{animationDelay: '200ms'}}>
            <div className="flex flex-wrap justify-end gap-2">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 ring-inset shadow-sm transition hover:scale-105 ${riskBadgeClass(p.riskLevel)}`}>
                Riesgo: {riskLabel(p.riskLevel)}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 ring-inset shadow-sm transition hover:scale-105 ${urgencyBadgeClass(p.urgencyLevel)}`}>
                Urgencia: {urgencyLabel(p.urgencyLevel)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              {isLikelyNotionPageId(p.id) ? (
                <a
                  href={`https://notion.so/${p.id.replace(/-/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur-sm px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200/50 transition-all hover:bg-white hover:text-indigo-600 hover:ring-indigo-300 hover:shadow-md hover:-translate-y-0.5"
                  title="Abrir proyecto en Notion"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Abrir en Notion
                </a>
              ) : null}
            </div>
          </div>
        </div>
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" aria-hidden="true" />
      </header>

      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
        <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
          Descripción del proyecto
        </h2>
        <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
          {p.description.trim() === "" || p.description === "—" ? (
            <p className="text-slate-400 italic">Sin descripción.</p>
          ) : (
            p.description
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Generalidades
          </h2>
          <dl className="space-y-4 text-sm mt-5">
            <div className="flex justify-between items-center gap-4 border-b border-slate-50 pb-3">
              <dt className="text-slate-500 font-medium">Mes / Año</dt>
              <dd className="font-semibold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                {p.month || "—"} {p.year ? `/ ${p.year}` : ""}
              </dd>
            </div>
            <div className="flex justify-between items-center gap-4 border-b border-slate-50 pb-3">
              <dt className="text-slate-500 font-medium">Responsable</dt>
              <dd className="font-semibold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{p.pmName}</dd>
            </div>
            <div className="flex justify-between items-center gap-4 border-b border-slate-50 pb-3">
              <dt className="text-slate-500 font-medium">Inicio</dt>
              <dd className="font-semibold text-slate-900 capitalize">
                {new Date(p.startDate).toLocaleDateString("es-MX", { month: "short", year: "numeric" }).replace(/^./, c => c.toUpperCase())}
              </dd>
            </div>
            <div className="flex justify-between items-center gap-4">
              <dt className="text-slate-500 font-medium">Fin objetivo</dt>
              <dd className="font-semibold text-slate-900 capitalize">
                {new Date(p.targetEndDate).toLocaleDateString("es-MX", { month: "short", year: "numeric" }).replace(/^./, c => c.toUpperCase())}
              </dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div>
            <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Progreso actual
            </h2>
            {scopeProgress.total === 0 ? (
              <p className="mt-4 text-sm text-slate-500 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                Aún no hay KR, tareas ni sprints vinculados para calcular avance.
              </p>
            ) : (
              <div className="flex items-end justify-between gap-4 mb-2 mt-4">
                <div className="text-sm text-slate-600">
                  <span className="font-bold text-slate-900 text-xl">{scopeProgress.completed}</span> de {scopeProgress.total} ítems completados
                </div>
                <div className="text-3xl font-black text-slate-800 tracking-tighter">{scopeProgress.percent}%</div>
              </div>
            )}
          </div>
          <div className="mt-8">
            <div
              className="h-3 overflow-hidden rounded-full bg-slate-100 border border-slate-200/50 shadow-inner"
              role="progressbar"
              aria-valuenow={scopeBarPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de alcance del proyecto"
            >
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${scopeBarFill} shadow-sm`}
                style={{ width: `${scopeBarPct}%` }}
              />
            </div>
            {scopeProgress.total > 0 && (
               <p className="mt-3 text-[11px] text-slate-400 font-medium">
                 Basado en el texto de ítems (KR, tareas, sprints) desde Notion.
               </p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          Planeación de alcance
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
          <div className="flex flex-col rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white shadow-sm transition-all hover:shadow-md hover:border-amber-300/80">
            <div className="p-5 border-b border-amber-100/50">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-200/50 text-amber-700">🎯</span>
                Resultados clave (KR)
              </h3>
              <p className="mt-2 text-[11px] leading-relaxed text-amber-700/80">Objetivos medibles (propiedad <span className="font-mono">KR</span>).</p>
            </div>
            <div className="p-5 flex-1 bg-white/50 rounded-b-2xl">
              {p.keyResults.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Sin KRs vinculados.</p>
              ) : (
                <ol className="list-decimal space-y-3 pl-4 text-sm text-slate-700">
                  {p.keyResults.map((kr) => {
                    const isDone = inferScopeItemCompletedFromTitle(kr.title);
                    return (
                      <li key={kr.id} className={`leading-snug marker:font-bold ${isDone ? 'marker:text-emerald-500' : 'marker:text-amber-500'} pl-1`}>
                        {isDone ? <span className="mr-1 inline-block" aria-hidden="true">✅</span> : null}
                        <span className={isDone ? "line-through text-slate-400" : ""}>{kr.title}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-white shadow-sm transition-all hover:shadow-md hover:border-violet-300/80">
             <div className="p-5 border-b border-violet-100/50">
              <h3 className="text-sm font-bold text-violet-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-200/50 text-violet-700">🔄</span>
                Sprints
              </h3>
              <p className="mt-2 text-[11px] leading-relaxed text-violet-700/80">Iteraciones sobre el proyecto.</p>
            </div>
            <div className="p-5 flex-1 bg-white/50 rounded-b-2xl">
              {p.sprints.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No hay sprints definidos.</p>
              ) : (
                <ul className="space-y-3">
                  {p.sprints.map((s) => {
                    let isDone = inferScopeItemCompletedFromTitle(s.title);
                    if (!isDone) {
                      const sprintTasks = p.plannedTasks.filter(t => t.sprintId === s.id);
                      isDone = sprintTasks.length > 0 && sprintTasks.every(t => 
                        resolvedSprintTaskKanbanColumn(t) === "hecho" || inferScopeItemCompletedFromTitle(t.title)
                      );
                    }
                    return (
                    <li key={s.id}>
                      <Link
                        href={`/proyectos/${encodeURIComponent(p.id)}/sprints/${encodeURIComponent(s.id)}`}
                        className={`group flex flex-col rounded-xl border ${isDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-white'} px-4 py-3 shadow-sm transition-all hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-bold flex items-center gap-2 transition-colors ${isDone ? 'text-emerald-800 group-hover:text-emerald-900' : 'text-slate-800 group-hover:text-violet-700'}`}>
                            {isDone ? <span aria-hidden="true">✅</span> : null}
                            <span className={isDone ? "line-through opacity-75" : ""}>{s.title}</span>
                          </span>
                          <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-200/50 group-hover:bg-violet-100">
                            Tablero
                          </span>
                        </div>
                        {s.timeframe ? (
                          <p className="mt-2 font-mono text-[11px] font-medium text-slate-500">{s.timeframe}</p>
                        ) : null}
                      </Link>
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Tareas (Ocultas temporalmente a petición del usuario) */}
          {false && (
            <div className="lg:col-span-2 flex flex-col rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-white shadow-sm transition-all hover:shadow-md hover:border-blue-300/80">
              <div className="p-5 border-b border-blue-100/50">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-200/50 text-blue-700">📝</span>
                  Tareas
                </h3>
                <p className="mt-2 text-[11px] leading-relaxed text-blue-700/80">Trabajo planificado y asociado.</p>
              </div>
              <div className="p-5 flex-1 bg-white/50 rounded-b-2xl">
                {p.plannedTasks.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No hay tareas vinculadas.</p>
                ) : (
                  <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                    {p.plannedTasks.map((t) => {
                      const sid = typeof t.sprintId === "string" ? t.sprintId.trim() : "";
                      const sprintResolved = sid ? p.sprints.find((s) => s.id === sid) : undefined;
                      const sprintHeadline = (t.sprintTitle ?? sprintResolved?.title ?? "").trim();
                      const sprintBoardHref = sprintResolved !== undefined ? `/proyectos/${encodeURIComponent(p.id)}/sprints/${encodeURIComponent(sprintResolved.id)}` : null;
                      const isDone = resolvedSprintTaskKanbanColumn(t) === "hecho" || inferScopeItemCompletedFromTitle(t.title);
                      const notionTaskUrl = isLikelyNotionPageId(t.id) ? `https://www.notion.so/${t.id.replace(/-/g, "")}` : null;
                      const targetHref = sprintBoardHref || notionTaskUrl;
                      const isInternalLink = !!sprintBoardHref;

                      const cardContent = (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-sm font-semibold flex items-start gap-2 ${isDone ? 'text-emerald-800' : 'text-slate-800 group-hover:text-blue-700 transition-colors'}`}>
                              {isDone ? <span aria-hidden="true" className="shrink-0 mt-0.5">✅</span> : null}
                              <span className={isDone ? "line-through opacity-75" : ""}>{t.title}</span>
                            </span>
                            {targetHref && !isInternalLink && (
                              <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-slate-100 p-1.5 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors" title="Abrir en Notion">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </span>
                            )}
                          </div>
                          {t.description?.trim() ? (
                            <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-500 line-clamp-3">
                              {t.description.trim()}
                            </p>
                          ) : null}
                          <div className="mt-auto pt-3">
                            {sprintHeadline ? (
                              <div className="pt-2 border-t border-slate-100/50 flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sprint</span>
                                  <span className="text-[11px] font-medium text-slate-600 group-hover:text-violet-700 transition-colors">{sprintHeadline}</span>
                                </div>
                                {isInternalLink && (
                                  <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-200/50 group-hover:bg-violet-100 transition-colors">
                                    Tablero
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </>
                      );

                      return (
                        <li key={t.id} className="flex">
                          {targetHref ? (
                            isInternalLink ? (
                              <Link href={targetHref} className={`group flex flex-col flex-1 rounded-xl border ${isDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-white'} px-4 py-3 shadow-sm transition hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5`}>
                                {cardContent}
                              </Link>
                            ) : (
                              <a href={targetHref} target="_blank" rel="noopener noreferrer" className={`group flex flex-col flex-1 rounded-xl border ${isDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-white'} px-4 py-3 shadow-sm transition hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5`}>
                                {cardContent}
                              </a>
                            )
                          ) : (
                            <div className={`flex flex-col flex-1 rounded-xl border ${isDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-white'} px-4 py-3 shadow-sm transition hover:border-blue-200`}>
                              {cardContent}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}


        </div>
      </section>

      <ItProjectDeleteActions project={p} />
    </div>
  );
}

type Props = { id: string };

export function ItProjectDetailView({ id }: Props) {
  const searchParams = useSearchParams();
  const soloNavegador = searchParams.get("soloNavegador") === "1";

  const { loading, project: p } = useResolvedItProject(id);

  if (loading) {
    return <DetailSkeleton />;
  }
  if (!p) {
    notFound();
  }
  return <ItProjectDetailBody p={p} soloNavegador={soloNavegador} />;
}
