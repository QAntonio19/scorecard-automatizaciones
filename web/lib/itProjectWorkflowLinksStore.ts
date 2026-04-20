"use client";

import type { ItProject } from "@/lib/itProjectTypes";

/**
 * Sobrescribe `linkedWorkflowIds` por proyecto (incluye proyectos del seed).
 * Permite relacionar iniciativas IT con filas del scorecard de Workflows sin API de proyectos.
 */
export const IT_PROJECT_WORKFLOW_LINKS_KEY = "scorecard-it-project-workflow-links-v1";

export const IT_PROJECT_WORKFLOW_LINKS_CHANGED_EVENT = "scorecard-it-project-workflow-links-changed";

export type WorkflowLinkOverrides = Record<string, string[]>;

function readRaw(): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(IT_PROJECT_WORKFLOW_LINKS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === "string");
}

export function readWorkflowLinkOverrides(): WorkflowLinkOverrides {
  const raw = readRaw();
  if (!raw || typeof raw !== "object") return {};
  const out: WorkflowLinkOverrides = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isStringArray(v)) out[k] = v;
  }
  return out;
}

export function writeWorkflowLinkOverrides(map: WorkflowLinkOverrides): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IT_PROJECT_WORKFLOW_LINKS_KEY, JSON.stringify(map));
}

export function setProjectWorkflowLinks(projectId: string, workflowIds: string[]): void {
  const cur = readWorkflowLinkOverrides();
  const deduped = [...new Set(workflowIds.map((id) => id.trim()).filter(Boolean))];
  writeWorkflowLinkOverrides({ ...cur, [projectId]: deduped });
  window.dispatchEvent(new CustomEvent(IT_PROJECT_WORKFLOW_LINKS_CHANGED_EVENT));
}

/** Elimina override: vuelve a usar `linkedWorkflowIds` definidos en el proyecto (p. ej. seed). */
export function clearProjectWorkflowLinksOverride(projectId: string): void {
  const cur = readWorkflowLinkOverrides();
  if (!(projectId in cur)) return;
  const { [projectId]: _, ...rest } = cur;
  writeWorkflowLinkOverrides(rest);
  window.dispatchEvent(new CustomEvent(IT_PROJECT_WORKFLOW_LINKS_CHANGED_EVENT));
}

export function applyWorkflowLinkOverrides(
  projects: ItProject[],
  overrides: WorkflowLinkOverrides,
): ItProject[] {
  return projects.map((p) => {
    const over = overrides[p.id];
    if (over === undefined) return p;
    return { ...p, linkedWorkflowIds: over };
  });
}
