import { deriveAutomationPlatform } from "../automationPlatform.js";
import { HttpError } from "../httpError.js";
import { normalizePhaseValue } from "../projectPhases.js";
import type {
  OwnerCode,
  ProjectHealth,
  ProjectPhase,
  ProjectRecord,
} from "../projectTypes.js";
import type { PatchProjectDetailsBody } from "../projectValidation.js";
import { getSupabaseServerClient } from "../supabase/client.js";

interface ResponsableRow {
  id: string;
  codigo: string;
  nombre: string;
}

/** Fila mínima de `public.workflows` + columnas opcionales del migration scorecard. */
interface WorkflowRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  valor: string | number | null;
  responsable_id: string | null;
  estatus: string | null;
  legacy_id: string | null;
  categoria: string | null;
  fase: string | null;
  complejidad: number | null;
  pasos: number | null;
  cronograma: string | null;
  progreso: number | null;
  tasa_fallo: string | number | null;
  nota_riesgo: string | null;
  etiqueta_salud: string | null;
  owner_override_id: string | null;
  fase_override: string | null;
}

function healthFromEstatus(raw: string | null | undefined): ProjectHealth {
  const s = (raw ?? "").toLowerCase().trim();
  if (s.includes("riesgo") || s === "en_riesgo" || s === "en riesgo") return "en_riesgo";
  if (s === "pausado" || s === "paused" || s === "pause") return "pausado";
  return "activo";
}

function healthLabelFor(health: ProjectHealth, etiqueta: string | null | undefined): string {
  const t = etiqueta?.trim();
  if (t) return t;
  if (health === "activo") return "Activo";
  if (health === "pausado") return "Pausado";
  return "En riesgo";
}

function num(v: string | number | null | undefined, fallback: number): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapWorkflowToProject(
  w: WorkflowRow,
  responsables: Map<string, ResponsableRow>,
  platsByWorkflow: Map<string, string[]>,
  techsByWorkflow: Map<string, string[]>,
): ProjectRecord {
  const health = healthFromEstatus(w.estatus);
  const effectiveOwnerId = w.owner_override_id ?? w.responsable_id;
  const ownerRow = effectiveOwnerId ? responsables.get(effectiveOwnerId) : undefined;
  const ownerCode: OwnerCode = ownerRow?.codigo === "JA" ? "JA" : "EV";
  const ownerName = ownerRow?.nombre ?? (ownerCode === "JA" ? "Juan Antonio" : "Evelyn");

  const phaseRaw = w.fase_override?.trim() ? w.fase_override : w.fase;
  const phase = normalizePhaseValue(phaseRaw) as ProjectPhase;

  const platNames = platsByWorkflow.get(w.id) ?? [];
  const techNames = techsByWorkflow.get(w.id) ?? [];
  const technologies = techNames.length > 0 ? techNames : platNames;

  const platform = deriveAutomationPlatform({
    platform: platNames[0],
    technologies,
  });

  return {
    id: w.legacy_id?.trim() || w.id,
    name: w.nombre ?? "",
    description: w.descripcion ?? "",
    phase,
    health,
    healthLabel: healthLabelFor(health, w.etiqueta_salud),
    ownerCode,
    ownerName,
    category: w.categoria?.trim() ?? "",
    platform,
    ownerIsManual: Boolean(w.owner_override_id),
    phaseIsManual: Boolean(w.fase_override?.trim()),
    steps: num(w.pasos, 0),
    schedule: w.cronograma?.trim() ?? "",
    progress: num(w.progreso, 0),
    technologies,
    failureRate: w.tasa_fallo === null || w.tasa_fallo === undefined ? null : num(w.tasa_fallo, 0),
    riskNote: w.nota_riesgo?.trim() ?? null,
    complexity: num(w.complejidad, 5),
    businessValue: num(w.valor, 0),
  };
}

/** Columnas usadas en listas y detalle (evita `*`: no arrastra columnas extra en la fila de Supabase). */
const WORKFLOWS_SELECT_LIST =
  "id, nombre, descripcion, valor, responsable_id, estatus, legacy_id, categoria, fase, complejidad, pasos, cronograma, progreso, tasa_fallo, nota_riesgo, etiqueta_salud, owner_override_id, fase_override";

/**
 * Fila mínima para el panel: sin descripción, pasos, cronograma ni notas; menos datos por red hacia el API.
 * Los huecos se rellenan con nulos y mapWorkflowToProject aplica el mismo criterio de salud/fase/plataforma.
 */
const WORKFLOWS_SELECT_PANEL_SUMMARY =
  "id, nombre, legacy_id, categoria, estatus, etiqueta_salud, tasa_fallo, fase, fase_override, complejidad, valor, responsable_id, owner_override_id";

const PANEL_SUMMARY_DEFAULTS: Partial<WorkflowRow> = {
  descripcion: null,
  pasos: null,
  cronograma: null,
  progreso: null,
  nota_riesgo: null,
};

export async function fetchProjectsFromSupabase(): Promise<ProjectRecord[]> {
  return loadWorkflowsForProjectsFromSupabase({
    select: WORKFLOWS_SELECT_LIST,
    rowDefaults: null,
  });
}

/** Sólo para `GET /api/projects/summary`: menos carga I/O y payload que leer toda la fila. */
export async function fetchProjectRecordsForPortfolioSummaryFromSupabase(): Promise<ProjectRecord[]> {
  return loadWorkflowsForProjectsFromSupabase({
    select: WORKFLOWS_SELECT_PANEL_SUMMARY,
    rowDefaults: PANEL_SUMMARY_DEFAULTS,
  });
}

type LoadSupabaseOptions = { select: string; rowDefaults: Partial<WorkflowRow> | null };

async function loadWorkflowsForProjectsFromSupabase({
  select,
  rowDefaults,
}: LoadSupabaseOptions): Promise<ProjectRecord[]> {
  const sb = getSupabaseServerClient();
  const { data: workflows, error: wErr } = await sb.from("workflows").select(select);
  if (wErr) throw new Error(`Supabase workflows: ${wErr.message}`);
  const rows = (workflows ?? []) as Partial<WorkflowRow>[];
  if (rows.length === 0) return [];

  const wfIds = rows.map((r) => r.id);
  const resIds = [
    ...new Set(
      rows.flatMap((r) => [r.responsable_id, r.owner_override_id].filter((x): x is string => Boolean(x))),
    ),
  ];

  const [{ data: responsableRows }, { data: wpRows }, { data: wtRows }] = await Promise.all([
    resIds.length
      ? sb.from("responsables").select("id, codigo, nombre").in("id", resIds)
      : Promise.resolve({ data: [] as ResponsableRow[] }),
    sb.from("workflow_plataformas").select("workflow_id, plataforma_id").in("workflow_id", wfIds),
    sb.from("workflow_tecnologias").select("workflow_id, tecnologia_id").in("workflow_id", wfIds),
  ]);

  const responsables = new Map(
    (responsableRows ?? []).map((r) => [r.id, r as ResponsableRow]),
  );

  const platIds = [...new Set((wpRows ?? []).map((x) => x.plataforma_id).filter(Boolean))] as string[];
  const techIds = [...new Set((wtRows ?? []).map((x) => x.tecnologia_id).filter(Boolean))] as string[];

  const [{ data: plataformas }, { data: tecnologias }] = await Promise.all([
    platIds.length ? sb.from("plataformas").select("id, nombre").in("id", platIds) : Promise.resolve({ data: [] }),
    techIds.length ? sb.from("tecnologias").select("id, nombre").in("id", techIds) : Promise.resolve({ data: [] }),
  ]);

  const platName = new Map((plataformas ?? []).map((p) => [p.id, p.nombre as string]));
  const techName = new Map((tecnologias ?? []).map((t) => [t.id, t.nombre as string]));

  const platsByWorkflow = new Map<string, string[]>();
  for (const link of wpRows ?? []) {
    const name = platName.get(link.plataforma_id);
    if (!name) continue;
    const cur = platsByWorkflow.get(link.workflow_id) ?? [];
    cur.push(name);
    platsByWorkflow.set(link.workflow_id, cur);
  }

  const techsByWorkflow = new Map<string, string[]>();
  for (const link of wtRows ?? []) {
    const name = techName.get(link.tecnologia_id);
    if (!name) continue;
    const cur = techsByWorkflow.get(link.workflow_id) ?? [];
    cur.push(name);
    techsByWorkflow.set(link.workflow_id, cur);
  }

  return rows.map((raw) => {
    const w = (rowDefaults ? { ...rowDefaults, ...raw } : raw) as WorkflowRow;
    return mapWorkflowToProject(w, responsables, platsByWorkflow, techsByWorkflow);
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveWorkflowPk(projectId: string): Promise<string | null> {
  const sb = getSupabaseServerClient();
  if (UUID_RE.test(projectId)) {
    const { data } = await sb.from("workflows").select("id").eq("id", projectId).maybeSingle();
    return data?.id ?? null;
  }
  const { data } = await sb.from("workflows").select("id").eq("legacy_id", projectId).maybeSingle();
  return data?.id ?? null;
}

async function getResponsableIdForCode(ownerCode: OwnerCode): Promise<string> {
  const sb = getSupabaseServerClient();
  const { data, error } = await sb
    .from("responsables")
    .select("id")
    .eq("codigo", ownerCode)
    .maybeSingle();
  if (error || !data?.id) {
    throw new HttpError(500, "SUPABASE_CONFIG", "No hay fila en responsables para el código " + ownerCode);
  }
  return data.id;
}

export async function supabaseSetOwnerOverride(projectId: string, ownerCode: OwnerCode): Promise<void> {
  const pk = await resolveWorkflowPk(projectId);
  if (!pk) throw new HttpError(404, "NOT_FOUND", "Workflow no encontrado.");
  const rid = await getResponsableIdForCode(ownerCode);
  const sb = getSupabaseServerClient();
  const { error } = await sb.from("workflows").update({ owner_override_id: rid }).eq("id", pk);
  if (error) throw new HttpError(500, "SUPABASE_ERROR", error.message);
}

export async function supabaseClearOwnerOverride(projectId: string): Promise<void> {
  const pk = await resolveWorkflowPk(projectId);
  if (!pk) throw new HttpError(404, "NOT_FOUND", "Workflow no encontrado.");
  const sb = getSupabaseServerClient();
  const { error } = await sb.from("workflows").update({ owner_override_id: null }).eq("id", pk);
  if (error) throw new HttpError(500, "SUPABASE_ERROR", error.message);
}

export async function supabaseSetPhaseOverride(projectId: string, phase: ProjectPhase): Promise<void> {
  const pk = await resolveWorkflowPk(projectId);
  if (!pk) throw new HttpError(404, "NOT_FOUND", "Workflow no encontrado.");
  const sb = getSupabaseServerClient();
  const { error } = await sb.from("workflows").update({ fase_override: phase }).eq("id", pk);
  if (error) throw new HttpError(500, "SUPABASE_ERROR", error.message);
}

export async function supabaseClearPhaseOverride(projectId: string): Promise<void> {
  const pk = await resolveWorkflowPk(projectId);
  if (!pk) throw new HttpError(404, "NOT_FOUND", "Workflow no encontrado.");
  const sb = getSupabaseServerClient();
  const { error } = await sb.from("workflows").update({ fase_override: null }).eq("id", pk);
  if (error) throw new HttpError(500, "SUPABASE_ERROR", error.message);
}

function defaultEtiquetaSalud(h: ProjectHealth): string {
  if (h === "activo") return "Activo";
  if (h === "pausado") return "Pausado";
  return "En riesgo";
}

export async function supabasePatchWorkflowDetails(
  projectId: string,
  patch: PatchProjectDetailsBody,
): Promise<void> {
  const pk = await resolveWorkflowPk(projectId);
  if (!pk) throw new HttpError(404, "NOT_FOUND", "Workflow no encontrado.");
  const sb = getSupabaseServerClient();
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.nombre = patch.name;
  if (patch.description !== undefined) row.descripcion = patch.description;
  if (patch.category !== undefined) row.categoria = patch.category;
  if (patch.complexity !== undefined) row.complejidad = patch.complexity;
  if (patch.businessValue !== undefined) row.valor = patch.businessValue;
  if (patch.steps !== undefined) row.pasos = patch.steps;
  if (patch.progress !== undefined) row.progreso = Math.round(patch.progress);
  if (patch.schedule !== undefined) row.cronograma = patch.schedule;
  if (patch.failureRate !== undefined) row.tasa_fallo = patch.failureRate;
  if (patch.riskNote !== undefined) row.nota_riesgo = patch.riskNote;
  if (patch.health !== undefined) {
    row.estatus = patch.health;
    if (patch.healthLabel === undefined) {
      row.etiqueta_salud = defaultEtiquetaSalud(patch.health);
    }
  }
  if (patch.healthLabel !== undefined) row.etiqueta_salud = patch.healthLabel;
  if (Object.keys(row).length === 0) return;
  const { error } = await sb.from("workflows").update(row).eq("id", pk);
  if (error) throw new HttpError(500, "SUPABASE_ERROR", error.message);
}
