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
 * En el navegador solo existen variables `NEXT_PUBLIC_*`. Si no, el PATCH al cambiar
 * responsable apuntaba mal o quedaba vacío `API_URL` del servidor.
 *
 * En Vercel (VERCEL=1), si no hay `API_URL` ni `NEXT_PUBLIC_API_URL`, no se asume localhost:
 * el fetch a localhost en SSR rompe el despliegue con un error opaco.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  }
  const raw = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (raw) return raw.replace(/\/$/, "");
  /** En Vercel el env suele ser `1`; en previews también existe `VERCEL`. */
  if (process.env.VERCEL) return "";
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
