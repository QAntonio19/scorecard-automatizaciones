/**
 * Helpers y opciones compartidas entre crear/editar proyecto IT (Notion ↔ UI).
 */

import type { FormStyledSelectOption } from "@/components/ui/FormStyledSelect";
import { IT_PROJECT_PHASE_ORDER, phaseLabel } from "@/lib/itProjectPortfolio";
import type { ItProject, ItProjectRisk, ItProjectUrgency, ItSprintTaskBoardColumn } from "@/lib/itProjectTypes";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";

export const IT_PROJECT_PHASE_SELECT_OPTIONS = IT_PROJECT_PHASE_ORDER.map((ph) => ({
  value: ph,
  label: phaseLabel(ph),
}));

export const IT_PROJECT_RISK_OPTIONS: FormStyledSelectOption<ItProjectRisk>[] = [
  { value: "bajo", label: "Bajo" },
  { value: "medio", label: "Medio" },
  { value: "alto", label: "Alto" },
];

export const IT_PROJECT_URGENCY_OPTIONS: FormStyledSelectOption<ItProjectUrgency>[] = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

export const RISK_OPTIONS_WITH_PLACEHOLDER: FormStyledSelectOption<string>[] = [
  { value: "", label: "Seleccionar…" },
  ...IT_PROJECT_RISK_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];


export const URGENCY_OPTIONS_WITH_PLACEHOLDER: FormStyledSelectOption<string>[] = [
  { value: "", label: "Seleccionar…" },
  ...IT_PROJECT_URGENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

export type ItProjectLineRow = { id: string; text: string };

/** Fila de tareas en crear/editar: texto + opcional vínculo a fila sprint (id de página Notion cuando ya existe). */
export type ItProjectTaskFormRow = {
  id: string;
  text: string;
  /** Detalle editable en panel lateral (persistido en `plannedTasks` al guardar el proyecto). */
  description?: string;
  sprintRowId?: string;
  /** Si el sprint solo viene cargado desde Notion y no está entre las filas de sprint locales. */
  sprintLabelHint?: string;
  assigneeName?: string;
  targetDate?: string;
};

/** Payload de `taskLines` hacia PATCH Notion (`sprintId` ausente → no mutar esa relación en la página de la tarea). */
export type NotionTaskLinePatchBody = {
  id: string;
  text: string;
  sprintId?: string | null;
  /** Columna sprint UI; se escribe en Notión en la propiedad de tarea (`Estatus` por defecto); ver `notionTaskBoardStatusEnv`. */
  sprintBoardColumn?: ItSprintTaskBoardColumn;
  assigneeName?: string;
  targetDate?: string;
};

/** Construye el cuerpo de tareas detectando sólo diferencias contra el vínculo sprint original en servidor. */
export function buildNotionTaskLinePatchBodies(
  rows: readonly ItProjectTaskFormRow[],
  originSprintByTaskId: ReadonlyMap<string, string | undefined>,
): NotionTaskLinePatchBody[] {
  return rows.map((row) => {
    const text = row.text.trim();
    const selected = row.sprintRowId?.trim() ?? "";
    const canonical =
      selected !== "" && isLikelyNotionPageId(selected)
        ? selected
        : null;

    const origRaw = originSprintByTaskId.get(row.id);
    const origin =
      origRaw !== undefined &&
      origRaw !== null &&
      origRaw.trim() !== "" &&
      isLikelyNotionPageId(origRaw.trim())
        ? origRaw.trim()
        : null;

    let sprintPatch: string | null | undefined;
    if (canonical) {
      if (canonical !== origin) sprintPatch = canonical;
      else sprintPatch = undefined;
    } else if (origin) sprintPatch = null;
    else sprintPatch = undefined;

    const payload: NotionTaskLinePatchBody = { id: row.id, text };
    if (sprintPatch !== undefined) payload.sprintId = sprintPatch;
    if (row.assigneeName !== undefined) payload.assigneeName = row.assigneeName;
    if (row.targetDate !== undefined) payload.targetDate = row.targetDate;
    return payload;
  });
}

/** Reconcilia descripciones editadas en el formulario con el proyecto devuelto por Notion tras PATCH (misma id de tarea). */
export function mergePlannedTaskDescriptionsFromRows(
  project: ItProject,
  rows: readonly ItProjectTaskFormRow[],
): ItProject {
  const rowById = new Map(rows.map((r) => [r.id, r]));
  return {
    ...project,
    plannedTasks: project.plannedTasks.map((t) => {
      const row = rowById.get(t.id);
      const trimmedDesc = row?.description?.trim() ?? "";
      const trimmedAssignee = row?.assigneeName?.trim() ?? "";
      const trimmedDate = row?.targetDate?.trim() ?? "";
      const next = { ...t };
      
      if (!trimmedDesc) delete next.description;
      else next.description = trimmedDesc;

      if (!trimmedAssignee) delete next.assigneeName;
      else next.assigneeName = trimmedAssignee;

      if (!trimmedDate) delete next.targetDate;
      else next.targetDate = trimmedDate;

      return next;
    }),
  };
}

/** Cuerpo mínimo coherente con PATCH `/api/notion/projects/[id]` al cambiar sólo una tarea (incluye todas las líneas para no romper relations). */
export type NotionProjectPersistBodyFromClient = {
  name: string;
  description?: string;
  phase: ItProject["phase"];
  riskLevel: ItProject["riskLevel"];
  urgencyLevel?: ItProject["urgencyLevel"];
  pmNames?: string[];
  month?: string;
  year?: string;
  taskLines: NotionTaskLinePatchBody[];
};

export function pmNameFieldToPmNames(pmName: string | undefined): string[] {
  const t = pmName?.trim() ?? "";
  if (!t || t === "—") return [];
  return t
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function buildNotionPersistBodyUpdatingOneSprintTask(
  project: ItProject,
  taskId: string,
  opts: { title: string; sprintBoardColumn: ItSprintTaskBoardColumn },
): NotionProjectPersistBodyFromClient {
  const text = opts.title.trim().slice(0, 2000);
  const taskLines: NotionTaskLinePatchBody[] = project.plannedTasks.map((t) => {
    const lineText = t.id === taskId ? text : t.title.trim().slice(0, 2000);
    const body: NotionTaskLinePatchBody = {
      id: t.id,
      text: lineText,
      ...(t.id === taskId ? { sprintBoardColumn: opts.sprintBoardColumn } : {}),
    };
    const sid = t.sprintId?.trim() ?? "";
    if (sid && isLikelyNotionPageId(sid)) {
      body.sprintId = sid;
    }
    return body;
  });

  return {
    name: project.name.trim().slice(0, 2000),
    description: project.description?.trim().slice(0, 16_000),
    phase: project.phase,
    riskLevel: project.riskLevel,
    urgencyLevel: project.urgencyLevel ?? "media",
    pmNames: pmNameFieldToPmNames(project.pmName),
    taskLines,
  };
}

/** PATCH Notion sólo cambiando fase (sin tocar relation slices). `taskLines` omitido por diseño. */
export function buildNotionPatchBodyPhaseOnly(
  project: ItProject,
  nextPhase: ItProject["phase"],
): Pick<
  NotionProjectPersistBodyFromClient,
  "name" | "description" | "phase" | "riskLevel" | "urgencyLevel" | "pmNames"
> {
  return {
    name: project.name.trim().slice(0, 2000),
    description: project.description?.trim().slice(0, 16_000),
    phase: nextPhase,
    riskLevel: project.riskLevel,
    urgencyLevel: project.urgencyLevel ?? "media",
    pmNames: pmNameFieldToPmNames(project.pmName),
  };
}

/**
 * Tras PATCH Notion, la API puede devolver el proyecto sin descripción si falta la propiedad en Notion o el env
 * `NOTION_PROP_PROJECT_DESCRIPTION`. Mantiene en caché el texto del formulario para que la vista detalle lo muestre.
 */
export function mergeFormProjectDescriptionAfterNotionPatch(
  project: ItProject,
  formDescription: string,
): ItProject {
  const trimmed = formDescription.trim();
  return {
    ...project,
    description: trimmed || "—",
  };
}

export type CoreFormErrorKeys = Partial<Record<"name" | "dates" | "pm" | "risk" | "urgency", string>>;

export function newStableRowId(kind: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${kind}-${crypto.randomUUID()}`;
  }
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Rango opcional desde inputs `type=date` (ISO). Vacío si no hay período coherent. */
export function buildSprintPeriodFromIsoInputs(
  startIso: string,
  endIso: string,
): { ok: true; timeframe: string } | { ok: false; message: string } {
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

/** Fila local de sprint (formulario crear/editar). */
export type ItProjectFormSprintRow = { id: string; title: string; timeframe: string };

/**
 * Si el usuario rellena nombre/período en el borrador pero guarda sin pulsar «Añadir sprint»,
 * incorpora esa entrada a la lista usando las mismas reglas que el botón.
 */
export function mergePendingSprintDraft(state: {
  rows: readonly ItProjectFormSprintRow[];
  titleDraft: string;
  startDraft: string;
  endDraft: string;
}):
  | { ok: true; rows: ItProjectFormSprintRow[]; mergedFromDraft: boolean }
  | { ok: false; error: string } {
  const title = state.titleDraft.trim();
  const s = state.startDraft.trim();
  const e = state.endDraft.trim();
  const hasAnyDraft = Boolean(title || s || e);
  if (!hasAnyDraft) {
    return { ok: true, rows: [...state.rows], mergedFromDraft: false };
  }
  if (!title) {
    return {
      ok: false,
      error: "Indica el nombre del sprint o deja vacíos nombre y fechas del borrador.",
    };
  }
  const period = buildSprintPeriodFromIsoInputs(s, e);
  if (!period.ok) {
    return { ok: false, error: period.message };
  }
  return {
    ok: true,
    rows: [
      ...state.rows,
      { id: newStableRowId("spr"), title, timeframe: period.timeframe },
    ],
    mergedFromDraft: true,
  };
}

/** Cada línea: `Entregable` o `Entregable | fecha` (fecha opcional). */
export function parseDeliverablesFromLines(raw: string): ItProject["deliverables"] {
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

export function serializeDeliverablesToDraft(d: ItProject["deliverables"]): string {
  return d
    .map((x) => (x.targetDate ? `${x.title} | ${x.targetDate}` : x.title))
    .join("\n");
}

/** Convierte `pmName` almacenado ("A, B") en un array estable para multi-select. */
export function pmNameStringToSelections(pmName: string, validOptions: readonly string[]): string[] {
  const parts = pmName
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "—");
  if (validOptions.length === 0) return parts;
  const setOpts = new Set(validOptions.map((x) => x.trim()));
  const matched = parts.filter((p) => setOpts.has(p));
  const extras = parts.filter((p) => !setOpts.has(p));
  return [...matched, ...extras];
}

/** Prefijo fecha para inputs `type="date"` a partir del valor persistido del proyecto. */
export function isoDateInputField(value: string): string {
  if (!value || value === "—") return "";
  const head = value.split("T")[0] ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : "";
}
