"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCanEdit } from "@/hooks/useCanEdit";
import { appendUserProject } from "@/lib/itProjectsLocalStore";
import { IT_PROJECT_PHASE_ORDER, phaseLabel } from "@/lib/itProjectPortfolio";
import type { ItProject, ItProjectPhase, ItProjectRisk, ItProjectUrgency } from "@/lib/itProjectTypes";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `itp-${crypto.randomUUID()}`;
  }
  return `itp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "-").slice(0, 32);
}

function parseTasksFromLines(raw: string): ItProject["plannedTasks"] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((title, idx) => ({ id: `task-${idx + 1}`, title }));
}

function parseKeyResultsFromLines(raw: string): ItProject["keyResults"] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((title, idx) => ({ id: `kr-${idx + 1}`, title }));
}

/** Cada línea: `Nombre sprint` o `Nombre | período` (período opcional). */
function parseSprintsFromLines(raw: string): ItProject["sprints"] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const pipe = line.indexOf("|");
      if (pipe === -1) {
        return { id: `spr-${idx + 1}`, title: line };
      }
      const title = line.slice(0, pipe).trim();
      const timeframe = line.slice(pipe + 1).trim();
      const safeTitle = title || line.replace(/\|.+$/, "").trim() || line;
      return {
        id: `spr-${idx + 1}`,
        title: safeTitle,
        ...(timeframe ? { timeframe } : {}),
      };
    });
}

/** Cada línea: `Entregable` o `Entregable | fecha` (fecha opcional). */
function parseDeliverablesFromLines(raw: string): ItProject["deliverables"] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const pipe = line.indexOf("|");
      if (pipe === -1) {
        return { id: `del-${idx + 1}`, title: line };
      }
      const title = line.slice(0, pipe).trim();
      const targetDate = line.slice(pipe + 1).trim();
      const safeTitle = title || line.replace(/\|.+$/, "").trim() || line;
      return {
        id: `del-${idx + 1}`,
        title: safeTitle,
        ...(targetDate ? { targetDate } : {}),
      };
    });
}


type FormError = Partial<Record<"code" | "name" | "dates", string>>;

export function CreateItProjectForm() {
  const canEdit = useCanEdit();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<ItProjectPhase>("sin_empezar");
  const [sponsor, setSponsor] = useState("");
  const [pmName, setPmName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [riskLevel, setRiskLevel] = useState<ItProjectRisk>("medio");
  const [urgencyLevel, setUrgencyLevel] = useState<ItProjectUrgency>("media");

  const [keyResultsDraft, setKeyResultsDraft] = useState("");
  const [plannedTasksDraft, setPlannedTasksDraft] = useState("");
  const [sprintsDraft, setSprintsDraft] = useState("");
  const [deliverablesDraft, setDeliverablesDraft] = useState("");

  const [errors, setErrors] = useState<FormError>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);



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
        milestones: [],
        keyResults: parseKeyResultsFromLines(keyResultsDraft),
        plannedTasks: parseTasksFromLines(plannedTasksDraft),
        sprints: parseSprintsFromLines(sprintsDraft),
        deliverables: parseDeliverablesFromLines(deliverablesDraft),
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

      <div className="space-y-4 border-t border-slate-100 pt-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Resultados clave (KR)</h3>
          <p className="mt-1 text-xs text-slate-500">
            Una línea por KR. En Notion suelen vivir en <strong>ITAI: kr de proyectos</strong>; aquí puedes anotarlos si
            trabajas solo en el navegador (opcional).
          </p>
          <textarea
            value={keyResultsDraft}
            onChange={(e) => setKeyResultsDraft(e.target.value)}
            rows={3}
            placeholder={"KR1: Reducir tiempo de ciclo de venta en 20%\nKR2: NPS post-implementación ≥ 40"}
            className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Tareas previstas del proyecto</h3>
          <p className="mt-1 text-xs text-slate-500">
            Una línea por tarea. Describe el trabajo que implica la iniciativa (opcional).
          </p>
          <textarea
            value={plannedTasksDraft}
            onChange={(e) => setPlannedTasksDraft(e.target.value)}
            rows={4}
            placeholder={"Definición de integraciones API\nPruebas de carga"}
            className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Sprints</h3>
          <p className="mt-1 text-xs text-slate-500">
            Una línea por sprint. Opcional: añade <span className="font-mono">|</span> y el período (p. ej.{" "}
            <span className="font-mono">Sprint MVP | 03/05 — 17/05</span>).
          </p>
          <textarea
            value={sprintsDraft}
            onChange={(e) => setSprintsDraft(e.target.value)}
            rows={3}
            placeholder="Sprint 1 — Alcance MVP | Semana 05–06"
            className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Entregables</h3>
          <p className="mt-1 text-xs text-slate-500">
            Resultados pactados con negocio. Opcional: <span className="font-mono">|</span> y fecha objetivo (
            <span className="font-mono">Manual de soporte | 2026-04-01</span>).
          </p>
          <textarea
            value={deliverablesDraft}
            onChange={(e) => setDeliverablesDraft(e.target.value)}
            rows={3}
            placeholder="Contrato técnico | 2026-06-01"
            className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          />
        </div>
      </div>

      {errors.dates ? <p className="text-xs text-rose-600">{errors.dates}</p> : null}
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
