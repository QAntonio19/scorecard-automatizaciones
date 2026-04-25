"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCanEdit } from "@/hooks/useCanEdit";
import { appendUserProject } from "@/lib/itProjectsLocalStore";
import { IT_PROJECT_PHASE_ORDER, phaseLabel } from "@/lib/itProjectPortfolio";
import { fetchProjectsList, isApiNotConfiguredError } from "@/lib/projectsApi";
import type { ItProject, ItProjectPhase, ItProjectRisk, ItProjectUrgency } from "@/lib/itProjectTypes";
import type { ProjectRecord } from "@/lib/projectTypes";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `itp-${crypto.randomUUID()}`;
  }
  return `itp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 32);
}


type FormError = Partial<Record<"code" | "name" | "dates", string>>;

export function CreateItProjectForm() {
  const canEdit = useCanEdit();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<ItProjectPhase>("estrategia");
  const [sponsor, setSponsor] = useState("");
  const [pmName, setPmName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [riskLevel, setRiskLevel] = useState<ItProjectRisk>("medio");
  const [urgencyLevel, setUrgencyLevel] = useState<ItProjectUrgency>("media");

  // Catálogo de workflows para el selector
  const [catalog, setCatalog] = useState<ProjectRecord[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [pickId, setPickId] = useState("");
  const [manualId, setManualId] = useState("");
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormError>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { items } = await fetchProjectsList({});
        if (!cancelled) { setCatalog(items); setCatalogError(null); }
      } catch (e) {
        if (!cancelled) {
          setCatalogError(
            isApiNotConfiguredError(e)
              ? "Sin API configurada. Usa la opción por ID."
              : e instanceof Error ? e.message : "No se pudo cargar el catálogo.",
          );
        }
      } finally {
        if (!cancelled) setCatalogLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const nameById = useMemo(() => new Map(catalog.map((w) => [w.id, w.name])), [catalog]);

  const availableInCatalog = useMemo(() => {
    const linked = new Set(linkedIds);
    return catalog.filter((w) => !linked.has(w.id)).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [catalog, linkedIds]);

  const addPicked = () => {
    if (!pickId) return;
    setLinkedIds((prev) => [...prev, pickId]);
    setPickId("");
  };

  const addManual = () => {
    const id = manualId.trim();
    if (!id || linkedIds.includes(id)) { setManualId(""); return; }
    setLinkedIds((prev) => [...prev, id]);
    setManualId("");
  };

  const removeLinked = (id: string) => setLinkedIds((prev) => prev.filter((x) => x !== id));

  const validate = (): boolean => {
    const next: FormError = {};
    const c = normalizeCode(code);
    if (c.length < 2) next.code = "Indica un código de al menos 2 caracteres.";
    if (!name.trim()) next.name = "El nombre es obligatorio.";
    if (startDate && targetEndDate && targetEndDate < startDate) {
      next.dates = "La fecha de fin debe ser posterior al inicio.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!canEdit) {
      setSubmitError("No tienes permisos para crear proyectos.");
      return;
    }
    if (!validate()) return;

    setPending(true);
    try {
      const c = normalizeCode(code);
      const project: ItProject = {
        id: newId(),
        code: c,
        name: name.trim(),
        description: description.trim() || "—",
        phase,
        sponsor: sponsor.trim() || "—",
        pmName: pmName.trim() || "—",
        startDate: startDate || "—",
        targetEndDate: targetEndDate || "—",
        riskLevel,
        urgencyLevel,
        linkedWorkflowIds: linkedIds,
        milestones: [],
      };
      appendUserProject(project);
      router.push(`/proyectos/${encodeURIComponent(project.id)}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo guardar el proyecto.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900">Datos del proyecto</h2>
        <p className="mt-1 text-sm text-slate-600">
          Los proyectos nuevos se guardan en este navegador hasta que exista una API y base de datos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label htmlFor="itp-code" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Código <span className="text-rose-600">*</span>
          </label>
          <input
            id="itp-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="p. ej. CRM-2026"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
            autoComplete="off"
          />
          {errors.code ? <p className="mt-1 text-xs text-rose-600">{errors.code}</p> : null}
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="itp-risk" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Nivel de riesgo
          </label>
          <select
            id="itp-risk"
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as ItProjectRisk)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          >
            <option value="bajo">Bajo</option>
            <option value="medio">Medio</option>
            <option value="alto">Alto</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label htmlFor="itp-urgency" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Nivel de urgencia
          </label>
          <select
            id="itp-urgency"
            value={urgencyLevel}
            onChange={(e) => setUrgencyLevel(e.target.value as ItProjectUrgency)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="itp-name" className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Nombre <span className="text-rose-600">*</span>
        </label>
        <input
          id="itp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del programa o iniciativa"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
        />
        {errors.name ? <p className="mt-1 text-xs text-rose-600">{errors.name}</p> : null}
      </div>

      <div>
        <label htmlFor="itp-desc" className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Descripción
        </label>
        <textarea
          id="itp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Alcance, objetivos, contexto…"
          className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="itp-phase" className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Fase de progreso
        </label>
        <select
          id="itp-phase"
          value={phase}
          onChange={(e) => setPhase(e.target.value as ItProjectPhase)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
        >
          {IT_PROJECT_PHASE_ORDER.map((ph) => (
            <option key={ph} value={ph}>
              {phaseLabel(ph)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="itp-sponsor" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Sponsor / área
          </label>
          <input
            id="itp-sponsor"
            value={sponsor}
            onChange={(e) => setSponsor(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="itp-pm" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Responsable (PM)
          </label>
          <input
            id="itp-pm"
            value={pmName}
            onChange={(e) => setPmName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="itp-start" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Inicio
          </label>
          <input
            id="itp-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="itp-end" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Fin objetivo
          </label>
          <input
            id="itp-end"
            type="date"
            value={targetEndDate}
            onChange={(e) => setTargetEndDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          />
        </div>
      </div>
      {errors.dates ? <p className="text-xs text-rose-600">{errors.dates}</p> : null}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Workflows relacionados <span className="font-normal normal-case text-slate-400">(opcional)</span>
        </p>

        {catalogLoaded && catalogError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {catalogError}
          </p>
        ) : null}

        {/* Lista de seleccionados */}
        {linkedIds.length > 0 ? (
          <ul className="space-y-1.5">
            {linkedIds.map((wid) => (
              <li
                key={wid}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{nameById.get(wid) ?? wid}</p>
                  {nameById.has(wid) ? (
                    <p className="font-mono text-[10px] text-slate-400">{wid}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeLinked(wid)}
                  className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-800"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">Ningún workflow añadido aún.</p>
        )}

        {/* Selector del catálogo */}
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Añadir desde el scorecard
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[min(100%,16rem)] flex-1">
              <select
                value={pickId}
                onChange={(e) => setPickId(e.target.value)}
                disabled={!catalogLoaded || availableInCatalog.length === 0}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:ring-2 disabled:opacity-50"
              >
                <option value="">
                  {!catalogLoaded
                    ? "Cargando catálogo…"
                    : availableInCatalog.length === 0
                      ? "No hay más workflows para añadir"
                      : "Selecciona un workflow…"}
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
        </div>

        {/* Añadir por ID manual */}
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Añadir por ID
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }}
              placeholder="ID del workflow (ej. n8n-abc123)"
              className="min-w-[min(100%,18rem)] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none ring-sky-500/30 focus:ring-2"
            />
            <button
              type="button"
              onClick={addManual}
              disabled={!manualId.trim()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Añadir ID
            </button>
          </div>
        </div>
      </div>

      {submitError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Link
          href="/proyectos"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending || !canEdit}
          title={!canEdit ? "No tienes permisos de edición" : undefined}
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Guardando…" : "Crear proyecto"}
        </button>
      </div>
    </form>
  );
}
