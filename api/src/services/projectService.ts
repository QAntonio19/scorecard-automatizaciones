import { deriveAutomationPlatform } from "../automationPlatform.js";
import type { AutomationPlatform } from "../automationPlatform.js";
import { HttpError } from "../httpError.js";
import { OWNER_PROFILE } from "../owners.js";
import {
  readOwnerOverrides,
  readPhaseOverrides,
  readProjects,
  writeOwnerOverrides,
  writePhaseOverrides,
} from "../projectStore.js";
import type {
  OwnerCode,
  PortfolioSummaryResponse,
  ProjectPhase,
  ProjectRecord,
  ProjectsListResponse,
} from "../projectTypes.js";
import type { ListProjectsQuery } from "../projectValidation.js";
import { parseHealthFilter, parseOwnersFilter } from "../projectValidation.js";

function matchesQuery(
  p: ProjectRecord,
  query: ListProjectsQuery,
  owners: OwnerCode[] | null,
  health: ReturnType<typeof parseHealthFilter>,
  platforms: AutomationPlatform[] | null,
): boolean {
  if (owners && !owners.includes(p.ownerCode)) return false;
  if (health && !health.includes(p.health)) return false;
  if (platforms && !platforms.includes(deriveAutomationPlatform(p))) return false;
  if (query.category && query.category.trim() && p.category !== query.category.trim()) {
    return false;
  }
  if (query.q) {
    const n = query.q.toLowerCase();
    const hay =
      p.name.toLowerCase().includes(n) ||
      p.description.toLowerCase().includes(n) ||
      p.category.toLowerCase().includes(n) ||
      p.ownerName.toLowerCase().includes(n) ||
      p.technologies.some((t) => t.toLowerCase().includes(n));
    if (!hay) return false;
  }
  return true;
}

export function listProjects(
  query: ListProjectsQuery,
  owners: OwnerCode[] | null,
  health: ReturnType<typeof parseHealthFilter>,
  platforms: AutomationPlatform[] | null,
): ProjectsListResponse {
  const items = readProjects().filter((p) =>
    matchesQuery(p, query, owners, health, platforms),
  );
  return { items, total: items.length };
}

export function getProjectById(id: string): ProjectRecord {
  const found = readProjects().find((p) => p.id === id);
  if (!found) {
    throw new HttpError(404, "NOT_FOUND", "Proyecto no encontrado.");
  }
  return found;
}

/** Incluye si el responsable viene de `project-owner-overrides.json` (asignación manual). */
export function getProjectByIdWithMeta(
  id: string,
): ProjectRecord & { ownerIsManual: boolean; phaseIsManual: boolean } {
  const p = getProjectById(id);
  const overrides = readOwnerOverrides();
  const phaseOv = readPhaseOverrides();
  return { ...p, ownerIsManual: id in overrides, phaseIsManual: id in phaseOv };
}

export function setProjectOwner(id: string, ownerCode: OwnerCode): ProjectRecord {
  if (!readProjects().some((p) => p.id === id)) {
    throw new HttpError(404, "NOT_FOUND", "Proyecto no encontrado.");
  }
  const { ownerName } = OWNER_PROFILE[ownerCode];
  const overrides = readOwnerOverrides();
  overrides[id] = { ownerCode, ownerName };
  writeOwnerOverrides(overrides);
  return getProjectById(id);
}

/** Quita la asignación manual y vuelve al responsable que viene de datos base / sync. */
export function clearProjectOwnerOverride(id: string): ProjectRecord {
  if (!readProjects().some((p) => p.id === id)) {
    throw new HttpError(404, "NOT_FOUND", "Proyecto no encontrado.");
  }
  const overrides = readOwnerOverrides();
  if (!(id in overrides)) {
    return getProjectById(id);
  }
  const next = { ...overrides };
  delete next[id];
  writeOwnerOverrides(next);
  return getProjectById(id);
}

export function setProjectPhase(id: string, phase: ProjectPhase): ProjectRecord {
  if (!readProjects().some((p) => p.id === id)) {
    throw new HttpError(404, "NOT_FOUND", "Proyecto no encontrado.");
  }
  const o = readPhaseOverrides();
  const next = { ...o, [id]: phase };
  writePhaseOverrides(next);
  return getProjectById(id);
}

/** Quita la fase manual y aplica la que venga de datos base o del sync. */
export function clearProjectPhaseOverride(id: string): ProjectRecord {
  if (!readProjects().some((p) => p.id === id)) {
    throw new HttpError(404, "NOT_FOUND", "Proyecto no encontrado.");
  }
  const o = readPhaseOverrides();
  if (!(id in o)) {
    return getProjectById(id);
  }
  const next = { ...o };
  delete next[id];
  writePhaseOverrides(next);
  return getProjectById(id);
}

export function getPortfolioSummary(): PortfolioSummaryResponse {
  const all = readProjects();
  const activos = all.filter((p) => p.health === "activo").length;
  const pausados = all.filter((p) => p.health === "pausado").length;
  const enRiesgo = all.filter((p) => p.health === "en_riesgo").length;

  const ja = all.filter((p) => p.ownerCode === "JA").length;
  const ev = all.filter((p) => p.ownerCode === "EV").length;

  const matrixPoints = all.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    complexity: p.complexity,
    businessValue: p.businessValue,
    health: p.health,
    healthLabel: p.healthLabel,
    phase: p.phase,
    ownerName: p.ownerName,
    platform: p.platform,
  }));

  const risk = all.filter((p) => p.health === "en_riesgo");
  const paused = all.filter((p) => p.health === "pausado");
  const activeNotStarted = all.filter(
    (p) =>
      p.health === "activo" &&
      (p.phase === "por_iniciar" || p.phase === "backlog"),
  );
  const attentionIds = new Set<string>();
  const attention: PortfolioSummaryResponse["attention"] = [];

  const pushAttention = (p: ProjectRecord) => {
    if (attentionIds.has(p.id)) return;
    attentionIds.add(p.id);
    attention.push({
      id: p.id,
      name: p.name,
      ownerName: p.ownerName,
      health: p.health,
      healthLabel: p.healthLabel,
      failureRate: p.failureRate,
    });
  };

  for (const p of [...risk].sort((a, b) => (b.failureRate ?? 0) - (a.failureRate ?? 0))) {
    pushAttention(p);
  }
  for (const p of paused) pushAttention(p);
  for (const p of activeNotStarted) pushAttention(p);

  const categories = [...new Set(all.map((p) => p.category))].sort((a, b) =>
    a.localeCompare(b, "es-MX"),
  );

  const workflowCounts = { n8n: 0, make: 0, codigo_puro: 0 };
  for (const p of all) {
    workflowCounts[deriveAutomationPlatform(p)] += 1;
  }

  return {
    total: all.length,
    activos,
    pausados,
    enRiesgo,
    workflowCounts,
    categories,
    workload: [
      { ownerCode: "JA", ownerName: "Juan Antonio", count: ja },
      { ownerCode: "EV", ownerName: "Evelyn", count: ev },
    ],
    matrixPoints,
    attention,
  };
}
