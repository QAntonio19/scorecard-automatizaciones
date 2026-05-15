"use client";

import { useEffect, useMemo, useState } from "react";
import { IT_PROJECT_PHASE_ORDER } from "@/lib/itProjectPortfolio";
import type { ItProject, ItProjectPhase } from "@/lib/itProjectTypes";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";

export const IT_PROJECTS_USER_STORAGE_KEY = "scorecard-it-projects-user-v1";

export const IT_PROJECTS_CHANGED_EVENT = "scorecard-it-projects-changed";

/** Emite después de invalidar la caché Notion (`invalidated`) o fusionar una fila (`upserted`). */
export const IT_NOTION_PROJECTS_CACHE_EVENT = "scorecard-it-notion-projects-cache";

export type ITNotionProjectsCacheEventDetail = { reason: "invalidated" } | { reason: "upserted" };

/** Texto de descripción de proyecto guardado aquí cuando Notion no devuelve la columna o el refetch pisa la caché. */
const IT_NOTION_DESCRIPTION_OVERLAY_KEY = "scorecard-notion-project-description-overlay-v1";

function readNotionDescriptionOverlayMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(IT_NOTION_DESCRIPTION_OVERLAY_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function writeNotionDescriptionOverlayMap(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IT_NOTION_DESCRIPTION_OVERLAY_KEY, JSON.stringify(map));
}

/** Persiste la descripción que el usuario guarda en la app (proyecto Notion) para sobrevivir a refetch y recargas. */
function rememberNotionProjectDescriptionOverlay(project: ItProject): void {
  if (!isLikelyNotionPageId(project.id)) return;
  const map = readNotionDescriptionOverlayMap();
  const t = (project.description ?? "").trim();
  if (t === "" || t === "—") {
    delete map[project.id];
  } else {
    map[project.id] = t.slice(0, 16_000);
  }
  writeNotionDescriptionOverlayMap(map);
}

/** Conserva `sprintBoardColumn` en refetch cuando el listado aún no hidrata esa propiedad desde Notion. */
function mergePlannedTasksPreserveSprintBoard(prev: ItProject, next: ItProject): ItProject {
  if (!isLikelyNotionPageId(next.id) || prev.plannedTasks.length === 0) return next;
  const prevById = new Map(prev.plannedTasks.map((t) => [t.id, t]));
  return {
    ...next,
    plannedTasks: next.plannedTasks.map((t) => {
      if (t.sprintBoardColumn !== undefined && t.description !== undefined && t.assigneeName !== undefined && t.targetDate !== undefined) return t;
      const pv = prevById.get(t.id);
      if (!pv) return t;
      let nextT = t;
      if (nextT.sprintBoardColumn === undefined && pv.sprintBoardColumn !== undefined) {
        nextT = { ...nextT, sprintBoardColumn: pv.sprintBoardColumn };
      }
      if (nextT.description === undefined && pv.description !== undefined) {
        nextT = { ...nextT, description: pv.description };
      }
      if (nextT.assigneeName === undefined && pv.assigneeName !== undefined) {
        nextT = { ...nextT, assigneeName: pv.assigneeName };
      }
      if (nextT.targetDate === undefined && pv.targetDate !== undefined) {
        nextT = { ...nextT, targetDate: pv.targetDate };
      }
      return nextT;
    }),
  };
}

/**
 * Cuando la API devuelve proyectos sin descripción (columna ausente en Notion o lista incompleta),
 * conserva la descripción que ya teníamos en caché o en el overlay local.
 */
export function mergeNotionProjectsPreserveLocalDescriptions(
  incoming: ItProject[],
  previous: ItProject[] | null | undefined,
): ItProject[] {
  const prevById = new Map((previous ?? []).map((p) => [p.id, p]));
  const overlay = readNotionDescriptionOverlayMap();

  return incoming.map((p) => {
    const old = prevById.get(p.id);
    let next = p;

    if (isLikelyNotionPageId(p.id)) {
      const incD = (p.description ?? "").trim();
      const incEmpty = incD === "" || incD === "—";
      if (incEmpty) {
        const oldD = (old?.description ?? "").trim();
        const oldRich = oldD !== "" && oldD !== "—";
        if (oldRich) {
          next = { ...p, description: old!.description };
        } else {
          const fromOverlay = overlay[p.id]?.trim() ?? "";
          if (fromOverlay !== "" && fromOverlay !== "—") {
            next = { ...p, description: fromOverlay };
          }
        }
      }
    }

    if (old && isLikelyNotionPageId(next.id)) {
      next = mergePlannedTasksPreserveSprintBoard(old, next);
    }

    return next;
  });
}

/** Para GET puntual de un proyecto Notion cuando la respuesta no incluye descripción. */
export function withNotionDescriptionOverlayIfMissing(project: ItProject): ItProject {
  if (!isLikelyNotionPageId(project.id)) return project;
  const incD = (project.description ?? "").trim();
  if (incD !== "" && incD !== "—") return project;
  const map = readNotionDescriptionOverlayMap();
  const o = map[project.id]?.trim() ?? "";
  if (o !== "" && o !== "—") {
    return { ...project, description: o };
  }
  return project;
}

function dispatchNotionProjectsCache(detail: ITNotionProjectsCacheEventDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ITNotionProjectsCacheEventDetail>(IT_NOTION_PROJECTS_CACHE_EVENT, { detail }),
  );
}

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
    const sprintIdRaw = typeof row.sprintId === "string" ? row.sprintId.trim() : "";
    const sprintTitleRaw = typeof row.sprintTitle === "string" ? row.sprintTitle.trim() : "";
    const descriptionRaw = typeof row.description === "string" ? row.description.trim() : "";

    const outRow: ItProject["plannedTasks"][number] = { id, title };
    if (sprintIdRaw) outRow.sprintId = sprintIdRaw;
    if (sprintTitleRaw) outRow.sprintTitle = sprintTitleRaw;
    if (
      row.sprintBoardColumn === "pendiente" ||
      row.sprintBoardColumn === "en_curso" ||
      row.sprintBoardColumn === "hecho"
    ) {
      outRow.sprintBoardColumn = row.sprintBoardColumn;
    }
    if (descriptionRaw) outRow.description = descriptionRaw;
    if (typeof row.assigneeName === "string") outRow.assigneeName = row.assigneeName.trim();
    if (typeof row.targetDate === "string") outRow.targetDate = row.targetDate.trim();
    out.push(outRow);
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

/**
 * Combina lista Notion/API (`seed`) y proyectos solo-navegador (`user`).
 * Los `id` con forma de UUID de página Notion deben usar siempre los datos sincronizados del servidor:
 * una copia antigua en `localStorage` no debe ocultar sprints/KR enlazados vía API.
 */
export function mergeItProjectsWithSeed(seed: ItProject[], user: ItProject[]): ItProject[] {
  const map = new Map<string, ItProject>();
  for (const p of seed) map.set(p.id, p);
  for (const p of user) {
    if (isLikelyNotionPageId(p.id)) continue;
    map.set(p.id, p);
  }
  return [...map.values()];
}

export function appendUserProject(project: ItProject): void {
  const cur = readUserProjects();
  writeUserProjects([...cur, project]);
  window.dispatchEvent(new CustomEvent(IT_PROJECTS_CHANGED_EVENT));
}

/** Actualiza un proyecto sólo navegador o lo inserta si no existía. */
export function upsertUserProject(project: ItProject): void {
  const cur = readUserProjects();
  const idx = cur.findIndex((p) => p.id === project.id);
  const next =
    idx === -1 ? [...cur, project] : cur.map((p, i) => (i === idx ? project : p));
  writeUserProjects(next);
  window.dispatchEvent(new CustomEvent(IT_PROJECTS_CHANGED_EVENT));
}

export function removeUserProject(id: string): void {
  const cur = readUserProjects();
  const next = cur.filter((p) => p.id !== id);
  if (next.length === cur.length) return;
  writeUserProjects(next);
  window.dispatchEvent(new CustomEvent(IT_PROJECTS_CHANGED_EVENT));
}

/** Tras crear/borrar, Notion UI suele actualizar antes que `databases/query`; un segundo listado mejora el acierto. */
const NOTION_LIST_FOLLOW_UP_REFETCH_MS = 2800;

/** Vacía la caché en memoria de proyectos Notion tras crear/borrar/invalidar desde la lista. Las pantallas pueden reconsultar `/api/notion/projects`. */
export function invalidateNotionProjectsCache(): void {
  notionCache.data = null;
  notionCache.error = undefined;
  notionCache.fetchedAt = 0;
  notionCache.promise = null;
  dispatchNotionProjectsCache({ reason: "invalidated" });
  window.setTimeout(() => {
    refetchNotionProjectsListBestEffort();
  }, NOTION_LIST_FOLLOW_UP_REFETCH_MS);
}

/**
 * Sustituye o inserta una fila en la caché Notion así la UI muestra ya el proyecto devuelto por PATCH
 * sin esperar a que Notion reaparezca en un listado remoto más lento que la misma página.
 */
export function upsertNotionProjectInCache(project: ItProject): void {
  const cur = notionCache.data;
  if (cur && cur.length > 0) {
    const idx = cur.findIndex((p) => p.id === project.id);
    notionCache.data = idx === -1 ? [...cur, project] : cur.map((p, i) => (i === idx ? project : p));
  } else {
    notionCache.data = [project];
  }
  notionCache.fetchedAt = Date.now();
  notionCache.error = undefined;
  notionCache.promise = null;
  rememberNotionProjectDescriptionOverlay(project);
  dispatchNotionProjectsCache({ reason: "upserted" });
}

/**
 * Repuebla desde el listado servidor (mantener portafolio alineado) sin bloquear la navegación.
 * Se ejecuta después de `upsertNotionProjectInCache` cuando el PATCH ya devolvió `{ project }`.
 */
export function refetchNotionProjectsListBestEffort(): void {
  const previous = notionCache.data;
  void fetch("/api/notion/projects", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) return null;
      return res.json() as Promise<{ projects?: unknown }>;
    })
    .then((data) => {
      const list = data?.projects;
      if (!Array.isArray(list)) return;
      const ok = list.filter(isItProjectRecord).map(normalizeStoredProject);
      notionCache.data = mergeNotionProjectsPreserveLocalDescriptions(ok, previous);
      notionCache.fetchedAt = Date.now();
      notionCache.error = undefined;
      notionCache.promise = null;
      dispatchNotionProjectsCache({ reason: "upserted" });
    })
    .catch(() => {
      /* no-op — la fila puntual ya quedó con upsert */
    });
}

/** Extrae `{ project }` de la respuesta JSON de PATCH proyecto Notion tras validar tipos. */
export function notionPatchResponseToProject(payload: unknown): ItProject | null {
  if (typeof payload !== "object" || payload === null || !("project" in payload)) return null;
  const p = (payload as { project: unknown }).project;
  if (!isItProjectRecord(p)) return null;
  return normalizeStoredProject(p);
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

const CACHE_TTL_MS = 25_000; // Listado puede quedar corto vs Notion UI; TTL bajo + invalidación + refetch diferido

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

  // Start a new fetch (sin caché HTTP del navegador; alinea con Notion tras crear / borrar)
  notionCache.promise = fetch("/api/notion/projects", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("Error HTTP");
      return res.json();
    })
    .then((data) => {
      if (data.projects) {
        const list = Array.isArray(data.projects) ? data.projects : [];
        const normalized = list.filter(isItProjectRecord).map(normalizeStoredProject);
        notionCache.data = mergeNotionProjectsPreserveLocalDescriptions(normalized, notionCache.data);
        notionCache.error = undefined;
        notionCache.fetchedAt = Date.now();
        onData(notionCache.data ?? normalized);
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

    const onNotionData = (d: ItProject[]) => {
      setNotionData(d);
      setLoading(false);
    };
    const onNotionError = (e: string) => {
      setError(e);
      setLoading(false);
    };
    const onNotionDone = () => setLoading(false);

    fetchNotionIfNeeded(onNotionData, onNotionError, onNotionDone);

    const onNotionCache = (ev: Event) => {
      const ce = ev as CustomEvent<ITNotionProjectsCacheEventDetail>;
      const detail = ce.detail;
      if (!detail) return;
      if (detail.reason === "invalidated") {
        fetchNotionIfNeeded(onNotionData, onNotionError, onNotionDone);
      } else if (detail.reason === "upserted") {
        setNotionData([...(notionCache.data ?? [])]);
        setLoading(false);
        setError(undefined);
      }
    };
    window.addEventListener(IT_NOTION_PROJECTS_CACHE_EVENT, onNotionCache);

    return () => {
      window.removeEventListener(IT_PROJECTS_CHANGED_EVENT, sync);
      window.removeEventListener(IT_NOTION_PROJECTS_CACHE_EVENT, onNotionCache);
    };
  }, []);

  const projects = useMemo(() => {
    if (notionData.length === 0 && user.length === 0) return [];
    return mergeItProjectsWithSeed(notionData, user);
  }, [notionData, user]);

  return { projects, loading, ready: mounted && !loading, error };
}
