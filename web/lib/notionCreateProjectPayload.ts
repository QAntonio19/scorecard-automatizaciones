import { mapPhaseToNotionEstatus } from "@/lib/notionEstatusPhase";
import type { ItProjectPhase, ItProjectRisk, ItProjectUrgency } from "@/lib/itProjectTypes";

const NOTION_API_VERSION = "2022-06-28";

/** Mismo rasgo visual cuadrado‑verde que las filas existentes ITAI (`🟩` en Notion). */
const DEFAULT_NOTION_CREATE_PROJECT_ICON_EMOJI = "❇️";

const DEFAULT_NOTION_CREATE_TASK_ICON_EMOJI = "📌";
/** Keycap asterisk (*️⃣) — Notion acepta secuencias emoji completas. */
const DEFAULT_NOTION_CREATE_KR_ICON_EMOJI = "*\uFE0F\u20E3";
const DEFAULT_NOTION_CREATE_SPRINT_ICON_EMOJI = "🏃";

export type NotionCreateRelatedRowIconKind = "task" | "keyResult" | "sprint";

export function notionRiskToSelectName(level: ItProjectRisk): string {
  if (level === "alto") return "Alta";
  if (level === "medio") return "Media";
  return "Baja";
}

export function notionUrgencyToSelectName(level: ItProjectUrgency): string {
  if (level === "alta") return "Alta";
  if (level === "baja") return "Baja";
  return "Media";
}

/** Trocea texto para Notion (máx. 2000 caracteres por nodo `text`). */
export function notionRichTextFromPlain(text: string): { type: string; text: { content: string } }[] {
  const segments: { type: string; text: { content: string } }[] = [];
  for (let i = 0; i < text.length; i += 2000) {
    segments.push({ type: "text", text: { content: text.slice(i, i + 2000) } });
  }
  return segments;
}

/** Valores escritos para riesgo/urgencia (`status`) y responsable (`multi_select`) según ITAI Proyectos. */
export function buildNotionCreateProjectProperties(input: {
  name: string;
  phase: ItProjectPhase;
  riskLevel: ItProjectRisk;
  urgencyLevel?: ItProjectUrgency;
  /** Varios responsables (Notion `multi_select`). Si está vacío pero hay `pmName`, se usa ese. */
  pmNames?: readonly string[];
  /** Un solo nombre (compat); si `pmNames` tiene valores, se ignoran aquí. */
  pmName?: string;
  /** Si `NOTION_PROP_PROJECT_DESCRIPTION` está definido, se mapea como `rich_text`. */
  description?: string;
}): Record<string, unknown> {
  const titlePropName = process.env.NOTION_PROP_PROJECT_TITLE?.trim() || "Nombre";
  const riskProp = process.env.NOTION_PROP_PROJECT_RISK?.trim() || "Nivel de riesgo";
  const urgProp = process.env.NOTION_PROP_PROJECT_URGENCY?.trim() || "Nivel de Urgencia";
  const statusProp = process.env.NOTION_PROP_PROJECT_STATUS?.trim() || "Estatus";
  const responsableProp = process.env.NOTION_PROP_RESPONSABLE?.trim() || "Responsable";
  const descriptionProp = process.env.NOTION_PROP_PROJECT_DESCRIPTION?.trim();

  const props: Record<string, unknown> = {
    [titlePropName]: {
      title: [{ type: "text", text: { content: input.name.slice(0, 2000) } }],
    },
    [riskProp]: {
      status: { name: notionRiskToSelectName(input.riskLevel) },
    },
    [urgProp]: {
      status: { name: notionUrgencyToSelectName(input.urgencyLevel ?? "media") },
    },
    [statusProp]: {
      status: { name: mapPhaseToNotionEstatus(input.phase) },
    },
  };

  const fromList = (input.pmNames ?? []).map((s) => s.trim()).filter((s) => s && s !== "—");
  const names =
    fromList.length > 0
      ? [...new Set(fromList)]
      : (() => {
          const one = input.pmName?.trim();
          return one && one !== "—" ? [one] : [];
        })();
  if (names.length > 0) {
    props[responsableProp] = {
      multi_select: names.map((n) => ({ name: n.slice(0, 500) })),
    };
  }

  const desc = input.description?.trim();
  if (descriptionProp && desc) {
    props[descriptionProp] = { rich_text: notionRichTextFromPlain(desc) };
  }

  return props;
}

/**
 * Icono de página al crear desde la API. Sin payload `icon`, Notion usa el papel gris.
 *
 * Por defecto se usa un **cuadrado verde** (`🟩`), alineado con el estilo habitual de los proyectos.
 *
 * Sobrescribir con:
 * - `NOTION_CREATE_PROJECT_ICON_EXTERNAL_URL`: URL **https** pública (réplica pixel‑perfect).
 * - `NOTION_CREATE_PROJECT_ICON_EMOJI`: otro emoji. Si vale cadena vacía (`NOTION_CREATE_PROJECT_ICON_EMOJI=`), no se envía emoji (icono neutro).
 *
 * Prioridad: URL externa, luego emoji (variable de entorno o valor por defecto).
 */
export function notionCreateProjectIconFromEnv(): Record<string, unknown> | undefined {
  const url = process.env.NOTION_CREATE_PROJECT_ICON_EXTERNAL_URL?.trim();
  if (url?.startsWith("https://")) {
    return { type: "external", external: { url } };
  }

  const rawEmojiEnv = process.env.NOTION_CREATE_PROJECT_ICON_EMOJI;
  const emoji =
    rawEmojiEnv === undefined
      ? DEFAULT_NOTION_CREATE_PROJECT_ICON_EMOJI
      : rawEmojiEnv.trim();

  if (emoji.length > 0) {
    return { type: "emoji", emoji };
  }

  return undefined;
}

/**
 * Icono al crear filas en bases hijas (tareas, KRs, sprints). Solo emoji (sin URL externa compartida con proyectos).
 *
 * Variables opcionales (cadena vacía = sin icono):
 * - `NOTION_CREATE_TASK_ICON_EMOJI` (por defecto 📌)
 * - `NOTION_CREATE_KR_ICON_EMOJI` (por defecto *️⃣)
 * - `NOTION_CREATE_SPRINT_ICON_EMOJI` (por defecto 🏃; para 🏃‍➡️ u otros, define la variable: algunos ZWJ no los acepta la API)
 */
export function notionCreateRelatedRowIconFromEnv(
  kind: NotionCreateRelatedRowIconKind,
): Record<string, unknown> | undefined {
  const envKey =
    kind === "task"
      ? "NOTION_CREATE_TASK_ICON_EMOJI"
      : kind === "keyResult"
        ? "NOTION_CREATE_KR_ICON_EMOJI"
        : "NOTION_CREATE_SPRINT_ICON_EMOJI";

  const raw = process.env[envKey];
  const def =
    kind === "task"
      ? DEFAULT_NOTION_CREATE_TASK_ICON_EMOJI
      : kind === "keyResult"
        ? DEFAULT_NOTION_CREATE_KR_ICON_EMOJI
        : DEFAULT_NOTION_CREATE_SPRINT_ICON_EMOJI;

  const emoji = raw === undefined ? def : raw.trim();
  if (emoji.length === 0) return undefined;
  return { type: "emoji", emoji };
}

export async function notionApiCreateDatabasePage(params: {
  databaseId: string;
  token: string;
  properties: Record<string, unknown>;
  /** Si es true, no envía `icon` (Notion muestra el icono por defecto). Por defecto se usa el mismo emoji/URL que en proyectos (`notionCreateProjectIconFromEnv`). */
  skipProjectIconEmoji?: boolean;
  /** Si se indica, icono específico para tarea / KR / sprint (sustituye el emoji de proyecto). Ignorado si `skipProjectIconEmoji`. */
  relatedRowIcon?: NotionCreateRelatedRowIconKind;
}): Promise<{ id: string }> {
  const payload: Record<string, unknown> = {
    parent: { database_id: params.databaseId },
    properties: params.properties,
  };
  let icon: Record<string, unknown> | undefined;
  if (params.skipProjectIconEmoji === true) {
    icon = undefined;
  } else if (params.relatedRowIcon) {
    icon = notionCreateRelatedRowIconFromEnv(params.relatedRowIcon);
  } else {
    icon = notionCreateProjectIconFromEnv();
  }
  if (icon) payload.icon = icon;

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(bodyText.slice(0, 8000));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText) as unknown;
  } catch {
    throw new Error("Respuesta Notion inválida: JSON");
  }

  const id =
    typeof parsed === "object" && parsed !== null && "id" in parsed && typeof (parsed as { id: unknown }).id === "string"
      ? (parsed as { id: string }).id
      : undefined;
  if (!id) throw new Error("Respuesta Notion inválida: sin id");

  return { id };
}

export function extractNotionErrorMessage(payload: string): string | undefined {
  const trimmed = payload.trim();
  if (!trimmed) return undefined;
  try {
    const o = JSON.parse(trimmed) as {
      message?: unknown;
      code?: unknown;
    };
    if (typeof o.message === "string" && o.message.length > 0) {
      return o.message;
    }
    if (Array.isArray(o.message)) {
      const parts = o.message.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
      const joined = parts.filter(Boolean).join(" · ");
      return joined || undefined;
    }
    if (typeof o.code === "string") {
      const hint = typeof o.message === "string" ? o.message : "";
      return hint ? `${o.code}: ${hint}` : o.code;
    }
  } catch {
    return trimmed.length <= 600 ? trimmed : `${trimmed.slice(0, 550)}…`;
  }
  return undefined;
}
