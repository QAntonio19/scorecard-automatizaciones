import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { OwnerCode, ProjectRecord } from "./projectTypes.js";

type ProjectsDataMode = "merged" | "external_only" | "json_only";

/** Responsable persistido por id de proyecto (sobrevive a sync n8n/Make). */
export type OwnerOverrideEntry = { ownerCode: OwnerCode; ownerName: string };

export type OwnerOverridesFile = Record<string, OwnerOverrideEntry>;

function getProjectsDataMode(): ProjectsDataMode {
  const raw = process.env.PROJECTS_DATA_MODE?.trim().toLowerCase();
  if (raw === "external_only" || raw === "json_only" || raw === "merged") {
    return raw;
  }
  return "merged";
}

const dataPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "projects.json",
);

const externalDataPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "external-projects.json",
);

const ownerOverridesPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "project-owner-overrides.json",
);

function readBaseProjects(): ProjectRecord[] {
  const raw = readFileSync(dataPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid projects data: expected array");
  }
  return parsed as ProjectRecord[];
}

export function readExternalProjects(): ProjectRecord[] {
  if (!existsSync(externalDataPath)) return [];
  const raw = readFileSync(externalDataPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid external projects data: expected array");
  }
  return parsed as ProjectRecord[];
}

export function writeExternalProjects(projects: ProjectRecord[]): void {
  writeFileSync(externalDataPath, JSON.stringify(projects, null, 2), "utf-8");
}

export function readOwnerOverrides(): OwnerOverridesFile {
  if (!existsSync(ownerOverridesPath)) return {};
  const raw = readFileSync(ownerOverridesPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid project-owner-overrides.json: expected object");
  }
  return parsed as OwnerOverridesFile;
}

export function writeOwnerOverrides(overrides: OwnerOverridesFile): void {
  writeFileSync(ownerOverridesPath, JSON.stringify(overrides, null, 2), "utf-8");
}

function applyOwnerOverrides(projects: ProjectRecord[]): ProjectRecord[] {
  const o = readOwnerOverrides();
  const keys = Object.keys(o);
  if (keys.length === 0) return projects;
  return projects.map((p) => {
    const ov = o[p.id];
    if (!ov) return p;
    return { ...p, ownerCode: ov.ownerCode, ownerName: ov.ownerName };
  });
}

function mergeProjectsCore(): ProjectRecord[] {
  const mode = getProjectsDataMode();
  const base = readBaseProjects();
  const external = readExternalProjects();

  if (mode === "json_only") {
    return base;
  }
  if (mode === "external_only") {
    return external;
  }

  if (external.length === 0) return base;

  const byId = new Map(base.map((item) => [item.id, item]));
  for (const ext of external) {
    const current = byId.get(ext.id);
    byId.set(ext.id, current ? { ...current, ...ext } : ext);
  }
  return [...byId.values()];
}

export function readProjects(): ProjectRecord[] {
  return applyOwnerOverrides(mergeProjectsCore());
}
