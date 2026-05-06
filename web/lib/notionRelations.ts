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

function notionHeaders(token: string): NotionHeaders {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
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
      cache: "no-store",
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

const TITLE_FETCH_CONCURRENCY = 8;

/** GET /v1/pages/:id y mapa id → título (una sola petición por id único). */
export async function resolveNotionRelatedPageTitles(
  pageIds: string[],
  token: string,
): Promise<Map<string, string>> {
  const unique = [...new Set(pageIds.filter((id) => id.length > 0))];
  const map = new Map<string, string>();

  for (let i = 0; i < unique.length; i += TITLE_FETCH_CONCURRENCY) {
    const chunk = unique.slice(i, i + TITLE_FETCH_CONCURRENCY);
    const settled = await Promise.all(
      chunk.map(async (id) => {
        try {
          const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
            headers: notionHeaders(token),
            cache: "no-store",
          });
          if (!res.ok) {
            return [id, "Sin título"] as const;
          }
          const page: unknown = await res.json();
          return [id, titleFromNotionPagePayload(page)] as const;
        } catch {
          return [id, "Sin título"] as const;
        }
      }),
    );
    for (const [id, title] of settled) {
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
  if (kind === "sprints") return ["Sprints", "sprints", "Sprint", "sprint"];
  if (kind === "keyResults") {
    return ["KR", "kr", "KRs", "Key results", "Key Results", "Resultados clave", "Resultado clave"];
  }
  return ["entregables", "Entregables", "Entregable", "deliverables", "Deliverables"];
}
