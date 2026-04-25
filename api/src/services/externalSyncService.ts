import { refreshEnvFromDisk } from "../loadEnv.js";
import { OWNER_PROFILE } from "../owners.js";
import type { OwnerCode, ProjectHealth, ProjectPhase, ProjectRecord } from "../projectTypes.js";
import { writeExternalProjects } from "../projectStore.js";

/**
 * n8n/Make no exponen en nuestra integración un "responsable" por workflow comparable a JA/EV.
 * Cada workflow importado lleva este responsable por defecto hasta que lo cambies en la app
 * (se guarda en project-owner-overrides.json). Config: EXTERNAL_SYNC_DEFAULT_OWNER=JA|EV
 */
function externalSyncDefaultOwner(): { ownerCode: OwnerCode; ownerName: string } {
  const raw = process.env.EXTERNAL_SYNC_DEFAULT_OWNER?.trim().toUpperCase();
  const code: OwnerCode = raw === "JA" ? "JA" : "EV";
  const { ownerName } = OWNER_PROFILE[code];
  return { ownerCode: code, ownerName };
}

type ExternalSource = "n8n" | "make";

interface ExternalSyncRunStatus {
  startedAt: string;
  finishedAt: string;
  importedCount: number;
  /** Cuántos registros vino de cada plataforma (útil si solo configuras n8n). */
  breakdown: { n8n: number; make: number };
  errors: string[];
  /** Motivos por los que no se consultó una fuente (p. ej. .env no cargado). */
  warnings: string[];
}

interface N8nWorkflow {
  id: string | number;
  name: string;
  active?: boolean;
  /** n8n >= 1.x: true cuando el workflow está archivado (ya no se activa ni ejecuta). */
  isArchived?: boolean;
  tags?: Array<{ name?: string } | string>;
  /** ISO-8601: última modificación del workflow en n8n. */
  updatedAt?: string;
}

interface MakeScenario {
  id: string | number;
  name: string;
  isActive?: boolean;
  active?: boolean;
  status?: string;
  tags?: string[];
}

let latestSync: ExternalSyncRunStatus | null = null;

function parseBooleanEnv(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  return value.trim().toLowerCase() === "true";
}

/** SYNC_SOURCES=n8n | make | n8n,make — por defecto ambas. Usa solo `n8n` para traer únicamente workflows de n8n. */
function syncSourceSet(): Set<"n8n" | "make"> {
  const raw = process.env.SYNC_SOURCES?.trim();
  if (!raw) return new Set(["n8n", "make"]);
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const next = new Set<"n8n" | "make">();
  for (const p of parts) {
    if (p === "n8n" || p === "make") next.add(p);
  }
  return next.size > 0 ? next : new Set(["n8n", "make"]);
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

function normalizeId(source: ExternalSource, id: string | number): string {
  return `${source}-${String(id)}`;
}

function inferHealth(active: boolean, failed: boolean): ProjectHealth {
  if (!active) return "pausado";
  if (failed) return "en_riesgo";
  return "activo";
}

function inferHealthLabel(health: ProjectHealth): string {
  if (health === "activo") return "Activo";
  if (health === "pausado") return "Pausado";
  return "En riesgo";
}

/**
 * Sync sin "aprobacion" de negocio: pausado -> aun no en marcha; activo/riesgo -> en curso.
 * `archived` tiene precedencia: workflow retirado permanentemente en n8n.
 */
function inferPhase(health: ProjectHealth, archived = false): ProjectPhase {
  if (archived) return "archivado";
  if (health === "pausado") return "por_iniciar";
  return "en_proceso";
}

function inferProgress(health: ProjectHealth, archived = false): number {
  if (archived) return 0;
  if (health === "activo") return 70;
  if (health === "pausado") return 15;
  return 45;
}

function tagsToTechnologies(rawTags: Array<{ name?: string } | string> | undefined): string[] {
  if (!rawTags || rawTags.length === 0) return [];
  const tags = rawTags
    .map((tag) => (typeof tag === "string" ? tag : tag.name))
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return [...new Set(tags)];
}

function mapN8nWorkflow(workflow: N8nWorkflow): ProjectRecord {
  const archived = Boolean(workflow.isArchived);
  const active = !archived && Boolean(workflow.active);
  const health = inferHealth(active, false);
  const technologies = ["n8n", ...tagsToTechnologies(workflow.tags)];
  const owner = externalSyncDefaultOwner();
  return {
    id: normalizeId("n8n", workflow.id),
    name: workflow.name,
    description: "Sincronizado automaticamente desde n8n.",
    phase: inferPhase(health, archived),
    health,
    healthLabel: inferHealthLabel(health),
    ownerCode: owner.ownerCode,
    ownerName: owner.ownerName,
    category: "Automatizacion n8n",
    platform: "n8n",
    steps: 0,
    schedule: archived ? "Archivado en n8n" : active ? "Activo en n8n" : "Pausado en n8n",
    progress: inferProgress(health, archived),
    technologies,
    failureRate: null,
    riskNote: archived ? "Workflow archivado en n8n." : null,
    complexity: 5,
    businessValue: 6,
    updatedAt: workflow.updatedAt,
  };
}

function mapMakeScenario(scenario: MakeScenario): ProjectRecord {
  const active = Boolean(
    scenario.isActive ??
      scenario.active ??
      scenario.status?.toLowerCase() === "active",
  );
  const failed = String(scenario.status ?? "").toLowerCase().includes("error");
  const health = inferHealth(active, failed);
  const technologies = ["Make", ...(scenario.tags ?? [])];
  const owner = externalSyncDefaultOwner();
  return {
    id: normalizeId("make", scenario.id),
    name: scenario.name,
    description: "Sincronizado automaticamente desde Make.",
    phase: inferPhase(health),
    health,
    healthLabel: inferHealthLabel(health),
    ownerCode: owner.ownerCode,
    ownerName: owner.ownerName,
    category: "Automatizacion Make",
    platform: "Make",
    steps: 0,
    schedule: active ? "Activo en Make" : "Pausado en Make",
    progress: inferProgress(health),
    technologies,
    failureRate: null,
    riskNote: failed ? "Make reporta estado de error." : null,
    complexity: 5,
    businessValue: 6,
  };
}

/**
 * Misma estrategia que `scripts/diagnose-n8n.mjs`: `fetch` nativo con `redirect: follow`.
 * Evita diferencias con el diagnostico (User-Agent propio, redirect manual) que en algunos
 * entornos acababan en 401 frente a la misma clave.
 */
async function fetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, { headers, redirect: "follow" });
  const finalUrl = res.url;
  if (!res.ok) {
    const hint = await res.text();
    const short = hint.length > 200 ? `${hint.slice(0, 200)}...` : hint;
    throw new Error(
      `HTTP ${res.status} al consultar ${finalUrl}${short ? ` — ${short}` : ""}`,
    );
  }
  return (await res.json()) as unknown;
}

/** Quita espacios, BOM y comillas tipicas de .env mal copiado. */
export function normalizeSecret(raw: string): string {
  let s = raw.trim();
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1).trim();
  }
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** Si falta esquema, asume https (n8n Cloud). */
function ensureHttpsOrigin(raw: string): string {
  const t = raw.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/**
 * n8n: por defecto `X-N8N-API-KEY`; si recibe 401, reintenta con Bearer (algunas instancias / claves JWT).
 * Forzar con N8N_AUTH_MODE=api_key | bearer | auto (auto = comportamiento por defecto).
 */
async function n8nFetchAuthed(url: string, apiKey: string): Promise<unknown> {
  const mode = process.env.N8N_AUTH_MODE?.trim().toLowerCase();
  const headerApiKey = (): Record<string, string> => ({
    "X-N8N-API-KEY": apiKey,
    Accept: "application/json",
  });
  const headerBearer = (): Record<string, string> => ({
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  });
  if (mode === "bearer") return fetchJson(url, headerBearer());
  if (mode === "api_key") return fetchJson(url, headerApiKey());
  try {
    return await fetchJson(url, headerApiKey());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("HTTP 401")) throw e;
  }
  return fetchJson(url, headerBearer());
}

/**
 * Make API v2: cabecera documentada `Authorization: Token <token>`.
 * MAKE_AUTH_MODE=token | bearer — por defecto `token` (no reintentamos Bearer: el fallback
 * confundia el mensaje con "Invalid bearer token" cuando el problema era el token en si).
 */
async function makeFetchAuthed(url: string, token: string): Promise<unknown> {
  const mode = process.env.MAKE_AUTH_MODE?.trim().toLowerCase();
  const headerToken = (): Record<string, string> => ({
    Authorization: `Token ${token}`,
    Accept: "application/json",
  });
  const headerBearer = (): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  });
  if (mode === "bearer") return fetchJson(url, headerBearer());
  return fetchJson(url, headerToken());
}

async function fetchN8nProjects(): Promise<ProjectRecord[]> {
  const baseUrl = process.env.N8N_API_BASE_URL?.trim();
  const rawKey = process.env.N8N_API_KEY;
  if (!baseUrl || !rawKey) return [];
  const apiKey = normalizeSecret(rawKey);
  if (!apiKey) return [];

  const base = ensureHttpsOrigin(baseUrl);
  const projectId = process.env.N8N_PROJECT_ID?.trim();
  const pageLimit = Math.min(
    250,
    Math.max(1, Number(process.env.N8N_WORKFLOWS_PAGE_LIMIT) || 100),
  );

  const workflows: N8nWorkflow[] = [];
  let cursor: string | undefined;
  do {
    const params = new URLSearchParams();
    params.set("limit", String(pageLimit));
    if (cursor) params.set("cursor", cursor);
    if (projectId) params.set("projectId", projectId);

    const url = `${base}/api/v1/workflows?${params.toString()}`;
    const payload = await n8nFetchAuthed(url, apiKey);
    const batch = asArray<N8nWorkflow>(
      (payload as { data?: unknown }).data ??
        (payload as { workflows?: unknown }).workflows ??
        [],
    );
    workflows.push(...batch);
    const next = (payload as { nextCursor?: string }).nextCursor;
    cursor = typeof next === "string" && next.trim() ? next.trim() : undefined;
  } while (cursor);

  return workflows
    .filter((w) => w.id != null && typeof w.name === "string" && w.name.trim().length > 0)
    .map(mapN8nWorkflow);
}

interface MakeOrganization {
  id?: number;
  organizationId?: number;
}

async function resolveMakeOrganizationId(
  baseUrl: string,
  token: string,
): Promise<number> {
  const explicit = process.env.MAKE_ORGANIZATION_ID?.trim();
  if (explicit) {
    const n = Number(explicit);
    if (!Number.isFinite(n)) {
      throw new Error("MAKE_ORGANIZATION_ID no es un numero valido.");
    }
    return n;
  }

  const orgUrl = `${baseUrl.replace(/\/$/, "")}/organizations`;
  const payload = await makeFetchAuthed(orgUrl, token);
  const orgs = asArray<MakeOrganization>(
    (payload as { organizations?: unknown }).organizations ?? payload,
  );
  const first = orgs[0];
  const id = first?.id ?? first?.organizationId;
  if (id == null || !Number.isFinite(Number(id))) {
    throw new Error(
      "No se pudo resolver organizationId de Make. Define MAKE_ORGANIZATION_ID en .env.",
    );
  }
  return Number(id);
}

async function fetchMakeProjects(): Promise<ProjectRecord[]> {
  const baseUrl = ensureHttpsOrigin(
    process.env.MAKE_API_BASE_URL?.trim() ?? "https://eu1.make.com/api/v2",
  );
  const rawToken = process.env.MAKE_API_TOKEN;
  if (!rawToken) return [];
  const token = normalizeSecret(rawToken);
  if (!token) return [];

  const organizationId = await resolveMakeOrganizationId(baseUrl, token);
  const limit = Math.min(
    500,
    Math.max(1, Number(process.env.MAKE_SCENARIOS_PAGE_LIMIT) || 100),
  );

  const scenarios: MakeScenario[] = [];
  let offset = 0;

  for (;;) {
    const params = new URLSearchParams();
    params.set("organizationId", String(organizationId));
    params.set("pg[limit]", String(limit));
    params.set("pg[offset]", String(offset));

    const url = `${baseUrl.replace(/\/$/, "")}/scenarios?${params.toString()}`;
    const payload = await makeFetchAuthed(url, token);
    const batch = asArray<MakeScenario>(
      (payload as { scenarios?: unknown }).scenarios ??
        (payload as { data?: unknown }).data ??
        payload,
    );
    scenarios.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return scenarios
    .filter((s) => s.id != null && typeof s.name === "string" && s.name.trim().length > 0)
    .map(mapMakeScenario);
}

export async function syncExternalProjects(): Promise<ExternalSyncRunStatus> {
  refreshEnvFromDisk();
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const warnings: string[] = [];
  const sources = syncSourceSet();

  let fromN8n: ProjectRecord[] = [];
  let fromMake: ProjectRecord[] = [];

  const n8nBase = process.env.N8N_API_BASE_URL?.trim();
  const n8nKey = process.env.N8N_API_KEY
    ? normalizeSecret(process.env.N8N_API_KEY)
    : "";

  if (sources.has("n8n")) {
    if (!n8nBase || !n8nKey) {
      warnings.push(
        !n8nBase && !n8nKey
          ? "n8n omitido: faltan N8N_API_BASE_URL y N8N_API_KEY (revisa api/.env y reinicia la API)"
          : !n8nBase
            ? "n8n omitido: falta N8N_API_BASE_URL"
            : "n8n omitido: falta N8N_API_KEY",
      );
    } else {
      try {
        fromN8n = await fetchN8nProjects();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido en n8n";
        const hint401 = message.includes("HTTP 401")
          ? " Revisa N8N_API_KEY (Settings -> n8n API, clave completa al crearla)."
          : "";
        errors.push(`n8n: ${message}${hint401}`);
      }
    }
  }

  const makeToken = process.env.MAKE_API_TOKEN
    ? normalizeSecret(process.env.MAKE_API_TOKEN)
    : "";

  if (sources.has("make")) {
    if (!makeToken) {
      warnings.push("Make omitido: falta MAKE_API_TOKEN");
    } else if (/^replace_with_make_token$/i.test(makeToken.trim())) {
      warnings.push(
        "Make omitido: MAKE_API_TOKEN sigue siendo el placeholder; en Make -> perfil -> API crea un token y pegalo en api/.env.",
      );
    } else {
      try {
        fromMake = await fetchMakeProjects();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido en Make";
        const hint401 = message.includes("HTTP 401")
          ? " Revisa MAKE_API_TOKEN, MAKE_API_BASE_URL (region eu1/eu2/...) y MAKE_ORGANIZATION_ID."
          : "";
        errors.push(`Make: ${message}${hint401}`);
      }
    }
  }

  const imported = [...fromN8n, ...fromMake];
  writeExternalProjects(imported);

  latestSync = {
    startedAt,
    finishedAt: new Date().toISOString(),
    importedCount: imported.length,
    breakdown: { n8n: fromN8n.length, make: fromMake.length },
    errors,
    warnings,
  };
  return latestSync;
}

export function getExternalSyncStatus(): ExternalSyncRunStatus | null {
  return latestSync;
}

export function isExternalSyncEnabled(): boolean {
  return parseBooleanEnv(process.env.EXTERNAL_SYNC_ENABLED, false);
}
