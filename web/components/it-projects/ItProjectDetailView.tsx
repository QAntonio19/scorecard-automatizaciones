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
      <div className="mt-12 rounded-xl border border-rose-100 bg-rose-50/40 px-5 py-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-rose-800/80">Zona de riesgo</h2>
        <p className="mt-2 text-sm text-slate-600">
          {isNotion ? (
            <>
              Al confirmar se quita del portafolio y Notion mueve la página a la{" "}
              <strong className="font-semibold text-slate-800">papelera</strong>. La API pública de Notion no ofrece borrado
              definitivo automático: para eliminarla por completo hay que vaciar la papelera (o borrar la página) desde la
              aplicación o web de Notion.
            </>
          ) : (
            "Es un borrado permanente en este navegador: se eliminan los datos guardados aquí."
          )}
        </p>
        {feedback && !modalOpen ? (
          <p className="mt-2 text-sm text-rose-700" role="alert">
            {feedback}
          </p>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setFeedback(null);
            setModalOpen(true);
          }}
          className="mt-3 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Procesando…" : isNotion ? "Eliminar proyecto (papelera en Notion)" : "Eliminar del navegador"}
        </button>
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
          className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm font-medium text-indigo-800 transition hover:bg-indigo-50 hover:text-indigo-950"
        >
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
          Volver a proyectos
        </Link>
        {canEdit === true ? (
          <Link
            href={`/proyectos/${encodeURIComponent(p.id)}/edit`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-sky-700 hover:ring-sky-200 hover:shadow"
          >
            Editar
          </Link>
        ) : null}
      </div>

      <header
        className={`relative mt-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/30 to-slate-50/80 px-6 py-8 shadow-sm sm:px-8 sm:py-10 ${riskBarClass(
          p.riskLevel,
        )}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3">
              <p className="font-mono text-xs font-bold text-indigo-700">{p.code}</p>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${phaseBadgeClass(p.phase)}`}>
                {phaseLabel(p.phase)}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{p.name}</h1>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex flex-wrap justify-end gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${riskBadgeClass(p.riskLevel)}`}>
                Riesgo: {riskLabel(p.riskLevel)}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${urgencyBadgeClass(p.urgencyLevel)}`}>
                Urgencia: {urgencyLabel(p.urgencyLevel)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap justify-end gap-2">
              {isLikelyNotionPageId(p.id) ? (
                <a
                  href={`https://notion.so/${p.id.replace(/-/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-indigo-600 hover:ring-indigo-200 hover:shadow"
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
      </header>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Descripción del proyecto</h2>
        <div className="mt-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
          {p.description.trim() === "" || p.description === "—" ? (
            <p className="text-slate-500">Sin descripción.</p>
          ) : (
            p.description
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Generalidades</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Responsable</dt>
              <dd className="font-medium text-slate-900">{p.pmName}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Inicio</dt>
              <dd className="font-medium text-slate-900 capitalize">
                {new Date(p.startDate).toLocaleDateString("es-MX", { month: "long" }).replace(/^./, c => c.toUpperCase()) + " " + new Date(p.startDate).getFullYear()}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Fin objetivo</dt>
              <dd className="font-medium text-slate-900 capitalize">
                {new Date(p.targetEndDate).toLocaleDateString("es-MX", { month: "long" }).replace(/^./, c => c.toUpperCase()) + " " + new Date(p.startDate).getFullYear()}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Progreso actual del proyecto</h2>
          {scopeProgress.total === 0 ? (
            <>
              <p className="mt-2 text-sm text-slate-600">
                Aún no hay <strong>KR</strong>, <strong>tareas</strong> ni <strong>sprints</strong> vinculados para calcular avance en
                esta vista.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Cuando existan ítems, el porcentaje promedia KR + tareas + sprints marcados como hechos si el texto empieza con{" "}
                <span className="font-mono">[x]</span>, emoji de check o etiquetas tipo <strong>Hecho:</strong>.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600">
                {scopeProgress.completed} de {scopeProgress.total} elementos (KR + tareas + sprints) considerados{" "}
                <strong className="font-medium text-slate-800">completados</strong> ({scopeProgress.percent}%).
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Completados detectados desde el texto del ítem (p. ej. <span className="font-mono">[x]</span>,{" "}
                <span className="font-mono">✅</span>) en Notion o en proyectos sólo navegador.
              </p>
            </>
          )}
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={scopeBarPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de alcance del proyecto"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${scopeBarFill}`}
              style={{ width: `${scopeBarPct}%` }}
            />
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Planeación de alcance</h2>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex min-h-0 flex-col rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Resultados clave (KR)</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Objetivos medibles del proyecto, enlazados desde Notion (propiedad <span className="font-mono">KR</span>).
            </p>
            {p.keyResults.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Sin KRs vinculados. En Notion, enlaza filas de <strong>ITAI: kr de proyectos</strong> en la columna KR del
                proyecto.
              </p>
            ) : (
              <div
                className="mt-4 max-h-[min(22rem,50vh)] overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]"
                role="region"
                aria-label="Lista de resultados clave"
              >
                <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-800">
                  {p.keyResults.map((kr) => (
                    <li key={kr.id} className="leading-snug marker:font-semibold marker:text-amber-700">
                      {kr.title}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Tareas</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Trabajo planificado ligado al proyecto. Si viene de Notion con relación sprint, se muestra el nombre aquí.
            </p>
            {p.plannedTasks.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No hay tareas vinculadas. En Notion enlaza las filas de tu base de tareas desde la página del proyecto.
              </p>
            ) : (
              <div
                className="mt-4 max-h-[min(22rem,50vh)] overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]"
                role="region"
                aria-label="Lista de tareas"
              >
                <ul className="space-y-2">
                  {p.plannedTasks.map((t) => {
                    const sid = typeof t.sprintId === "string" ? t.sprintId.trim() : "";
                    const sprintResolved = sid ? p.sprints.find((s) => s.id === sid) : undefined;
                    const sprintHeadline = (t.sprintTitle ?? sprintResolved?.title ?? "").trim();
                    const sprintBoardHref =
                      sprintResolved !== undefined
                        ? `/proyectos/${encodeURIComponent(p.id)}/sprints/${encodeURIComponent(sprintResolved.id)}`
                        : null;

                    return (
                      <li key={t.id} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                        <span className="text-sm font-medium text-slate-900">{t.title}</span>
                        {t.description?.trim() ? (
                          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                            {t.description.trim()}
                          </p>
                        ) : null}
                        {sprintHeadline ? (
                          <p className="mt-1 text-xs text-violet-900/95">
                            <span className="font-semibold text-slate-600">Sprint: </span>
                            {sprintBoardHref ? (
                              <Link
                                href={sprintBoardHref}
                                className="font-medium text-violet-800 underline-offset-2 hover:underline"
                              >
                                {sprintHeadline}
                              </Link>
                            ) : (
                              sprintHeadline
                            )}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Sprints</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Ventanas de iteración planeadas sobre el proyecto.
            </p>
            {p.sprints.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No hay sprints definidos.</p>
            ) : (
              <div
                className="mt-4 max-h-[min(22rem,50vh)] overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]"
                role="region"
                aria-label="Lista de sprints"
              >
                <ul className="space-y-3">
                  {p.sprints.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/proyectos/${encodeURIComponent(p.id)}/sprints/${encodeURIComponent(s.id)}`}
                        className="block rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2.5 transition hover:border-violet-200 hover:bg-violet-50/70"
                      >
                        <span className="text-sm font-medium text-slate-900">{s.title}</span>
                        <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                          Ver tablero
                        </span>
                        {s.timeframe ? (
                          <p className="mt-0.5 font-mono text-xs text-violet-800/90">{s.timeframe}</p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
