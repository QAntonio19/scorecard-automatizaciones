import type {
  PortfolioSummaryResponse,
  ProjectRecord,
  ProjectsListResponse,
  WorkflowPlatformCounts,
} from "./projectTypes";

const EMPTY_WORKFLOW_COUNTS: WorkflowPlatformCounts = {
  n8n: 0,
  make: 0,
  codigo_puro: 0,
};

/**
 * Resolución de la base para `/api/*`:
 *
 * - `NEXT_PUBLIC_API_URL` o `API_URL`: llamada directa al backend (CORS debe permitir el origen del front).
 * - `SCORECARD_API_ORIGIN`: en **cliente** el proxy de Next (`/api/*` → backend) usa URL relativa
 *   (`NEXT_PUBLIC_SCORECARD_PROXY`). En **servidor** (RSC, Server Actions) llamamos al backend **directamente**
 *   con esta URL: evita `fetch` al propio deploy en Vercel (`https://$VERCEL_URL/api/...`), que a menudo falla
 *   (self-invocation, DNS o timeouts) aunque la API en Render esté bien.
 *
 * En Vercel sin ninguna de las anteriores, no hay base válida (se muestra aviso de configuración).
 */
function isLocalhostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const explicit = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
    if (explicit) return explicit;
    if (process.env.NEXT_PUBLIC_SCORECARD_PROXY === "1") return "";
    return "http://localhost:4000".replace(/\/$/, "");
  }

  const onVercel = Boolean(process.env.VERCEL);
  const explicit = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)?.trim().replace(/\/$/, "");
  /** En Vercel, `API_URL`/`NEXT_PUBLIC_API_URL` a menudo quedan en localhost por un .env local — eso rompe el SSR. */
  if (explicit && !(onVercel && isLocalhostUrl(explicit))) {
    return explicit;
  }

  const scorecardOrigin =
    process.env.SCORECARD_API_ORIGIN?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SCORECARD_API_ORIGIN?.trim().replace(/\/$/, "");
  if (scorecardOrigin) {
    return scorecardOrigin;
  }

  if (onVercel) return "";
  return "http://localhost:4000";
}

export class ApiNotConfiguredError extends Error {
  constructor() {
    super("API_NOT_CONFIGURED");
    this.name = "ApiNotConfiguredError";
  }
}

/** `instanceof` a veces falla con el mismo error en otro bundle; usar esto en catch. */
export function isApiNotConfiguredError(e: unknown): boolean {
  return (
    e instanceof ApiNotConfiguredError ||
    (typeof e === "object" &&
      e !== null &&
      "name" in e &&
      (e as { name: string }).name === "ApiNotConfiguredError")
  );
}

function assertServerApiConfigured(): void {
  if (typeof window === "undefined" && !getApiBaseUrl()) {
    throw new ApiNotConfiguredError();
  }
}

export interface ProjectsQuery {
  owners?: string;
  health?: string;
  platform?: string;
  category?: string;
  q?: string;
}

function buildQueryString(params: ProjectsQuery): string {
  const search = new URLSearchParams();
  if (params.owners) search.set("owners", params.owners);
  if (params.health) search.set("health", params.health);
  if (params.platform) search.set("platform", params.platform);
  if (params.category) search.set("category", params.category);
  if (params.q) search.set("q", params.q);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchProjectsList(
  params: ProjectsQuery,
): Promise<ProjectsListResponse> {
  assertServerApiConfigured();
  const url = `${getApiBaseUrl()}/api/projects${buildQueryString(params)}`;
  /** Sin caché: tras PATCH (fase, responsable) `router.refresh()` debe ver datos al instante. */
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudieron cargar los proyectos (${res.status})`);
  return (await res.json()) as ProjectsListResponse;
}

function normalizePortfolioSummary(raw: unknown): PortfolioSummaryResponse {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<PortfolioSummaryResponse>;
  return {
    total: typeof r.total === "number" ? r.total : 0,
    activos: typeof r.activos === "number" ? r.activos : 0,
    pausados: typeof r.pausados === "number" ? r.pausados : 0,
    enRiesgo: typeof r.enRiesgo === "number" ? r.enRiesgo : 0,
    workflowCounts: r.workflowCounts ?? EMPTY_WORKFLOW_COUNTS,
    categories: Array.isArray(r.categories) ? r.categories : [],
    workload: Array.isArray(r.workload) ? r.workload : [],
    matrixPoints: Array.isArray(r.matrixPoints) ? r.matrixPoints : [],
    attention: Array.isArray(r.attention) ? r.attention : [],
  };
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummaryResponse> {
  assertServerApiConfigured();
  const url = `${getApiBaseUrl()}/api/projects/summary`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar el scorecard (${res.status})`);
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new Error("La API devolvió un cuerpo que no es JSON válido.");
  }
  return normalizePortfolioSummary(parsed);
}

export async function fetchProjectById(id: string): Promise<ProjectRecord | null> {
  assertServerApiConfigured();
  const url = `${getApiBaseUrl()}/api/projects/${encodeURIComponent(id)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`No se pudo cargar el proyecto (${res.status})`);
  return (await res.json()) as ProjectRecord;
}
