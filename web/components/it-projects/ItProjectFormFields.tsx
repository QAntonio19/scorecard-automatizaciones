"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { FormStyledDateField } from "@/components/ui/FormStyledDateField";
import { FormStyledMultiSelect } from "@/components/ui/FormStyledMultiSelect";
import { FormStyledSelect, type FormStyledSelectOption } from "@/components/ui/FormStyledSelect";
import {
  IT_PROJECT_PHASE_SELECT_OPTIONS,
  RISK_OPTIONS_WITH_PLACEHOLDER,
  URGENCY_OPTIONS_WITH_PLACEHOLDER,
  buildSprintPeriodFromIsoInputs,
  newStableRowId,
  type CoreFormErrorKeys,
  type ItProjectLineRow,
  type ItProjectTaskFormRow,
} from "@/lib/itProjectFormShared";
import { formFieldControlClass } from "@/components/ui/formFieldClasses";
import type { ItProjectPhase } from "@/lib/itProjectTypes";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";

export type ItProjectFormFieldsProps = {
  formIdPrefix: string;
  heading: string;
  mutateSecondaryWrites: boolean;
  datesEditable: boolean;
  secondaryNotice?: ReactNode | null;

  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  riskLevel: string;
  setRiskLevel: (v: string) => void;
  urgencyLevel: string;
  setUrgencyLevel: (v: string) => void;
  phase: ItProjectPhase;
  setPhase: (v: ItProjectPhase) => void;
  pmNames: string[];
  setPmNames: (v: string[]) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  targetEndDate: string;
  setTargetEndDate: (v: string) => void;

  keyResultLines: ItProjectLineRow[];
  setKeyResultLines: React.Dispatch<React.SetStateAction<ItProjectLineRow[]>>;
  keyResultDraft: string;
  setKeyResultDraft: (v: string) => void;
  taskLines: ItProjectTaskFormRow[];
  setTaskLines: React.Dispatch<React.SetStateAction<ItProjectTaskFormRow[]>>;
  taskDraft: string;
  setTaskDraft: (v: string) => void;
  sprintRows: { id: string; title: string; timeframe: string }[];
  setSprintRows: React.Dispatch<React.SetStateAction<{ id: string; title: string; timeframe: string }[]>>;
  sprintTitleDraft: string;
  setSprintTitleDraft: (v: string) => void;
  sprintPeriodStartDraft: string;
  setSprintPeriodStartDraft: (v: string) => void;
  sprintPeriodEndDraft: string;
  setSprintPeriodEndDraft: (v: string) => void;
  sprintPeriodDraftError: string | null;
  setSprintPeriodDraftError: (v: string | null) => void;

  pmSelectOptions: FormStyledSelectOption<string>[];
  errors: CoreFormErrorKeys;
  submitError: string | null;
  cancelHref: string;
  submitLabel: string;
  pending: boolean;
  canSubmit: boolean;
  submitDisabledTitle?: string;
  onSubmit: (e: React.FormEvent) => void;
};

function pid(p: string, s: string): string {
  return `${p}-${s}`;
}

function sprintSelectOptionsForTaskRow(
  sprintRows: { id: string; title: string; timeframe: string }[],
  row: ItProjectTaskFormRow,
): FormStyledSelectOption<string>[] {
  const opts: FormStyledSelectOption<string>[] = [{ value: "", label: "Sin sprint" }];
  for (const s of sprintRows) {
    opts.push({
      value: s.id,
      label: s.title,
    });
  }
  const sid = row.sprintRowId?.trim();
  if (sid && isLikelyNotionPageId(sid) && !sprintRows.some((s) => s.id === sid)) {
    opts.push({
      value: sid,
      label:
        row.sprintLabelHint?.trim() ??
        `${sid.slice(0, 8)}… (sprint en Notion no listado en el proyecto)`,
    });
  }
  return opts;
}

const TASK_DESC_DRAWER_MS = 300;

function TaskDescriptionDrawer({
  open,
  taskTitle,
  draft,
  onDraftChange,
  onClose,
  onSave,
}: {
  open: boolean;
  taskTitle: string;
  draft: string;
  onDraftChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const rafOpenRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      rafOpenRef.current = requestAnimationFrame(() => {
        rafOpenRef.current = requestAnimationFrame(() => setSlideIn(true));
      });
      return () => {
        if (rafOpenRef.current !== null) cancelAnimationFrame(rafOpenRef.current);
      };
    }
    setSlideIn(false);
    const t = window.setTimeout(() => setMounted(false), TASK_DESC_DRAWER_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  if (!mounted) return null;

  const transitionPanel =
    "transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:duration-0";
  const transitionBackdrop =
    "transition-opacity duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0";

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label="Cerrar panel"
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] ${transitionBackdrop} ${
          slideIn ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-desc-drawer-title"
        className={`relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl ${transitionPanel} ${
          slideIn ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 id="task-desc-drawer-title" className="text-base font-bold text-slate-900">
            Descripción de la tarea
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{taskTitle || "—"}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label htmlFor="task-desc-drawer-textarea" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Descripción
          </label>
          <textarea
            id="task-desc-drawer-textarea"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={12}
            placeholder="Añade contexto, criterios de aceptación, enlaces…"
            className={`${formFieldControlClass} mt-2 w-full resize-y`}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onSave();
              onClose();
            }}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-800"
          >
            Guardar
          </button>
        </div>
      </aside>
    </div>
  );
}

/** Campos duplicados entre crear/editar proyecto (misma apariencia que el alta). */
export function ItProjectFormFields(props: ItProjectFormFieldsProps) {
  const {
    formIdPrefix,
    heading,
    mutateSecondaryWrites,
    datesEditable,
    secondaryNotice,

    name,
    setName,
    description,
    setDescription,
    riskLevel,
    setRiskLevel,
    urgencyLevel,
    setUrgencyLevel,
    phase,
    setPhase,
    pmNames,
    setPmNames,
    startDate,
    setStartDate,
    targetEndDate,
    setTargetEndDate,

    keyResultLines,
    setKeyResultLines,
    keyResultDraft,
    setKeyResultDraft,
    taskLines,
    setTaskLines,
    taskDraft,
    setTaskDraft,
    sprintRows,
    setSprintRows,
    sprintTitleDraft,
    setSprintTitleDraft,
    sprintPeriodStartDraft,
    setSprintPeriodStartDraft,
    sprintPeriodEndDraft,
    setSprintPeriodEndDraft,
    sprintPeriodDraftError,
    setSprintPeriodDraftError,
    pmSelectOptions,
    errors,
    submitError,
    cancelHref,
    submitLabel,
    pending,
    canSubmit,
    submitDisabledTitle,
    onSubmit,
  } = props;

  const [descDrawerTaskId, setDescDrawerTaskId] = useState<string | null>(null);
  const [descDrawerDraft, setDescDrawerDraft] = useState("");

  const dClass = datesEditable ? "" : "opacity-80";

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900">{heading}</h2>
        {submitError ? (
          <p
            className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 whitespace-pre-line"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={pid(formIdPrefix, "name")} className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Nombre <span className="text-rose-600">*</span>
        </label>
        <input
          id={pid(formIdPrefix, "name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del programa o iniciativa"
          className={`${formFieldControlClass} mt-1`}
        />
        {errors.name ? <p className="mt-1 text-xs text-rose-600">{errors.name}</p> : null}
      </div>

      <div>
        <label htmlFor={pid(formIdPrefix, "desc")} className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Descripción
        </label>
        <textarea
          id={pid(formIdPrefix, "desc")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Alcance, objetivos, contexto…"
          className={`${formFieldControlClass} mt-1 resize-y`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <label htmlFor={pid(formIdPrefix, "risk")} className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Nivel de riesgo <span className="text-rose-600">*</span>
          </label>
          <FormStyledSelect
            id={pid(formIdPrefix, "risk")}
            value={riskLevel}
            onChange={setRiskLevel}
            options={RISK_OPTIONS_WITH_PLACEHOLDER}
            invalid={Boolean(errors.risk)}
            dimWhenEmpty
          />
          {errors.risk ? <p className="mt-1 text-xs text-rose-600">{errors.risk}</p> : null}
        </div>
        <div className="flex min-w-0 flex-col">
          <label htmlFor={pid(formIdPrefix, "urgency")} className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Nivel de urgencia <span className="text-rose-600">*</span>
          </label>
          <FormStyledSelect
            id={pid(formIdPrefix, "urgency")}
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
          <label htmlFor={pid(formIdPrefix, "phase")} className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Fase de progreso
          </label>
          <FormStyledSelect<ItProjectPhase>
            id={pid(formIdPrefix, "phase")}
            value={phase}
            onChange={setPhase}
            options={IT_PROJECT_PHASE_SELECT_OPTIONS}
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <label htmlFor={pid(formIdPrefix, "pm")} className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Responsable <span className="text-rose-600">*</span>
          </label>
          <FormStyledMultiSelect
            id={pid(formIdPrefix, "pm")}
            values={pmNames}
            onChange={setPmNames}
            options={pmSelectOptions}
            invalid={Boolean(errors.pm)}
          />
          {errors.pm ? <p className="mt-1 text-xs text-rose-600">{errors.pm}</p> : null}
        </div>
      </div>

      {!datesEditable ? (
        <p className="text-xs text-slate-500">
          Las fechas de inicio y fin no se sincronizan con Notion desde esta pantalla (ajusta en la base cuando existan los
          campos).
        </p>
      ) : null}

      <div className={`grid gap-4 sm:grid-cols-2 ${dClass}`}>
        <div className="flex min-w-0 flex-col">
          <label htmlFor={pid(formIdPrefix, "start")} className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Inicio
          </label>
          <FormStyledDateField
            id={pid(formIdPrefix, "start")}
            value={startDate}
            onChange={setStartDate}
            dimWhenEmpty
            invalid={Boolean(errors.dates)}
            disabled={!datesEditable}
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <label htmlFor={pid(formIdPrefix, "end")} className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Fin objetivo
          </label>
          <FormStyledDateField
            id={pid(formIdPrefix, "end")}
            value={targetEndDate}
            onChange={setTargetEndDate}
            dimWhenEmpty
            invalid={Boolean(errors.dates)}
            disabled={!datesEditable}
          />
        </div>
      </div>

      <div className="space-y-6 border-t border-slate-100 pt-6">
        {secondaryNotice ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">{secondaryNotice}</div>
        ) : null}

        <div className={`rounded-xl border border-amber-100 bg-amber-50/30 p-4 ${!mutateSecondaryWrites ? "opacity-90" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Resultados clave (KR)</h3>
            {!mutateSecondaryWrites ? (
              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                Solo lectura
              </span>
            ) : null}
          </div>
          {keyResultLines.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {keyResultLines.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="min-w-0 flex-1 leading-snug">{row.text}</span>
                    {mutateSecondaryWrites ? (
                      <button
                        type="button"
                        onClick={() => setKeyResultLines((rows) => rows.filter((r) => r.id !== row.id))}
                        className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              {mutateSecondaryWrites
                ? "Ningún resultado clave añadido todavía."
                : "No hay resultados clave enlazados visibles desde Notion."}
            </p>
          )}
          {mutateSecondaryWrites ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor={pid(formIdPrefix, "kr-draft")} className="sr-only">
                  Texto del KR
                </label>
                <input
                  id={pid(formIdPrefix, "kr-draft")}
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
          ) : null}
        </div>

        <div className={`rounded-xl border border-violet-100 bg-violet-50/25 p-4 ${!mutateSecondaryWrites ? "opacity-90" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Sprints</h3>
            {!mutateSecondaryWrites ? (
              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-violet-200">
                Solo lectura
              </span>
            ) : null}
          </div>
          {sprintRows.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {sprintRows.map((row) => {
                const tf = row.timeframe.trim();
                return (
                  <li
                    key={row.id}
                    className="rounded-lg border border-violet-100 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug text-slate-900">{row.title}</span>
                        {tf ? <p className="mt-0.5 text-xs text-slate-500">{tf}</p> : null}
                      </div>
                      {mutateSecondaryWrites ? (
                        <button
                          type="button"
                          onClick={() => setSprintRows((rows) => rows.filter((r) => r.id !== row.id))}
                          className="shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              {mutateSecondaryWrites
                ? "Ningún sprint añadido todavía."
                : "No hay sprints enlazados visibles desde Notion."}
            </p>
          )}
          {mutateSecondaryWrites ? (
            <>
              <div className="mt-3">
                <label htmlFor={pid(formIdPrefix, "sprint-title")} className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Nombre del sprint
                </label>
                <input
                  id={pid(formIdPrefix, "sprint-title")}
                  value={sprintTitleDraft}
                  onChange={(e) => setSprintTitleDraft(e.target.value)}
                  placeholder="Ej. Sprint MVP — alcance inicial"
                  className={`${formFieldControlClass} mt-1 w-full`}
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col">
                  <label
                    htmlFor={pid(formIdPrefix, "sprint-period-start")}
                    className="text-xs font-bold uppercase tracking-wide text-slate-500"
                  >
                    Inicio del período (opcional)
                  </label>
                  <FormStyledDateField
                    id={pid(formIdPrefix, "sprint-period-start")}
                    value={sprintPeriodStartDraft}
                    onChange={(v) => {
                      setSprintPeriodDraftError(null);
                      setSprintPeriodStartDraft(v);
                    }}
                    dimWhenEmpty
                  />
                </div>
                <div className="flex min-w-0 flex-col">
                  <label
                    htmlFor={pid(formIdPrefix, "sprint-period-end")}
                    className="text-xs font-bold uppercase tracking-wide text-slate-500"
                  >
                    Fin del período (opcional)
                  </label>
                  <FormStyledDateField
                    id={pid(formIdPrefix, "sprint-period-end")}
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
            </>
          ) : null}
        </div>

        <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${!mutateSecondaryWrites ? "opacity-90" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Tareas previstas</h3>
            {!mutateSecondaryWrites ? (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                Solo lectura
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {mutateSecondaryWrites ? (
              <>
                Opcionalmente asigna cada tarea a un sprint (se escribe la relación en la página de la tarea en Notion al
                guardar).
              </>
            ) : (
              <>
                Las tareas enlazadas al proyecto están en Notion. Si la base lo permite, se muestra el sprint ligado leído
                desde la fila de tarea.
              </>
            )}
          </p>
          {taskLines.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {taskLines.map((row) => {
                const sid = row.sprintRowId?.trim();
                const sprintOptions = sprintSelectOptionsForTaskRow(sprintRows, row);
                /** Incluye ids locales de sprints del formulario, no solo UUID Notion. */
                const sprintSelectValue =
                  sid && sprintOptions.some((o) => o.value === sid) ? sid : "";
                const sprintTitleResolved =
                  (sid &&
                    sprintRows.find((s) => s.id === sid)?.title) ||
                  row.sprintLabelHint?.trim();
                const showSprintLineReadOnly =
                  !mutateSecondaryWrites &&
                  sprintTitleResolved &&
                  Boolean(sprintTitleResolved.trim());

                return (
                  <li
                    key={row.id}
                    className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm text-slate-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="block leading-snug">{row.text}</span>
                        {mutateSecondaryWrites && row.description?.trim() ? (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{row.description.trim()}</p>
                        ) : null}
                      </div>
                      {mutateSecondaryWrites ? (
                        <div className="flex shrink-0 justify-end">
                          <button
                            type="button"
                            onClick={() => setTaskLines((rows) => rows.filter((r) => r.id !== row.id))}
                            className="rounded-md px-2 py-0.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                          >
                            Quitar
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {mutateSecondaryWrites ? (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <div className="min-w-0 flex-1 sm:max-w-sm">
                          <label className="sr-only" htmlFor={pid(formIdPrefix, `task-sprint-${row.id}`)}>
                            Sprint de la tarea
                          </label>
                          <FormStyledSelect<string>
                            id={pid(formIdPrefix, `task-sprint-${row.id}`)}
                            value={sprintSelectValue}
                            onChange={(v) =>
                              setTaskLines((rows) =>
                                rows.map((r) =>
                                  r.id === row.id
                                    ? {
                                        ...r,
                                        sprintRowId: v.trim() !== "" ? v.trim() : undefined,
                                        ...(v.trim() !== "" ? { sprintLabelHint: undefined } : {}),
                                      }
                                    : r,
                                ),
                              )
                            }
                            options={sprintOptions}
                            dimWhenEmpty
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDescDrawerTaskId(row.id);
                            setDescDrawerDraft(row.description ?? "");
                          }}
                          className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:py-1.5"
                        >
                          {row.description?.trim() ? "Editar descripción" : "Agregar descripción"}
                        </button>
                      </div>
                    ) : showSprintLineReadOnly ? (
                      <p className="mt-2 text-xs text-violet-800/95">
                        <span className="font-semibold text-slate-600">Sprint: </span>
                        {sprintTitleResolved}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              {mutateSecondaryWrites
                ? "Ninguna tarea añadida todavía."
                : "No hay tareas enlazadas visibles desde Notion."}
            </p>
          )}
          {mutateSecondaryWrites ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor={pid(formIdPrefix, "task-draft")} className="sr-only">
                  Texto de la tarea
                </label>
                <input
                  id={pid(formIdPrefix, "task-draft")}
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
          ) : null}
        </div>
      </div>

      {errors.dates ? <p className="text-xs text-rose-600">{errors.dates}</p> : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Link
          href={cancelHref}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending || !canSubmit}
          title={submitDisabledTitle}
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
      </div>

      <TaskDescriptionDrawer
        open={descDrawerTaskId !== null}
        taskTitle={taskLines.find((r) => r.id === descDrawerTaskId)?.text ?? ""}
        draft={descDrawerDraft}
        onDraftChange={setDescDrawerDraft}
        onClose={() => {
          setDescDrawerTaskId(null);
          setDescDrawerDraft("");
        }}
        onSave={() => {
          if (!descDrawerTaskId) return;
          const v = descDrawerDraft.trim();
          setTaskLines((rows) =>
            rows.map((r) => {
              if (r.id !== descDrawerTaskId) return r;
              if (!v) {
                const next = { ...r };
                delete next.description;
                return next;
              }
              return { ...r, description: v };
            }),
          );
        }}
      />
    </form>
  );
}
