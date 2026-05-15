import {
  extractNotionErrorMessage,
  notionApiCreateDatabasePage,
} from "@/lib/notionCreateProjectPayload";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";
import type { ItSprintTaskBoardColumn } from "@/lib/itProjectTypes";
import {
  notionTaskBoardStatusOptionFallback,
  notionTaskBoardStatusPropertyLabel,
} from "@/lib/notionTaskBoardStatusEnv";
import {
  findNotionPagePropertyKey,
  notionApiJsonHeaders,
  notionRelationPropertyCandidates,
  notionTaskPageSprintRelationCandidates,
  relationIdsFromCandidates,
  relationPropertyKeyByName,
  resolveRelationPropertyKeyFromKind,
} from "@/lib/notionRelations";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

export class NotionRelationSyncError extends Error {
  constructor(
    message: string,
    public readonly httpStatus = 422,
  ) {
    super(message);
    this.name = "NotionRelationSyncError";
  }
}

export type NotionRelationsSyncInput = {
  keyResultLines?: { id: string; text: string }[];
  taskLines?: {
    id: string;
    text: string;
    sprintId?: string | null;
    sprintBoardColumn?: ItSprintTaskBoardColumn;
    assigneeName?: string;
    targetDate?: string;
  }[];
  sprintRows?: { id: string; title: string; timeframe?: string }[];
  deliverables?: { id: string; title: string; targetDate?: string }[];
};

const DATABASE_ID_BY_KIND = {
  keyResults: (): string | undefined => process.env.NOTION_KEY_RESULTS_DATABASE_ID?.trim(),
  tasks: (): string | undefined => process.env.NOTION_TASKS_DATABASE_ID?.trim(),
  sprints: (): string | undefined => process.env.NOTION_SPRINTS_DATABASE_ID?.trim(),
  deliverables: (): string | undefined => process.env.NOTION_DELIVERABLES_DATABASE_ID?.trim(),
} as const;

const BACKLINK_PROP_BY_KIND = {
  keyResults: (): string | undefined => process.env.NOTION_KEY_RESULTS_PROJECT_LINK_PROP?.trim(),
  tasks: (): string | undefined => process.env.NOTION_TASKS_PROJECT_LINK_PROP?.trim(),
  sprints: (): string | undefined => process.env.NOTION_SPRINTS_PROJECT_LINK_PROP?.trim(),
  deliverables: (): string | undefined => process.env.NOTION_DELIVERABLES_PROJECT_LINK_PROP?.trim(),
} as const;

const KIND_LABEL = {
  keyResults: "resultados clave (KR)",
  tasks: "tareas",
  sprints: "sprints",
  deliverables: "entregables",
} as const;

const DATABASE_ENV_NAME: Record<
  keyof typeof DATABASE_ID_BY_KIND,
  string
> = {
  keyResults: "NOTION_KEY_RESULTS_DATABASE_ID",
  tasks: "NOTION_TASKS_DATABASE_ID",
  sprints: "NOTION_SPRINTS_DATABASE_ID",
  deliverables: "NOTION_DELIVERABLES_DATABASE_ID",
};

type RelationKindProp = Parameters<typeof resolveRelationPropertyKeyFromKind>[1];

const PREFLIGHT_KIND_ORDER: RelationKindProp[] = [
  "keyResults",
  "sprints",
  "tasks",
  "deliverables",
];

function normalizedRelationLines(kind: RelationKindProp, input: NotionRelationsSyncInput):
  | { id: string; primary: string }[]
  | undefined {
  switch (kind) {
    case "keyResults":
      return input.keyResultLines?.map((l) => ({ id: l.id, primary: l.text }));
    case "tasks":
      return input.taskLines?.map((l) => ({ id: l.id, primary: l.text }));
    case "sprints":
      return input.sprintRows?.map((l) => ({ id: l.id, primary: l.title }));
    case "deliverables":
      return input.deliverables?.map((l) => ({ id: l.id, primary: l.title }));
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

const PREFLIGHT_SECTION_LABEL: Record<RelationKindProp, string> = {
  keyResults: "Resultados clave (KR)",
  tasks: "Tareas",
  sprints: "Sprints",
  deliverables: "Entregables",
};

function preflightNotionRelationsSyncOrThrow(
  input: NotionRelationsSyncInput,
  projectProperties: Record<string, unknown>,
): void {
  const parts: string[] = [];

  for (const propKind of PREFLIGHT_KIND_ORDER) {
    const rows = normalizedRelationLines(propKind, input);
    if (!rows) continue;

    const propKey = resolveRelationPropertyKeyFromKind(projectProperties, propKind);
    if (!propKey) {
      parts.push(
        `• ${PREFLIGHT_SECTION_LABEL[propKind]}: no aparece ninguna propiedad tipo «relación» en la página del proyecto (revisa nombres o variables NOTION_PROP_PROJECT_* relacionadas).`,
      );
      continue;
    }

    const wantsNewRows = rows.some(
      (r) => Boolean(r.primary.trim()) && !isLikelyNotionPageId(r.id.trim()),
    );
    const dbId = DATABASE_ID_BY_KIND[propKind]();
    if (wantsNewRows && !dbId) {
      parts.push(
        `• ${PREFLIGHT_SECTION_LABEL[propKind]}: para crear filas nuevas desde la app configura ${DATABASE_ENV_NAME[propKind]} en el servidor.`,
      );
    }
  }

  if (parts.length > 0) {
    throw new NotionRelationSyncError(
      `No se puede completar el guardado en Notion hasta resolver lo siguiente:\n${parts.join("\n")}`,
    );
  }
}

function wrapNotionMutationError(stage: string, err: unknown): never {
  const raw = err instanceof Error ? err.message : String(err);
  const notion = extractNotionErrorMessage(raw);

  console.error(stage, notion ?? raw);

  throw new NotionRelationSyncError(
    notion ? `${stage}: ${notion}` : `${stage}. ${raw.length > 600 ? `${raw.slice(0, 550)}…` : raw}`,
    502,
  );
}

async function notionPageGetJson(token: string, pageId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, {
    headers: notionApiJsonHeaders(token),
    cache: "no-store",
  });
  const txt = await res.text();
  if (!res.ok) {
    wrapNotionMutationError(`Fallo GET página ${pageId}`, new Error(txt));
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(txt);
  } catch {
    throw new NotionRelationSyncError("Respuesta GET página Notion no es JSON.");
  }
  if (!isRecord(parsed)) throw new NotionRelationSyncError("Respuesta GET página Notion inválida.");
  return parsed;
}

export async function fetchNotionProjectPageProperties(
  pageId: string,
  token: string,
): Promise<Record<string, unknown>> {
  const page = await notionPageGetJson(token, pageId);
  const props = page.properties;
  if (!isRecord(props)) {
    throw new NotionRelationSyncError("La página del proyecto no expone propiedades de Notion.");
  }
  return props;
}

function findTitlePropKey(properties: Record<string, unknown>): string | undefined {
  for (const k of Object.keys(properties)) {
    const block = properties[k];
    if (isRecord(block) && block.type === "title") return k;
  }
  return undefined;
}

const dbTitlePropCache = new Map<string, string>();

async function getDatabaseTitlePropKey(databaseId: string, token: string): Promise<string> {
  const cached = dbTitlePropCache.get(databaseId);
  if (cached) return cached;

  const res = await fetch(`https://api.notion.com/v1/databases/${encodeURIComponent(databaseId)}`, {
    headers: notionApiJsonHeaders(token),
    cache: "no-store",
  });
  const txt = await res.text();
  if (!res.ok) {
    wrapNotionMutationError(`Fallo GET base ${databaseId}`, new Error(txt));
  }
  let db: unknown;
  try {
    db = JSON.parse(txt);
  } catch {
    throw new NotionRelationSyncError(`Base ${databaseId}: respuesta JSON inválida.`);
  }
  if (!isRecord(db)) throw new NotionRelationSyncError(`Base ${databaseId}: objeto inválido.`);
  const schema = db.properties;
  if (!isRecord(schema)) {
    throw new NotionRelationSyncError(`La base configurada (${databaseId}) no expone schema de propiedades.`);
  }

  const key = findTitlePropKey(schema);
  if (!key) {
    throw new NotionRelationSyncError(`La base relacionada (${databaseId}) no tiene propiedad tipo título en el schema.`);
  }

  dbTitlePropCache.set(databaseId, key);
  return key;
}

async function patchPageTitle(token: string, pageId: string, plainTitle: string): Promise<void> {
  const page = await notionPageGetJson(token, pageId);
  const props = page.properties;
  if (!isRecord(props)) {
    wrapNotionMutationError(`PATCH fila relacionada (${pageId})`, new Error("sin properties"));
  }
  const titleKey = findTitlePropKey(props);
  if (!titleKey) {
    throw new NotionRelationSyncError(
      `La fila relacionada (${pageId}) no tiene ninguna propiedad de tipo «título»: no puedo renovar el nombre.`,
    );
  }

  const content = plainTitle.trim().slice(0, 2000);
  const body = {
    properties: {
      [titleKey]: {
        title: [{ type: "text", text: { content: content } }],
      },
    },
  };

  const res = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, {
    method: "PATCH",
    headers: notionApiJsonHeaders(token),
    body: JSON.stringify(body),
  });
  const out = await res.text();
  if (!res.ok) {
    wrapNotionMutationError(`Actualizar nombre de fila relacionada (${pageId})`, new Error(out));
  }
}

function resolveTaskPageSprintRelationKey(props: Record<string, unknown>): string | undefined {
  const explicit = process.env.NOTION_TASKS_SPRINT_LINK_PROP?.trim();
  if (explicit) {
    const k = relationPropertyKeyByName(props, explicit);
    if (k) return k;
  }
  for (const cand of notionTaskPageSprintRelationCandidates()) {
    const k = relationPropertyKeyByName(props, cand);
    if (k) return k;
  }
  return undefined;
}

async function patchTaskPageAllProperties(params: {
  token: string;
  taskPageId: string;
  title?: string;
  sprintId?: string | null;
  sprintBoardColumn?: ItSprintTaskBoardColumn;
  assigneeName?: string;
  targetDate?: string;
  monthId?: string;
}): Promise<void> {
  const { token, taskPageId, monthId } = params;
  const page = await notionPageGetJson(token, taskPageId);
  const props = page.properties as Record<string, unknown>;
  const properties: Record<string, unknown> = {};

  if (monthId !== undefined) {
    const propKey = findNotionPagePropertyKey(props, "mes") || findNotionPagePropertyKey(props, "Mes");
    if (propKey) {
      properties[propKey] = {
        relation: monthId ? [{ id: monthId }] : [],
      };
    }
  }

  if (params.title !== undefined) {
    const titleKey = findTitlePropKey(props);
    if (titleKey) {
      properties[titleKey] = {
        title: [{ type: "text", text: { content: params.title.trim() } }],
      };
    }
  }

  if (params.sprintId !== undefined) {
    const sprintKey = resolveTaskPageSprintRelationKey(props);
    if (sprintKey) {
      properties[sprintKey] = {
        relation: params.sprintId ? [{ id: params.sprintId }] : [],
      };
    }
  }

  if (params.sprintBoardColumn !== undefined) {
    const propLabel = notionTaskBoardStatusPropertyLabel();
    const statusOption = notionTaskBoardStatusOptionFallback(params.sprintBoardColumn);
    if (propLabel && statusOption) {
      properties[propLabel] = { status: { name: statusOption } };
    }
  }

  if (params.assigneeName !== undefined || params.targetDate !== undefined) {
    if (params.assigneeName !== undefined) {
      const propKey = findNotionPagePropertyKey(props, "Responsable") || findNotionPagePropertyKey(props, "responsable");
      if (propKey) {
        const cell = props[propKey];
        if (isRecord(cell)) {
          const val = params.assigneeName.trim();
          if (cell.type === "select") {
            properties[propKey] = val ? { select: { name: val } } : { select: null };
          } else if (cell.type === "multi_select") {
            properties[propKey] = val ? { multi_select: [{ name: val }] } : { multi_select: [] };
          } else if (cell.type === "people") {
            console.warn(`[Notion Sync] No se puede actualizar responsable "${val}" en columna tipo "people" por nombre.`);
          }
        }
      }
    }

    if (params.targetDate !== undefined) {
      let val = params.targetDate.trim();
      if (val.includes("/") || val.includes("-")) {
        const parts = val.split(/[\/-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            val = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
          } else if (parts[2].length === 4) {
            val = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }
      }

      const propKey = findNotionPagePropertyKey(props, "Due Date") || 
                      findNotionPagePropertyKey(props, "Fecha de entrega") || 
                      findNotionPagePropertyKey(props, "Fecha límite") || 
                      findNotionPagePropertyKey(props, "Fecha");
      if (propKey) {
        properties[propKey] = val ? { date: { start: val } } : { date: null };
      }
    }
  }

  if (Object.keys(properties).length === 0) return;

  const res = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(taskPageId)}`, {
    method: "PATCH",
    headers: notionApiJsonHeaders(token),
    body: JSON.stringify({ properties }),
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error(`[Notion Sync] Error patching task ${taskPageId}:`, err);
  }
}

async function taskRelationPatchSlice(params: {
  token: string;
  projectPageId: string;
  projectProperties: Record<string, unknown>;
  lines: readonly {
    id: string;
    text: string;
    sprintId?: string | null;
    sprintBoardColumn?: ItSprintTaskBoardColumn;
    assigneeName?: string;
    targetDate?: string;
  }[];
  monthId?: string;
}): Promise<Record<string, unknown>> {
  const propKey = resolveRelationPropertyKeyFromKind(params.projectProperties, "tasks");
  if (!propKey) {
    throw new NotionRelationSyncError(
      `No se encontró en la página del proyecto ninguna propiedad de tipo «relación» para ${KIND_LABEL.tasks}. Revisa el nombre en Notion o configura las variables NOTION_PROP_PROJECT_*_RELATION en el servidor.`,
    );
  }


  const notionIds: string[] = [];
  const dbIdFromEnv = DATABASE_ID_BY_KIND.tasks();
  const backlinkProp = BACKLINK_PROP_BY_KIND.tasks();

  for (const row of params.lines) {
    const plain = row.text.trim();
    if (!plain) continue;

    try {
      if (isLikelyNotionPageId(row.id.trim())) {
        const pid = row.id.trim();
        await patchTaskPageAllProperties({
          token: params.token,
          taskPageId: pid,
          title: plain,
          sprintId: row.sprintId,
          sprintBoardColumn: row.sprintBoardColumn,
           assigneeName: row.assigneeName,
           targetDate: row.targetDate,
           monthId: params.monthId,
         });
        notionIds.push(pid);
        continue;
      }

      const dbId = dbIdFromEnv;
      if (!dbId) {
        throw new NotionRelationSyncError(
          `Para crear ${KIND_LABEL.tasks} nuevos desde la app, define en el servidor la variable ${DATABASE_ENV_NAME.tasks} con el ID de la base de Notion correspondiente.`,
        );
      }

      const titleKey = await getDatabaseTitlePropKey(dbId, params.token);

      const createProps = buildCreatedRowProps({
        titleKey,
        titlePlain: plain,
        projectPageId: params.projectPageId,
        relationToProjectProp: backlinkProp?.trim(),
      });

      const { id: newId } = await notionApiCreateDatabasePage({
        databaseId: dbId,
        token: params.token,
        properties: createProps,
        relatedRowIcon: "task",
      });
      notionIds.push(newId);
      await patchTaskPageAllProperties({
        token: params.token,
        taskPageId: newId,
        sprintId: row.sprintId,
        sprintBoardColumn: row.sprintBoardColumn,
         assigneeName: row.assigneeName,
         targetDate: row.targetDate,
         monthId: params.monthId,
       });
    } catch (e) {
      if (e instanceof NotionRelationSyncError) throw e;
      wrapNotionMutationError(`Guardar ${KIND_LABEL.tasks} en Notion`, e);
    }
  }

  return {
    [propKey]: {
      relation: notionIds.map((id) => ({ id })),
    },
  };
}

function buildCreatedRowProps(params: {
  titleKey: string;
  titlePlain: string;
  projectPageId: string;
  relationToProjectProp?: string | undefined;
}): Record<string, unknown> {
  const titleTrim = params.titlePlain.trim().slice(0, 2000);
  const out: Record<string, unknown> = {
    [params.titleKey]: {
      title: [{ type: "text", text: { content: titleTrim } }],
    },
  };
  const relProp = params.relationToProjectProp?.trim();
  if (relProp) {
    out[relProp] = { relation: [{ id: params.projectPageId }] };
  }
  return out;
}

async function relationPatchSlice(params: {
  token: string;
  projectPageId: string;
  projectProperties: Record<string, unknown>;
  propKind: RelationKindProp;
  lines: readonly { id: string; primary: string }[];
  databaseEnv: () => string | undefined;
  backlinkEnv: () => string | undefined;
  /** Si al crear una fila nueva (id local), registra `id local → id página Notion` (p. ej. remapear tarea→sprint). */
  recordCreatedIds?: Map<string, string>;
}): Promise<Record<string, unknown>> {
  const propKey = resolveRelationPropertyKeyFromKind(params.projectProperties, params.propKind);
  if (!propKey) {
    throw new NotionRelationSyncError(
      `No se encontró en la página del proyecto ninguna propiedad de tipo «relación» para ${KIND_LABEL[params.propKind]}. Revisa el nombre en Notion o configura las variables NOTION_PROP_PROJECT_*_RELATION en el servidor.`,
    );
  }

  const notionIds: string[] = [];
  const dbIdFromEnv = params.databaseEnv();
  const backlinkProp = params.backlinkEnv();

  for (const row of params.lines) {
    const plain = row.primary.trim();
    if (!plain) continue;

    try {
      if (isLikelyNotionPageId(row.id.trim())) {
        const pid = row.id.trim();
        await patchPageTitle(params.token, pid, plain);
        notionIds.push(pid);
        continue;
      }

      const dbId = dbIdFromEnv;
      if (!dbId) {
        throw new NotionRelationSyncError(
          `Para crear ${KIND_LABEL[params.propKind]} nuevos desde la app, define en el servidor la variable ${DATABASE_ENV_NAME[params.propKind]} con el ID de la base de Notion correspondiente.`,
        );
      }

      const titleKey = await getDatabaseTitlePropKey(dbId, params.token);

      const createProps = buildCreatedRowProps({
        titleKey,
        titlePlain: plain,
        projectPageId: params.projectPageId,
        relationToProjectProp: backlinkProp?.trim(),
      });

      const { id: newId } = await notionApiCreateDatabasePage({
        databaseId: dbId,
        token: params.token,
        properties: createProps,
        skipProjectIconEmoji: params.propKind === "deliverables",
        relatedRowIcon:
          params.propKind === "keyResults" ? "keyResult" : params.propKind === "sprints" ? "sprint" : undefined,
      });
      notionIds.push(newId);
      params.recordCreatedIds?.set(row.id.trim(), newId);
    } catch (e) {
      if (e instanceof NotionRelationSyncError) throw e;
      wrapNotionMutationError(`Guardar ${KIND_LABEL[params.propKind]} en Notion`, e);
    }
  }

  return {
    [propKey]: {
      relation: notionIds.map((id) => ({ id })),
    },
  };
}

/**
 * Fragmento del `PATCH` pages de proyecto: actualiza enlaces relation + títulos de filas enlazadas
 * ya existentes en Notion, y opcionalmente crea filas en bases hijas usando variables *_DATABASE_ID.
 */
export async function buildNotionRelationsPropertiesPatch(opts: {
  token: string;
  projectPageId: string;
  projectProperties: Record<string, unknown>;
  input: NotionRelationsSyncInput;
  monthId?: string;
}): Promise<Record<string, unknown>> {
  const merged: Record<string, unknown> = {};
  const { token, projectPageId, projectProperties, monthId } = opts;

  const hasRelationSlices =
    opts.input.keyResultLines !== undefined ||
    opts.input.taskLines !== undefined ||
    opts.input.sprintRows !== undefined ||
    opts.input.deliverables !== undefined;

  if (hasRelationSlices) {
    preflightNotionRelationsSyncOrThrow(opts.input, projectProperties);
  }

  if (opts.input.keyResultLines !== undefined) {
    Object.assign(
      merged,
      await relationPatchSlice({
        token,
        projectPageId,
        projectProperties,
        propKind: "keyResults",
        lines: opts.input.keyResultLines.map((l) => ({ id: l.id, primary: l.text })),
        databaseEnv: DATABASE_ID_BY_KIND.keyResults,
        backlinkEnv: BACKLINK_PROP_BY_KIND.keyResults,
      }),
    );
  }

  const sprintLocalIdToNotionPageId = new Map<string, string>();

  if (opts.input.sprintRows !== undefined) {
    Object.assign(
      merged,
      await relationPatchSlice({
        token,
        projectPageId,
        projectProperties,
        propKind: "sprints",
        lines: opts.input.sprintRows.map((l) => ({ id: l.id, primary: l.title })),
        databaseEnv: DATABASE_ID_BY_KIND.sprints,
        backlinkEnv: BACKLINK_PROP_BY_KIND.sprints,
        recordCreatedIds: sprintLocalIdToNotionPageId,
      }),
    );
  }

  if (opts.input.taskLines !== undefined) {
    let taskLinesResolved = opts.input.taskLines;
    if (sprintLocalIdToNotionPageId.size > 0) {
      taskLinesResolved = taskLinesResolved.map((line) => {
        const sid = line.sprintId;
        if (sid === undefined || sid === null) return line;
        const raw = typeof sid === "string" ? sid.trim() : "";
        if (!raw) return line;
        const mapped = sprintLocalIdToNotionPageId.get(raw);
        if (mapped) return { ...line, sprintId: mapped };
        return line;
      });
    }
    Object.assign(
       merged,
       await taskRelationPatchSlice({
         token,
         projectPageId,
         projectProperties,
         lines: taskLinesResolved,
         monthId: monthId,
       }),
     );
  }

  if (opts.input.deliverables !== undefined) {
    Object.assign(
      merged,
      await relationPatchSlice({
        token,
        projectPageId,
        projectProperties,
        propKind: "deliverables",
        lines: opts.input.deliverables.map((l) => ({ id: l.id, primary: l.title })),
        databaseEnv: DATABASE_ID_BY_KIND.deliverables,
        backlinkEnv: BACKLINK_PROP_BY_KIND.deliverables,
      }),
    );
  }

  return merged;
}

function sprintPageTasksRelationKey(sprintProps: Record<string, unknown>): string | undefined {
  const explicit = process.env.NOTION_PROP_SPRINT_TASKS_RELATION?.trim();
  if (explicit) {
    const byName = relationPropertyKeyByName(sprintProps, explicit);
    if (byName) return byName;
  }
  return resolveRelationPropertyKeyFromKind(sprintProps, "tasks");
}

/**
 * La app enlaza las tareas solo en **Proyectos**. Si en tu base **Sprints** tienes también una relación «tareas»,
 * esa columna queda vacía salvo esta pasada opcional (tras PATCH del proyecto ya actualizado en Notion).
 *
 * Variables:
 * - `NOTION_MIRROR_PROJECT_TASKS_TO_SPRINT=single`: si el proyecto enlaza exactamente **un** sprint,
 *   copias la misma lista de IDs de la relación tareas del proyecto a esa fila sprint.
 * - `NOTION_MIRROR_PROJECT_TASKS_TO_SPRINT=all`: hace lo mismo para **todas** las filas sprint enlazadas (misma lista en cada una).
 *
 * Opcional: `NOTION_PROP_SPRINT_TASKS_RELATION` — nombre exacto de la propiedad tipo relación «tareas» en la página de sprint,
 * si no coincide con los candidatos por defecto (p. ej. `tareas`, `Tareas`…).
 */
export async function mirrorProjectTasksToLinkedSprintsBestEffort(params: {
  token: string;
  projectPageId: string;
}): Promise<void> {
  const raw = process.env.NOTION_MIRROR_PROJECT_TASKS_TO_SPRINT?.trim().toLowerCase();
  const mode = raw === "single" || raw === "all" ? raw : null;
  if (!mode) return;

  const projectProps = await fetchNotionProjectPageProperties(params.projectPageId, params.token);
  const sprintIds = relationIdsFromCandidates(projectProps, notionRelationPropertyCandidates("sprints"));
  const taskIds = relationIdsFromCandidates(projectProps, notionRelationPropertyCandidates("tasks"));
  if (taskIds.length === 0 || sprintIds.length === 0) return;

  const targets = mode === "single" ? (sprintIds.length === 1 ? sprintIds : []) : sprintIds.slice();
  if (targets.length === 0) return;

  for (const sprintId of targets) {
    try {
      const sprintProps = await fetchNotionProjectPageProperties(sprintId, params.token);
      const key = sprintPageTasksRelationKey(sprintProps);
      if (key) {
        await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(sprintId)}`, {
          method: "PATCH",
          headers: notionApiJsonHeaders(params.token),
          body: JSON.stringify({
            properties: {
              [key]: {
                relation: taskIds.map((id) => ({ id })),
              },
            },
          }),
        });
      }
    } catch (err) {
      console.error(`Error mirroring tasks to sprint ${sprintId}:`, err);
    }
  }
}
