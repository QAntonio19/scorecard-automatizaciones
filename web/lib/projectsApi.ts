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
  if (process.env.VERCEL === "1") return "";
  return "http://localhost:4000";
}

export class ApiNotConfiguredError extends Error {
  constructor() {
    super("API_NOT_CONFIGURED");
    this.name = "ApiNotConfiguredError";
  }
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

export async function fetchPortfolioSummary(): Promise<PortfolioSummaryResponse> {
  assertServerApiConfigured();
  const url = `${getApiBaseUrl()}/api/projects/summary`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar el scorecard (${res.status})`);
  const raw = (await res.json()) as PortfolioSummaryResponse;
  return {
    ...raw,
    workflowCounts: raw.workflowCounts ?? EMPTY_WORKFLOW_COUNTS,
  };
}

export async function fetchProjectById(id: string): Promise<ProjectRecord | null> {
  assertServerApiConfigured();
  const url = `${getApiBaseUrl()}/api/projects/${encodeURIComponent(id)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`No se pudo cargar el proyecto (${res.status})`);
  return (await res.json()) as ProjectRecord;
}
