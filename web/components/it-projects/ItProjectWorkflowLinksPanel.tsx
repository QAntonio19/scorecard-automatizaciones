"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCanEdit } from "@/hooks/useCanEdit";
import {
  clearProjectWorkflowLinksOverride,
  readWorkflowLinkOverrides,
  setProjectWorkflowLinks,
} from "@/lib/itProjectWorkflowLinksStore";
import { fetchProjectsList, isApiNotConfiguredError } from "@/lib/projectsApi";
import type { ItProject } from "@/lib/itProjectTypes";
import type { ProjectRecord } from "@/lib/projectTypes";

type Props = {
  project: ItProject;
};

export function ItProjectWorkflowLinksPanel({ project }: Props) {
  const canEdit = useCanEdit() ?? false;
  const [catalog, setCatalog] = useState<ProjectRecord[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pickId, setPickId] = useState("");
  const [manualId, setManualId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchProjectsList({});
        if (!cancelled) {
          setCatalog(items);
          setCatalogError(null);
        }
      } catch (e) {
        if (!cancelled) {
          if (isApiNotConfiguredError(e)) {
            setCatalogError(
              "No hay API de workflows configurada en este entorno. Puedes enlazar por ID manual.",
            );
          } else {
            setCatalogError(
              e instanceof Error ? e.message : "No se pudo cargar el listado de workflows.",
            );
          }
        }
      } finally {
        if (!cancelled) setCatalogLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nameById = useMemo(() => new Map(catalog.map((w) => [w.id, w.name])), [catalog]);

  const [hasOverride, setHasOverride] = useState(false);
  useEffect(() => {
    setHasOverride(project.id in readWorkflowLinkOverrides());
  }, [project.id, project.linkedWorkflowIds]);

  const linkedIds = project.linkedWorkflowIds;

  const availableInCatalog = useMemo(() => {
    const setLinked = new Set(linkedIds);
    return catalog
      .filter((w) => !setLinked.has(w.id))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [catalog, linkedIds]);

  const persist = (ids: string[]) => {
    setProjectWorkflowLinks(project.id, ids);
  };

  const remove = (workflowId: string) => {
    persist(linkedIds.filter((x) => x !== workflowId));
  };

  const addPicked = () => {
    if (!pickId) return;
    persist([...linkedIds, pickId]);
    setPickId("");
  };

  const addManual = () => {
    const id = manualId.trim();
    if (!id) return;
    if (linkedIds.includes(id)) {
      setManualId("");
      return;
    }
    persist([...linkedIds, id]);
    setManualId("");
  };

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Workflows vinculados</h2>
      <p className="mt-1 text-sm text-slate-600">
        Relaciona esta iniciativa con filas del scorecard en{" "}
        <Link className="font-medium text-sky-700 hover:underline" href="/workflows">
          Workflows
        </Link>
        . Los cambios se guardan en este navegador; con API de proyectos podrán persistir en servidor.
      </p>

      {catalogLoaded && catalogError ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {catalogError}
        </p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {linkedIds.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
            Ningún workflow vinculado. Añade uno desde el catálogo o por ID.
          </li>
        ) : (
          linkedIds.map((wid) => (
            <li
              key={wid}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {nameById.get(wid) ?? wid}
                </p>
                <p className="font-mono text-[11px] text-slate-500">{wid}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/workflows/${encodeURIComponent(wid)}`}
                  className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-900 ring-1 ring-sky-100 hover:bg-sky-100"
                >
                  Abrir
                </Link>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => remove(wid)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-900"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>

      {canEdit ? <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Añadir desde el scorecard</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[min(100%,16rem)] flex-1">
            <label htmlFor="wf-pick" className="sr-only">
              Elegir workflow
            </label>
            <select
              id="wf-pick"
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
              disabled={!catalogLoaded || availableInCatalog.length === 0}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:ring-2 disabled:opacity-50"
            >
              <option value="">
                {catalogLoaded
                  ? availableInCatalog.length === 0
                    ? "No hay más workflows para añadir"
                    : "Selecciona un workflow…"
                  : "Cargando catálogo…"}
              </option>
              {availableInCatalog.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addPicked}
            disabled={!pickId}
            className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-800 disabled:opacity-50"
          >
            Añadir
          </button>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Añadir por ID</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="ID del workflow (mismo que en /workflows/[id])"
              className="min-w-[min(100%,18rem)] flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
            />
            <button
              type="button"
              onClick={addManual}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Añadir ID
            </button>
          </div>
        </div>

        {hasOverride ? (
          <button
            type="button"
            onClick={() => clearProjectWorkflowLinksOverride(project.id)}
            className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Restaurar vínculos por defecto del registro
          </button>
        ) : null}
      </div> : null}
    </section>
  );
}
