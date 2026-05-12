"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FormStyledDateField } from "@/components/ui/FormStyledDateField";
import { FormStyledMultiSelect } from "@/components/ui/FormStyledMultiSelect";
import { FormStyledSelect, type FormStyledSelectOption } from "@/components/ui/FormStyledSelect";
import { formFieldControlClass } from "@/components/ui/formFieldClasses";
import { useCanEdit } from "@/hooks/useCanEdit";
import { appendUserProject, invalidateNotionProjectsCache } from "@/lib/itProjectsLocalStore";
import { IT_PROJECT_PHASE_ORDER, phaseLabel } from "@/lib/itProjectPortfolio";
import { useItProjectResponsableOptions } from "@/hooks/useItProjectResponsableOptions";
import { sortPmNamesByOptionsOrder } from "@/lib/itProjectResponsablesLocal";
import type { ItProject, ItProjectPhase, ItProjectRisk, ItProjectUrgency } from "@/lib/itProjectTypes";

const IT_PROJECT_PHASE_SELECT_OPTIONS = IT_PROJECT_PHASE_ORDER.map((ph) => ({
  value: ph,
  label: phaseLabel(ph),
}));

const IT_PROJECT_RISK_OPTIONS: FormStyledSelectOption<ItProjectRisk>[] = [
  { value: "bajo", label: "Bajo" },
  { value: "medio", label: "Medio" },
  { value: "alto", label: "Alto" },
];

const IT_PROJECT_URGENCY_OPTIONS: FormStyledSelectOption<ItProjectUrgency>[] = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

const RISK_OPTIONS_WITH_PLACEHOLDER: FormStyledSelectOption<string>[] = [
  { value: "", label: "Seleccionar…" },
  ...IT_PROJECT_RISK_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

const URGENCY_OPTIONS_WITH_PLACEHOLDER: FormStyledSelectOption<string>[] = [
  { value: "", label: "Seleccionar…" },
  ...IT_PROJECT_URGENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `itp-${crypto.randomUUID()}`;
  }
  return `itp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Mismo patrón visual que en Notion (`PRJ-` + prefijo del id). Para ids locales `itp-<uuid>`. */
function autoProjectCodeForLocalId(internalId: string): string {
  const withoutPrefix = internalId.replace(/^itp-/i, "");
  const segment = withoutPrefix.split("-")[0] ?? "";
  const base = /^[a-fA-F0-9]{8}$/.test(segment)
    ? segment.toUpperCase()
    : withoutPrefix.replace(/-/g, "").slice(0, 8).toUpperCase().padEnd(8, "0");
  return `PRJ-${base}`.slice(0, 40);
}

function newStableRowId(kind: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${kind}-${crypto.randomUUID()}`;
  }
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Rango opcional desde inputs `type=date` (ISO). Vacío si no hay período coherent. */
function buildSprintPeriodFromIsoInputs(startIso: string, endIso: string): { ok: true; timeframe: string } | { ok: false; message: string } {
  const s = startIso.trim();
  const e = endIso.trim();
  if (s === "" && e === "") return { ok: true, timeframe: "" };
  if (s !== "" && e !== "" && e < s) {
    return { ok: false, message: "La fecha de fin debe ser igual o posterior al inicio." };
  }
  if ((s !== "" && e === "") || (s === "" && e !== "")) {
    return {
      ok: false,
      message: "Para el período indica fecha de inicio y de fin, o deja ambas vacías.",
    };
  }
  return { ok: true, timeframe: `${s} — ${e}` };
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


type FormError = Partial<Record<"name" | "dates" | "pm" | "risk" | "urgency", string>>;

function isCreateNotionResponseOk(data: unknown): data is { id: string } {
  return typeof data === "object" && data !== null && typeof (data as { id: unknown }).id === "string";
}

function isNotionNotConfiguredPayload(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { code?: unknown }).code === "NOTION_NOT_CONFIGURED"
  );
}


export function CreateItProjectForm() {
  const canEdit = useCanEdit();
  const router = useRouter();
  const responsableOptions = useItProjectResponsableOptions();
  const pmSelectOptions = useMemo<FormStyledSelectOption<string>[]>(
    () => responsableOptions.map((n) => ({ value: n, label: n })),
    [responsableOptions],
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<ItProjectPhase>("sin_empezar");
  const [pmNames, setPmNames] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("");

  const [keyResultLines, setKeyResultLines] = useState<{ id: string; text: string }[]>([]);
  const [keyResultDraft, setKeyResultDraft] = useState("");
  const [taskLines, setTaskLines] = useState<{ id: string; text: string }[]>([]);
  const [taskDraft, setTaskDraft] = useState("");
  const [sprintRows, setSprintRows] = useState<{ id: string; title: string; timeframe: string }[]>([]);
  const [sprintTitleDraft, setSprintTitleDraft] = useState("");
  const [sprintPeriodStartDraft, setSprintPeriodStartDraft] = useState("");
  const [sprintPeriodEndDraft, setSprintPeriodEndDraft] = useState("");
  const [sprintPeriodDraftError, setSprintPeriodDraftError] = useState<string | null>(null);
  const [deliverablesDraft, setDeliverablesDraft] = useState("");

  const [errors, setErrors] = useState<FormError>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);



  const validate = (): boolean => {
    const next: FormError = {};
    if (!name.trim()) next.name = "El nombre es obligatorio.";
    if (!riskLevel.trim()) next.risk = "Selecciona nivel de riesgo.";
    if (!urgencyLevel.trim()) next.urgency = "Selecciona nivel de urgencia.";
    if (responsableOptions.length > 0 && pmNames.length === 0) {
      next.pm = "Selecciona al menos un responsable.";
    }
    if (startDate && targetEndDate && targetEndDate < startDate) {
      next.dates = "La fecha de fin debe ser posterior al inicio.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!canEdit) {
      setSubmitError("No tienes permisos para crear proyectos.");
      return;
    }
    if (!validate()) return;

    const riskSel = riskLevel.trim() as ItProjectRisk;
    const urgencySel = urgencyLevel.trim() as ItProjectUrgency;

    const id = newId();
    const pmDisplay =
      pmNames.length > 0
        ? sortPmNamesByOptionsOrder(pmNames, responsableOptions).join(", ")
        : "—";

    const project: ItProject = {
      id,
      code: autoProjectCodeForLocalId(id),
      name: name.trim(),
      description: description.trim() || "—",
      phase,
      sponsor: "—",
      pmName: pmDisplay,
      startDate: startDate || "—",
      targetEndDate: targetEndDate || "—",
      riskLevel: riskSel,
      urgencyLevel: urgencySel,
      milestones: [],
      keyResults: keyResultLines.map((row) => ({ id: row.id, title: row.text })),
      plannedTasks: taskLines.map((row) => ({ id: row.id, title: row.text })),
      sprints: sprintRows.map((row) => ({
        id: row.id,
        title: row.title,
        ...(row.timeframe.trim() ? { timeframe: row.timeframe.trim() } : {}),
      })),
      deliverables: parseDeliverablesFromLines(deliverablesDraft),
    };

    setPending(true);
    try {
      const res = await fetch("/api/notion/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          description: description.trim() || undefined,
          phase: project.phase,
          riskLevel: project.riskLevel,
          urgencyLevel: project.urgencyLevel,
          pmNames: pmNames.length > 0 ? pmNames : undefined,
        }),
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok && res.status === 201 && isCreateNotionResponseOk(data)) {
        invalidateNotionProjectsCache();
        router.push(`/proyectos/${encodeURIComponent(data.id)}`);
        return;
      }

      if (res.status === 503 && isNotionNotConfiguredPayload(data)) {
        appendUserProject(project);
        invalidateNotionProjectsCache();
        router.push(`/proyectos/${encodeURIComponent(project.id)}?soloNavegador=1`);
        return;
      }

      const apiMessage =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : null;
      setSubmitError(apiMessage ?? "No se pudo crear el proyecto en Notion.");
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
          className={`${formFieldControlClass} mt-1`}
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
          className={`${formFieldControlClass} mt-1 resize-y`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <label htmlFor="itp-risk" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Nivel de riesgo <span className="text-rose-600">*</span>
          </label>
          <FormStyledSelect
            id="itp-risk"
            value={riskLevel}
            onChange={setRiskLevel}
            options={RISK_OPTIONS_WITH_PLACEHOLDER}
            invalid={Boolean(errors.risk)}
            dimWhenEmpty
          />
          {errors.risk ? <p className="mt-1 text-xs text-rose-600">{errors.risk}</p> : null}
        </div>
        <div className="flex min-w-0 flex-col">
          <label htmlFor="itp-urgency" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Nivel de urgencia <span className="text-rose-600">*</span>
          </label>
          <FormStyledSelect
            id="itp-urgency"
            value={urgencyLevel}
            onChange={setUrgencyLevel}
            options={URGENCY_OPTIONS_WITH_PLACEHOLDER}
            invalid={Boolean(errors.urgency)}
            dimWhenEmpty
          />
          {errors.urgency ? <p className="mt-1 text-xs text-rose-600">{errors.urgency}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <label htmlFor="itp-phase" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Fase de progreso
          </label>
          <FormStyledSelect<ItProjectPhase>
            id="itp-phase"
            value={phase}
            onChange={setPhase}
            options={IT_PROJECT_PHASE_SELECT_OPTIONS}
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <label htmlFor="itp-pm" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Responsable <span className="text-rose-600">*</span>
          </label>
          <FormStyledMultiSelect
            id="itp-pm"
            values={pmNames}
            onChange={setPmNames}
            options={pmSelectOptions}
            invalid={Boolean(errors.pm)}
          />
          {errors.pm ? <p className="mt-1 text-xs text-rose-600">{errors.pm}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <label htmlFor="itp-start" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Inicio
          </label>
          <FormStyledDateField
            id="itp-start"
            value={startDate}
            onChange={setStartDate}
            dimWhenEmpty
            invalid={Boolean(errors.dates)}
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <label htmlFor="itp-end" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Fin objetivo
          </label>
          <FormStyledDateField
            id="itp-end"
            value={targetEndDate}
            onChange={setTargetEndDate}
            dimWhenEmpty
            invalid={Boolean(errors.dates)}
          />
        </div>
      </div>

      <div className="space-y-6 border-t border-slate-100 pt-6">
        <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4">
          <h3 className="text-sm font-bold text-slate-900">Resultados clave (KR)</h3>
          <p className="mt-1 text-xs text-slate-600">
            Añade uno o varios KRs. En Notion suelen enlazarse desde <strong>ITAI: kr de proyectos</strong>.
          </p>
          {keyResultLines.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {keyResultLines.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <span className="min-w-0 flex-1 leading-snug">{row.text}</span>
                  <button
                    type="button"
                    onClick={() => setKeyResultLines((rows) => rows.filter((r) => r.id !== row.id))}
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Aún no hay KRs en la lista.</p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="itp-kr-draft" className="sr-only">
                Texto del KR
              </label>
              <input
                id="itp-kr-draft"
                value={keyResultDraft}
                onChange={(e) => setKeyResultDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const t = keyResultDraft.trim();
                    if (!t) return;
                    setKeyResultLines((rows) => [...rows, { id: newStableRowId("kr"), text: t }]);
                    setKeyResultDraft("");
                  }
                }}
                placeholder="Ej. Reducir tiempo de ciclo de venta en 20%"
                className={`${formFieldControlClass} w-full`}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const t = keyResultDraft.trim();
                if (!t) return;
                setKeyResultLines((rows) => [...rows, { id: newStableRowId("kr"), text: t }]);
                setKeyResultDraft("");
              }}
              className="shrink-0 rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-50"
            >
              Añadir KR
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Tareas previstas</h3>
          <p className="mt-1 text-xs text-slate-500">Describe trabajo planificado; puedes quitar filas antes de crear.</p>
          {taskLines.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {taskLines.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm text-slate-800"
                >
                  <span className="min-w-0 flex-1 leading-snug">{row.text}</span>
                  <button
                    type="button"
                    onClick={() => setTaskLines((rows) => rows.filter((r) => r.id !== row.id))}
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Ninguna tarea añadida todavía.</p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="itp-task-draft" className="sr-only">
                Texto de la tarea
              </label>
              <input
                id="itp-task-draft"
                value={taskDraft}
                onChange={(e) => setTaskDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const t = taskDraft.trim();
                    if (!t) return;
                    setTaskLines((rows) => [...rows, { id: newStableRowId("task"), text: t }]);
                    setTaskDraft("");
                  }
                }}
                placeholder="Ej. Definición de integraciones API"
                className={`${formFieldControlClass} w-full`}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const t = taskDraft.trim();
                if (!t) return;
                setTaskLines((rows) => [...rows, { id: newStableRowId("task"), text: t }]);
                setTaskDraft("");
              }}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Añadir tarea
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-violet-100 bg-violet-50/25 p-4">
          <h3 className="text-sm font-bold text-slate-900">Sprints</h3>
          <p className="mt-1 text-xs text-slate-600">
            Nombre del sprint y, si quieres, un período con fechas reales de inicio y fin.
          </p>
          {sprintRows.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {sprintRows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{row.title}</p>
                      {row.timeframe.trim() ? (
                        <p className="mt-0.5 font-mono text-xs text-violet-900/85">{row.timeframe.trim()}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSprintRows((rows) => rows.filter((r) => r.id !== row.id))}
                      className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Ningún sprint añadido.</p>
          )}
          <div className="mt-3">
            <label htmlFor="itp-sprint-title" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Nombre del sprint
            </label>
            <input
              id="itp-sprint-title"
              value={sprintTitleDraft}
              onChange={(e) => setSprintTitleDraft(e.target.value)}
              placeholder="Ej. Sprint MVP — alcance inicial"
              className={`${formFieldControlClass} mt-1 w-full`}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col">
              <label htmlFor="itp-sprint-period-start" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Inicio del período (opcional)
              </label>
              <FormStyledDateField
                id="itp-sprint-period-start"
                value={sprintPeriodStartDraft}
                onChange={(v) => {
                  setSprintPeriodDraftError(null);
                  setSprintPeriodStartDraft(v);
                }}
                dimWhenEmpty
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <label htmlFor="itp-sprint-period-end" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Fin del período (opcional)
              </label>
              <FormStyledDateField
                id="itp-sprint-period-end"
                value={sprintPeriodEndDraft}
                onChange={(v) => {
                  setSprintPeriodDraftError(null);
                  setSprintPeriodEndDraft(v);
                }}
                dimWhenEmpty
              />
            </div>
          </div>
          {sprintPeriodDraftError ? (
            <p className="mt-2 text-xs font-medium text-rose-700" role="alert">
              {sprintPeriodDraftError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              const title = sprintTitleDraft.trim();
              if (!title) return;
              const periodResult = buildSprintPeriodFromIsoInputs(sprintPeriodStartDraft, sprintPeriodEndDraft);
              if (!periodResult.ok) {
                setSprintPeriodDraftError(periodResult.message);
                return;
              }
              setSprintPeriodDraftError(null);
              setSprintRows((rows) => [
                ...rows,
                { id: newStableRowId("spr"), title, timeframe: periodResult.timeframe },
              ]);
              setSprintTitleDraft("");
              setSprintPeriodStartDraft("");
              setSprintPeriodEndDraft("");
            }}
            className="mt-3 rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-950 shadow-sm hover:bg-violet-50"
          >
            Añadir sprint
          </button>
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
            className={`${formFieldControlClass} mt-2 resize-y`}
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
