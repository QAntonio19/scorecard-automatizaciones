import type { ItProject } from "@/lib/itProjectTypes";
import { mapNotionEstatusToPhase } from "@/lib/notionEstatusPhase";
import {
  inferSprintTaskKanbanColumn,
  plannedTaskCanonicalTitle,
} from "@/lib/itProjectScopeProgress";
import {
  notionApiJsonHeaders,
  notionRelationPropertyCandidates,
  relationIdsFromCandidates,
  resolveNotionRelatedPageTitles,
  resolveTaskPagePeek,
} from "@/lib/notionRelations";
import { resolveItProjectPmName } from "@/lib/notionProjectResponsable";

const NOTION_PAGE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLikelyNotionPageId(id: string): boolean {
  return NOTION_PAGE_UUID_RE.test(id.trim());
}

export function notionDatabaseIdsEqual(a: string, b: string): boolean {
  return a.replace(/-/g, "").toLowerCase() === b.replace(/-/g, "").toLowerCase();
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function parentDatabaseIdFromPage(page: unknown): string | undefined {
  if (!isRecord(page)) return undefined;
  const parent = page.parent;
  if (!isRecord(parent)) return undefined;
  if (parent.type === "database_id" && typeof parent.database_id === "string") {
    return parent.database_id;
  }
  return undefined;
}

function notionRichTextBlocksToPlain(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const rt = (prop as { rich_text?: Array<{ plain_text?: string }> }).rich_text;
  if (!Array.isArray(rt)) return "";
  return rt
    .map((b) => (typeof b?.plain_text === "string" ? b.plain_text : ""))
    .join("")
    .trim();
}

/**
 * Lee la descripción del proyecto desde propiedades Notion (rich_text).
 * Usa NOTION_PROP_PROJECT_DESCRIPTION si está definido; si no, prueba nombres habituales.
 */
function notionProjectDescriptionFromPageProperties(
  props: Record<string, unknown> | undefined,
): string {
  if (!props) return "";
  const envName = process.env.NOTION_PROP_PROJECT_DESCRIPTION?.trim();
  const ordered = [envName, "Descripción", "Descripción del proyecto", "Description"].filter(
    (x): x is string => Boolean(x),
  );
  const seen = new Set<string>();
  for (const name of ordered) {
    if (seen.has(name)) continue;
    seen.add(name);
    if (!(name in props)) continue;
    const text = notionRichTextBlocksToPlain(props[name]);
    if (text) return text.slice(0, 16_000);
  }
  return "";
}

type RowExtract = {
  base: Omit<ItProject, "keyResults" | "plannedTasks" | "sprints" | "deliverables">;
  keyResultIds: string[];
  taskIds: string[];
  sprintIds: string[];
  deliverableIds: string[];
};

function notionRowToExtract(
  r: unknown,
  krPropNames: string[],
  taskPropNames: string[],
  sprintPropNames: string[],
  deliverablePropNames: string[],
): RowExtract {
  const row = r as Record<string, unknown>;
  const props = row.properties as Record<string, unknown> | undefined;

  const archivar = props?.archivar as Record<string, unknown> | undefined;
  const isArchived = archivar?.checkbox === true;

  const estatusProp = props?.Estatus as Record<string, unknown> | undefined;
  const estatusValue = (estatusProp?.status as Record<string, unknown> | undefined)?.name as
    | string
    | undefined;

  const phase = mapNotionEstatusToPhase(estatusValue, isArchived);

  const nombre = props?.Nombre as Record<string, unknown> | undefined;
  const titleProp = nombre?.title as Array<Record<string, unknown>> | undefined;
  const name =
    Array.isArray(titleProp) && titleProp.length > 0 && typeof titleProp[0].plain_text === "string"
      ? titleProp[0].plain_text
      : "Proyecto sin nombre";
  const id = row.id as string;
  const created_time = row.created_time as string | undefined;
  const pmName = resolveItProjectPmName(props, name);

  const getVal = (p: unknown) => {
    if (!p || typeof p !== "object") return undefined;
    const obj = p as Record<string, unknown>;

    const sel = obj.select as { name: string } | undefined;
    if (sel?.name) return sel.name;

    const st = obj.status as { name: string } | undefined;
    if (st?.name) return st.name;

    const ms = obj.multi_select as Array<{ name: string }> | undefined;
    if (ms?.[0]?.name) return ms[0].name;

    const f = obj.formula as { string?: string; number?: number } | undefined;
    if (f) return f.string || f.number?.toString();

    const rt = obj.rich_text as Array<{ plain_text: string }> | undefined;
    if (rt?.[0]?.plain_text) return rt[0].plain_text;

    const dt = obj.date as { start: string } | undefined;
    if (dt?.start) return dt.start;

    if (obj.rollup) {
      const roll = obj.rollup as {
        type: string;
        array?: Array<{
          select?: { name: string };
          status?: { name: string };
          multi_select?: Array<{ name: string }>;
          rich_text?: Array<{ plain_text: string }>;
          title?: Array<{ plain_text: string }>;
        }>;
        string?: string;
        number?: number;
      };
      if (roll.type === "array" && roll.array?.[0]) {
        const first = roll.array[0];
        return (
          first.select?.name ||
          first.status?.name ||
          first.multi_select?.[0]?.name ||
          first.rich_text?.[0]?.plain_text ||
          first.title?.[0]?.plain_text
        );
      }
      return roll.string || roll.number?.toString();
    }
    return undefined;
  };

  const riskProp = props?.["Nivel de riesgo"] || props?.["Nivel de Riesgo"];
  const riskName = getVal(riskProp);
  const riskLevel: ItProject["riskLevel"] =
    riskName === "Alta" ? "alto" : riskName === "Media" ? "medio" : "bajo";

  const urgencyProp = props?.["Nivel de Urgencia"] || props?.["Urgencia"];
  const urgencyName = getVal(urgencyProp);
  const urgencyLevel: ItProject["urgencyLevel"] =
    urgencyName === "Alta" ? "alta" : urgencyName === "Baja" ? "baja" : "media";

  const monthRelIds = relationIdsFromCandidates(props, ["meses", "Mes", "mes"]);
  const yearRelIds = relationIdsFromCandidates(props, ["años", "Año", "año"]);
  const keyResultIds = relationIdsFromCandidates(props, krPropNames);
  const taskIds = relationIdsFromCandidates(props, taskPropNames);
  const sprintIds = relationIdsFromCandidates(props, sprintPropNames);
  const deliverableIds = relationIdsFromCandidates(props, deliverablePropNames);

  return {
    base: {
      id,
      code: `PRJ-${id.split("-")[0].toUpperCase()}`,
      name,
      description: notionProjectDescriptionFromPageProperties(props),
      phase,
      sponsor: "Notion Sync",
      pmName,
      startDate: getVal(props?.INICIO) || getVal(props?.Inicio) || getVal(props?.inicio) || created_time || new Date().toISOString(),
      targetEndDate: getVal(props?.["FIN OBJETIVO"]) || getVal(props?.["Fin objetivo"]) || getVal(props?.["fin objetivo"]) || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      riskLevel,
      urgencyLevel,
      month: getVal(props?.meses) || getVal(props?.Mes) || getVal(props?.mes),
      monthId: monthRelIds[0],
      year: getVal(props?.años) || getVal(props?.Año) || getVal(props?.año),
      yearId: yearRelIds[0],
      milestones: [],
    },
    keyResultIds,
    taskIds,
    sprintIds,
    deliverableIds,
  };
}

/** Varias filas devueltas por `query` o una sola página de la base ITAI: Proyectos. */
export async function notionRowsToItProjects(rows: unknown[], token: string): Promise<ItProject[]> {
  const krPropNames = notionRelationPropertyCandidates("keyResults");
  const taskPropNames = notionRelationPropertyCandidates("tasks");
  const sprintPropNames = notionRelationPropertyCandidates("sprints");
  const deliverablePropNames = notionRelationPropertyCandidates("deliverables");

  const extracted = rows.map((r) =>
    notionRowToExtract(r, krPropNames, taskPropNames, sprintPropNames, deliverablePropNames),
  );

  const peekByTaskId = await resolveTaskPagePeek(
    extracted.flatMap((ex) => ex.taskIds),
    token,
  );

  const relatedIdSet = new Set<string>();
  for (const ex of extracted) {
    for (const kid of ex.keyResultIds) relatedIdSet.add(kid);
    for (const tid of ex.taskIds) relatedIdSet.add(tid);
    for (const sid of ex.sprintIds) relatedIdSet.add(sid);
    for (const did of ex.deliverableIds) relatedIdSet.add(did);
  }

  for (const sid of peekByTaskId.values()) {
    const s = sid.sprintId?.trim();
    if (s) relatedIdSet.add(s);
  }

  const titleById = await resolveNotionRelatedPageTitles([...relatedIdSet], token);
  for (const [id, peg] of peekByTaskId) {
    const t = peg.plainTitle.trim();
    if (t) titleById.set(id, peg.plainTitle);
  }

  return extracted.map((ex) => ({
    ...ex.base,
    keyResults: ex.keyResultIds.map((pageId) => ({
      id: pageId,
      title: titleById.get(pageId) ?? "Sin título",
    })),
    plannedTasks: ex.taskIds.map((pageId) => {
      const rawFull = titleById.get(pageId) ?? "";
      const peek = peekByTaskId.get(pageId);
      const sprintIdLinked = peek?.sprintId?.trim() ? peek.sprintId : undefined;
      const sprintTitleResolved =
        sprintIdLinked !== undefined ? (titleById.get(sprintIdLinked) ?? undefined) : undefined;
      const inferred = inferSprintTaskKanbanColumn(rawFull.trim() || "Sin título");
      const sprintBoardColumn = peek?.notionBoardColumn ?? inferred;

      const baseRow: ItProject["plannedTasks"][number] = {
        id: pageId,
        title: plannedTaskCanonicalTitle(rawFull.trim() ? rawFull : "Sin título"),
        sprintBoardColumn,
        ...(peek?.assigneeName !== undefined ? { assigneeName: peek.assigneeName } : {}),
        ...(peek?.targetDate !== undefined ? { targetDate: peek.targetDate } : {}),
      };

      if (!sprintIdLinked) return baseRow;
      return {
        ...baseRow,
        sprintId: sprintIdLinked,
        ...(sprintTitleResolved ? { sprintTitle: sprintTitleResolved } : {}),
      };
    }),
    sprints: ex.sprintIds.map((pageId) => ({
      id: pageId,
      title: titleById.get(pageId) ?? "Sin título",
    })),
    deliverables: ex.deliverableIds.map((pageId) => ({
      id: pageId,
      title: titleById.get(pageId) ?? "Sin título",
    })),
  }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Una fila concreta por id (p. ej. recién creada; Notion a veces devuelve 404 unos instantes). */
export async function fetchItProjectByNotionPageId(
  pageId: string,
  token: string,
  expectedDatabaseId: string,
): Promise<ItProject | null> {
  const maxAttempts = 8;
  const pauseMs = 450;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(pauseMs);

    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: notionApiJsonHeaders(token),
      cache: "no-store",
    });

    if (res.status === 404) {
      continue;
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion page fetch failed: ${res.status} ${err}`);
    }

    const page: unknown = await res.json();
    const parentDb = parentDatabaseIdFromPage(page);
    if (!parentDb || !notionDatabaseIdsEqual(parentDb, expectedDatabaseId)) {
      return null;
    }

    const projects = await notionRowsToItProjects([page], token);
    const p = projects[0];
    if (p) return p;
  }

  return null;
}

/**
 * Notion **no ofrece borrado permanente** en su API pública: la fila pasa a papelera / deja de verse en la base.
 * El vaciado definitivo de papelera solo existe en la interfaz de Notion.
 *
 * Orden: `in_trash` (API actual); si falla, `archived` (integraciones con cabecera antigua).
 */
export async function notionTrashPageBestEffort(pageId: string, token: string): Promise<void> {
  const url = `https://api.notion.com/v1/pages/${pageId}`;
  const headers = notionApiJsonHeaders(token);

  const trashRes = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ in_trash: true }),
  });
  const trashBody = await trashRes.text();
  if (trashRes.ok) return;

  const archiveRes = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ archived: true }),
  });
  const archiveBody = await archiveRes.text();
  if (archiveRes.ok) return;

  throw new Error(trashBody.slice(0, 2000) || archiveBody.slice(0, 8000));
}
