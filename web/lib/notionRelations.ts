import type { ItSprintTaskBoardColumn } from "@/lib/itProjectTypes";
import { notionTaskBoardStatusPropertyLabel } from "@/lib/notionTaskBoardStatusEnv";
import { extractResponsableFromNotionProps } from "./notionProjectResponsable";

const NOTION_VERSION = "2022-06-28";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isRelationProperty(x: unknown): boolean {
  return isRecord(x) && x.type === "relation";
}

/** IDs de páginas enlazadas en una propiedad `relation` de Notion. */
export function relationPageIds(prop: unknown): string[] {
  if (!isRelationProperty(prop)) return [];
  const rel = (prop as { relation?: unknown }).relation;
  if (!Array.isArray(rel)) return [];
  return rel
    .map((item) => (isRecord(item) ? item.id : undefined))
    .filter((id): id is string => typeof id === "string");
}

function findPropertyKey(props: Record<string, unknown>, name: string): string | undefined {
  if (name in props) return name;
  const lower = name.toLowerCase();
  for (const k of Object.keys(props)) {
    if (k.toLowerCase() === lower) return k;
  }
  return undefined;
}

/** Resuelve el nombre de columna en `properties` de una página Notion (insensible a mayúsculas). */
export function findNotionPagePropertyKey(
  props: Record<string, unknown>,
  name: string,
): string | undefined {
  return findPropertyKey(props, name);
}

/**
 * Clave real de una propiedad `relation` en `props` cuyo nombre coincide con `name`
 * (comparación sin distinguir mayúsculas).
 */
export function relationPropertyKeyByName(
  props: Record<string, unknown>,
  name: string,
): string | undefined {
  const key = findPropertyKey(props, name.trim());
  if (!key || !isRelationProperty(props[key])) return undefined;
  return key;
}

/**
 * Usa el primer nombre de `candidates` que exista en `properties` y devuelve IDs de relación
 * (puede ser un array vacío si la relación no tiene enlaces).
 */
export function relationIdsFromCandidates(
  properties: Record<string, unknown> | undefined,
  candidates: string[],
): string[] {
  if (!properties) return [];
  for (const name of candidates) {
    const key = findPropertyKey(properties, name);
    if (!key) continue;
    const prop = properties[key];
    if (isRelationProperty(prop)) return relationPageIds(prop);
  }
  return [];
}

/** Candidatos de nombre para la propiedad relación Sprint en la página de una **tarea** (base de tareas). */
export function notionTaskPageSprintRelationCandidates(): string[] {
  const env = process.env.NOTION_PROP_TASK_PAGE_SPRINT_RELATION?.trim();
  if (env) return [env];
  return [
    "Sprint",
    "sprint",
    "Sprints",
    "sprints",
    "Iteración",
    "iteración",
    "Iteraciones",
    "Proyecto sprint",
  ];
}

/** IDs de página Notion típicos (`xxxxxxxx-xxxx-...`). */
function looksLikeNotionPageId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

const TASK_SPRINT_FETCH_CONCURRENCY = 15;

/** Título de una página de base de datos: primera propiedad tipo `title`. */
export function titleFromNotionPagePayload(page: unknown): string {
  if (!isRecord(page)) return "Sin título";
  const props = page.properties;
  if (!isRecord(props)) return "Sin título";
  for (const k of Object.keys(props)) {
    const block = props[k];
    if (!isRecord(block) || block.type !== "title") continue;
    const titleArr = block.title;
    if (!Array.isArray(titleArr)) continue;
    const text = titleArr
      .map((t) => (isRecord(t) && typeof t.plain_text === "string" ? t.plain_text : ""))
      .join("")
      .trim();
    if (text) return text;
  }
  return "Sin título";
}

function mapNotionBoardLabelToColumn(name: string): ItSprintTaskBoardColumn | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  if (/hecho|completad|done|cerrad|finalizad|✅/.test(n)) return "hecho";
  if (/curso|progres|wip|doing|en proceso|trabaj/.test(n)) return "en_curso";
  if (/pendient|sin empezar|por hacer|por empezar|todo|backlog|inbox|nueva/.test(n)) return "pendiente";
  return undefined;
}

function readBoardColumnFromTaskProperties(
  props: Record<string, unknown> | undefined,
): ItSprintTaskBoardColumn | undefined {
  const propLabel = notionTaskBoardStatusPropertyLabel();
  if (!propLabel || !props) return undefined;
  const key = findPropertyKey(props, propLabel);
  if (!key) return undefined;
  const cell = props[key];
  if (!isRecord(cell)) return undefined;
  if (cell.type === "status") {
    const nm = (cell.status as { name?: string } | undefined)?.name;
    return typeof nm === "string" ? mapNotionBoardLabelToColumn(nm) : undefined;
  }
  if (cell.type === "select") {
    const nm = (cell.select as { name?: string } | undefined)?.name;
    return typeof nm === "string" ? mapNotionBoardLabelToColumn(nm) : undefined;
  }
  return undefined;
}

export function extractDateFromNotionProps(
  props: Record<string, unknown> | undefined,
  candidates: string[],
): string | undefined {
  if (!props) return undefined;
  for (const name of candidates) {
    const key = findPropertyKey(props, name);
    if (!key) continue;
    const cell = props[key];
    if (!isRecord(cell)) continue;
    if (cell.type === "date" && isRecord(cell.date) && typeof cell.date.start === "string") {
      return cell.date.start;
    }
  }
  return undefined;
}

/** Datos leídos en un solo GET de la página-tarea (sprint, estado tablero opcional, título). */
export type TaskPagePeek = {
  sprintId?: string;
  notionBoardColumn?: ItSprintTaskBoardColumn;
  plainTitle: string;
  assigneeName?: string;
  targetDate?: string;
};

/** GET por página de tarea: relación sprint, columna Kanban (propiedad `Estatus` por defecto o `NOTION_PROP_TASK_BOARD_STATUS`) y texto del título. */
export async function resolveTaskPagePeek(
  taskPageIds: readonly string[],
  token: string,
): Promise<Map<string, TaskPagePeek>> {
  const unique = [...new Set(taskPageIds.filter((id) => looksLikeNotionPageId(id)))];
  const map = new Map<string, TaskPagePeek>();
  const cands = notionTaskPageSprintRelationCandidates();

  const fetchOne = async (tid: string): Promise<void> => {
    try {
      const res = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(tid)}`, {
        headers: notionApiJsonHeaders(token),
        cache: "no-store",
      });
      if (!res.ok) return;
      const page: unknown = await res.json();
      if (!isRecord(page)) return;
      const props = isRecord(page.properties) ? page.properties : undefined;
      const ids = relationIdsFromCandidates(props, cands);
      
      const assignee = extractResponsableFromNotionProps(props);
      const date = extractDateFromNotionProps(props, ["Fecha de entrega", "Fecha límite", "Fecha", "Due Date", "Target Date"]);

      map.set(tid, {
        sprintId: ids[0],
        notionBoardColumn: readBoardColumnFromTaskProperties(props),
        plainTitle: titleFromNotionPagePayload(page),
        assigneeName: assignee,
        targetDate: date,
      });
    } catch {
      // no-op: preserve previous data by not setting anything
    }
  };

  for (let i = 0; i < unique.length; i += TASK_SPRINT_FETCH_CONCURRENCY) {
    const chunk = unique.slice(i, i + TASK_SPRINT_FETCH_CONCURRENCY);
    await Promise.all(chunk.map(fetchOne));
  }

  return map;
}

/** Primera página sprint enlazada desde cada página de tarea según GET de propiedades. */
export async function resolveTaskLinkedFirstSprintIds(
  taskPageIds: readonly string[],
  token: string,
): Promise<Map<string, string | undefined>> {
  const peek = await resolveTaskPagePeek(taskPageIds, token);
  const map = new Map<string, string | undefined>();
  peek.forEach((v, k) => map.set(k, v.sprintId));
  return map;
}

type NotionHeaders = Record<string, string>;

/** Cabeceras para peticiones JSON a `api.notion.com` (query, páginas, mutaciones). */
export function notionApiJsonHeaders(token: string): NotionHeaders {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

/** File uploads, comentarios y bloques con `file_upload` requieren una versión más reciente según documentación Notion. */
export function notionApiCapabilitiesVersion(): string {
  return process.env.NOTION_API_CAPABILITIES_VERSION?.trim() ?? "2026-03-11";
}

export function notionApiJsonHeadersCapabilities(token: string): NotionHeaders {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": notionApiCapabilitiesVersion(),
    "Content-Type": "application/json",
  };
}

/** Peticiones `multipart/form-data` a Notion (p. ej. enviar binario del file upload): no fijar Content-Type. */
export function notionApiAuthHeadersCapabilitiesOnly(token: string): NotionHeaders {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": notionApiCapabilitiesVersion(),
  };
}

function notionHeaders(token: string): NotionHeaders {
  return notionApiJsonHeaders(token);
}

/** Consulta todas las filas de una base (maneja paginación). */
export async function notionQueryAllDatabaseRows(
  databaseId: string,
  token: string,
): Promise<unknown[]> {
  const out: unknown[] = [];
  let startCursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const body: Record<string, unknown> = {};
    if (startCursor) body.start_cursor = startCursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: notionHeaders(token),
      body: JSON.stringify(body),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion database query failed: ${res.status} ${err}`);
    }

    const data = (await res.json()) as {
      results?: unknown[];
      has_more?: boolean;
      next_cursor?: string | null;
    };

    if (Array.isArray(data.results)) {
      out.push(...data.results);
    }

    hasMore = Boolean(data.has_more && data.next_cursor);
    startCursor = data.next_cursor ?? undefined;
  }

  return out;
}

const TITLE_FETCH_CONCURRENCY = 20;

/** GET /v1/pages/:id y mapa id → título — todas las peticiones en paralelo. */
export async function resolveNotionRelatedPageTitles(
  pageIds: string[],
  token: string,
): Promise<Map<string, string>> {
  const unique = [...new Set(pageIds.filter((id) => id.length > 0))];
  const map = new Map<string, string>();

  if (unique.length === 0) return map;

  // Fire all requests in parallel with high concurrency
  const allPromises = unique.map(async (id) => {
    try {
      const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        headers: notionHeaders(token),
        next: { revalidate: 300 },
      });
      if (!res.ok) {
        return [id, "Sin título"] as const;
      }
      const page: unknown = await res.json();
      return [id, titleFromNotionPagePayload(page)] as const;
    } catch {
      return [id, "Sin título"] as const;
    }
  });

  // Process in chunks to avoid overwhelming Notion rate limits
  for (let i = 0; i < allPromises.length; i += TITLE_FETCH_CONCURRENCY) {
    const chunk = allPromises.slice(i, i + TITLE_FETCH_CONCURRENCY);
    const results = await Promise.all(chunk);
    for (const [id, title] of results) {
      map.set(id, title);
    }
  }

  return map;
}

export function notionRelationPropertyCandidates(
  kind: "tasks" | "sprints" | "deliverables" | "keyResults",
): string[] {
  const envName = {
    tasks: process.env.NOTION_PROP_PROJECT_TASKS_RELATION?.trim(),
    sprints: process.env.NOTION_PROP_PROJECT_SPRINTS_RELATION?.trim(),
    deliverables: process.env.NOTION_PROP_PROJECT_DELIVERABLES_RELATION?.trim(),
    keyResults: process.env.NOTION_PROP_PROJECT_KEY_RESULTS_RELATION?.trim(),
  }[kind];

  if (envName) return [envName];

  if (kind === "tasks") return ["tareas", "Tareas", "Tarea", "task", "Tasks"];
  if (kind === "sprints") {
    return [
      "Sprints",
      "sprints",
      "Sprint",
      "sprint",
      // Nombres frecuentes en bases en español
      "Iteraciones",
      "iteraciones",
      "Iteración",
      "iteración",
      "Ciclos",
      "ciclos",
      "Ciclo",
      "ciclo",
      "Ventanas de iteración",
      "Ventanas",
      "ventanas",
    ];
  }
  if (kind === "keyResults") {
    return ["KR", "kr", "KRs", "Key results", "Key Results", "Resultados clave", "Resultado clave"];
  }
  return ["entregables", "Entregables", "Entregable", "deliverables", "Deliverables"];
}

/**
 * Primera propiedad tipo `relation` que coincida con los nombres candidatos (uso en PATCH del proyecto IT).
 */
export function resolveRelationPropertyKeyFromKind(
  properties: Record<string, unknown>,
  kind: "tasks" | "sprints" | "deliverables" | "keyResults",
): string | undefined {
  for (const name of notionRelationPropertyCandidates(kind)) {
    const key = findPropertyKey(properties, name);
    if (!key) continue;
    const prop = properties[key];
    if (isRelationProperty(prop)) return key;
  }
  return undefined;
}
