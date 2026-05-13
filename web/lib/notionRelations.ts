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

/** Primera página sprint enlazada desde cada página de tarea según GET de propiedades. */
export async function resolveTaskLinkedFirstSprintIds(
  taskPageIds: readonly string[],
  token: string,
): Promise<Map<string, string | undefined>> {
  const unique = [...new Set(taskPageIds.filter((id) => looksLikeNotionPageId(id)))];
  const map = new Map<string, string | undefined>();
  const cands = notionTaskPageSprintRelationCandidates();

  const fetchOne = async (tid: string): Promise<void> => {
    try {
      const res = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(tid)}`, {
        headers: notionApiJsonHeaders(token),
        cache: "no-store",
      });
      if (!res.ok) {
        map.set(tid, undefined);
        return;
      }
      const page: unknown = await res.json();
      if (!isRecord(page)) {
        map.set(tid, undefined);
        return;
      }
      const props = page.properties;
      const ids = relationIdsFromCandidates(isRecord(props) ? props : undefined, cands);
      map.set(tid, ids[0]);
    } catch {
      map.set(tid, undefined);
    }
  };

  for (let i = 0; i < unique.length; i += TASK_SPRINT_FETCH_CONCURRENCY) {
    const chunk = unique.slice(i, i + TASK_SPRINT_FETCH_CONCURRENCY);
    await Promise.all(chunk.map(fetchOne));
  }

  return map;
}

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

type NotionHeaders = Record<string, string>;

/** Cabeceras para peticiones JSON a `api.notion.com` (query, páginas, mutaciones). */
export function notionApiJsonHeaders(token: string): NotionHeaders {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
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
