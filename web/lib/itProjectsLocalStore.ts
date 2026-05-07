"use client";

import { useEffect, useMemo, useState } from "react";
import { IT_PROJECT_PHASE_ORDER } from "@/lib/itProjectPortfolio";
import type { ItProject, ItProjectPhase } from "@/lib/itProjectTypes";

export const IT_PROJECTS_USER_STORAGE_KEY = "scorecard-it-projects-user-v1";

export const IT_PROJECTS_CHANGED_EVENT = "scorecard-it-projects-changed";

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === "string");
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function sanitizeMilestones(raw: unknown): ItProject["milestones"] {
  if (!Array.isArray(raw)) return [];
  const out: ItProject["milestones"] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!isRecord(row)) continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    const id = typeof row.id === "string" ? row.id : `m-${i + 1}`;
    const dueDate = typeof row.dueDate === "string" ? row.dueDate : "—";
    const done = row.done === true;
    out.push({ id, title, dueDate, done });
  }
  return out;
}

function sanitizeKeyResults(raw: unknown): ItProject["keyResults"] {
  if (!Array.isArray(raw)) return [];
  const out: ItProject["keyResults"] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!isRecord(row)) continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    const id = typeof row.id === "string" ? row.id : `kr-${i + 1}`;
    out.push({ id, title });
  }
  return out;
}

function sanitizePlannedTasks(raw: unknown): ItProject["plannedTasks"] {
  if (!Array.isArray(raw)) return [];
  const out: ItProject["plannedTasks"] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!isRecord(row)) continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    const id = typeof row.id === "string" ? row.id : `task-${i + 1}`;
    out.push({ id, title });
  }
  return out;
}

function sanitizeSprints(raw: unknown): ItProject["sprints"] {
  if (!Array.isArray(raw)) return [];
  const out: ItProject["sprints"] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!isRecord(row)) continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    const id = typeof row.id === "string" ? row.id : `spr-${i + 1}`;
    const timeframe =
      typeof row.timeframe === "string" && row.timeframe.trim() ? row.timeframe.trim() : undefined;
    out.push({ id, title, ...(timeframe ? { timeframe } : {}) });
  }
  return out;
}

function sanitizeDeliverables(raw: unknown): ItProject["deliverables"] {
  if (!Array.isArray(raw)) return [];
  const out: ItProject["deliverables"] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!isRecord(row)) continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    const id = typeof row.id === "string" ? row.id : `del-${i + 1}`;
    const targetDate =
      typeof row.targetDate === "string" && row.targetDate.trim()
        ? row.targetDate.trim()
        : undefined;
    out.push({ id, title, ...(targetDate ? { targetDate } : {}) });
  }
  return out;
}

function isItProjectRecord(x: unknown): x is ItProject {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.code !== "string" ||
    typeof o.name !== "string" ||
    typeof o.description !== "string"
  ) {
    return false;
  }
  if (o.linkedWorkflowIds !== undefined && !isStringArray(o.linkedWorkflowIds)) return false;
  return true;
}

/** Fase única antigua `estrategia` (Backlog+Sin empezar mezclados) → Sin empezar. */
function normalizeStoredProject(p: ItProject): ItProject {
  const raw = p.phase as string;
  const krSource =
    Array.isArray(p.keyResults) ? p.keyResults : (p as unknown as { keyResults?: unknown }).keyResults;
  const milestoneSource = Array.isArray(p.milestones) ? p.milestones : (p as unknown as { milestones?: unknown }).milestones;
  const ptSource = Array.isArray(p.plannedTasks) ? p.plannedTasks : (p as unknown as { plannedTasks?: unknown }).plannedTasks;
  const sprintSource = Array.isArray(p.sprints) ? p.sprints : (p as unknown as { sprints?: unknown }).sprints;
  const delSource = Array.isArray(p.deliverables) ? p.deliverables : (p as unknown as { deliverables?: unknown }).deliverables;

  const base: Omit<ItProject, "phase"> & { phase: ItProjectPhase } = {
    ...p,
    milestones: sanitizeMilestones(milestoneSource),
    keyResults: sanitizeKeyResults(krSource),
    plannedTasks: sanitizePlannedTasks(ptSource),
    sprints: sanitizeSprints(sprintSource),
    deliverables: sanitizeDeliverables(delSource),
  };

  if (raw === "estrategia") {
    return { ...base, phase: "sin_empezar" };
  }
  if (IT_PROJECT_PHASE_ORDER.includes(raw as ItProjectPhase)) {
    return { ...base, phase: raw as ItProjectPhase };
  }
  return { ...base, phase: "sin_empezar" };
}

export function readUserProjects(): ItProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(IT_PROJECTS_USER_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isItProjectRecord).map(normalizeStoredProject);
  } catch {
    return [];
  }
}

export function writeUserProjects(projects: ItProject[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IT_PROJECTS_USER_STORAGE_KEY, JSON.stringify(projects));
}

/** Combina seed y proyectos creados en el navegador; si hay mismo `id`, gana el del usuario. */
export function mergeItProjectsWithSeed(seed: ItProject[], user: ItProject[]): ItProject[] {
  const map = new Map<string, ItProject>();
  for (const p of seed) map.set(p.id, p);
  for (const p of user) map.set(p.id, p);
  return [...map.values()];
}

export function appendUserProject(project: ItProject): void {
  const cur = readUserProjects();
  writeUserProjects([...cur, project]);
  window.dispatchEvent(new CustomEvent(IT_PROJECTS_CHANGED_EVENT));
}

/**
 * Module-level cache for Notion data — shared across all component instances.
 * Prevents duplicate fetches when navigating between Panel ↔ Proyectos.
 */
const notionCache: {
  data: ItProject[] | null;
  error: string | undefined;
  fetchedAt: number;
  promise: Promise<void> | null;
} = { data: null, error: undefined, fetchedAt: 0, promise: null };

const CACHE_TTL_MS = 60_000; // 60s — matches server revalidate

function fetchNotionIfNeeded(
  onData: (d: ItProject[]) => void,
  onError: (e: string) => void,
  onDone: () => void,
): void {
  const now = Date.now();

  // Return cached data immediately if fresh
  if (notionCache.data && now - notionCache.fetchedAt < CACHE_TTL_MS) {
    onData(notionCache.data);
    onDone();
    return;
  }

  // If a fetch is already in-flight, piggyback on it
  if (notionCache.promise) {
    notionCache.promise.then(() => {
      if (notionCache.data) onData(notionCache.data);
      if (notionCache.error) onError(notionCache.error);
      onDone();
    });
    return;
  }

  // Start a new fetch
  notionCache.promise = fetch("/api/notion/projects")
    .then((res) => {
      if (!res.ok) throw new Error("Error HTTP");
      return res.json();
    })
    .then((data) => {
      if (data.projects) {
        notionCache.data = data.projects;
        notionCache.error = undefined;
        notionCache.fetchedAt = Date.now();
        onData(data.projects);
      } else if (data.error) {
        notionCache.error = data.error;
        onError(data.error);
      }
    })
    .catch((err) => {
      console.error("Error fetching Notion projects:", err);
      const msg = "Error fetching Notion projects";
      notionCache.error = msg;
      onError(msg);
    })
    .finally(() => {
      notionCache.promise = null;
      onDone();
    });
}

export function useMergedItProjects(): {
  projects: ItProject[];
  loading: boolean;
  ready: boolean;
  error?: string;
} {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ItProject[]>([]);
  const [notionData, setNotionData] = useState<ItProject[]>(
    () => notionCache.data ?? [],
  );
  const [error, setError] = useState<string | undefined>(notionCache.error);

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      setUser(readUserProjects());
    };
    sync();
    window.addEventListener(IT_PROJECTS_CHANGED_EVENT, sync);

    fetchNotionIfNeeded(
      (d) => { setNotionData(d); setLoading(false); },
      (e) => { setError(e); setLoading(false); },
      () => { setLoading(false); },
    );

    return () => {
      window.removeEventListener(IT_PROJECTS_CHANGED_EVENT, sync);
    };
  }, []);

  const projects = useMemo(() => {
    if (notionData.length === 0 && user.length === 0) return [];
    return mergeItProjectsWithSeed(notionData, user);
  }, [notionData, user]);

  return { projects, loading, ready: mounted && !loading, error };
}
