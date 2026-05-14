import { extractNotionErrorMessage } from "@/lib/notionCreateProjectPayload";
import {
  notionApiAuthHeadersCapabilitiesOnly,
  notionApiJsonHeadersCapabilities,
} from "@/lib/notionRelations";

const MAX_SINGLE_PART_BYTES = 20 * 1024 * 1024;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function readFileUploadPayload(json: unknown): { id: string; status: string } | null {
  if (!isRecord(json)) return null;
  const id = json.id;
  const status = json.status;
  if (typeof id !== "string" || typeof status !== "string") return null;
  return { id, status };
}

/**
 * Crea un file upload en Notion, envía el binario y devuelve el id con status `uploaded`.
 */
export async function notionUploadFileSinglePart(
  token: string,
  input: { filename: string; contentType: string; body: ArrayBuffer | Blob | Buffer },
): Promise<{ fileUploadId: string }> {
  const filenameSafe = input.filename.trim().slice(0, 880) || "adjunto.bin";
  const contentType = input.contentType.trim() || "application/octet-stream";

  const createRes = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: notionApiJsonHeadersCapabilities(token),
    body: JSON.stringify({
      mode: "single_part",
      filename: filenameSafe,
      content_type: contentType,
    }),
  });

  const createTxt = await createRes.text();
  if (!createRes.ok) {
    const msg = extractNotionErrorMessage(createTxt) ?? createTxt.slice(0, 600);
    throw new Error(msg);
  }

  let createJson: unknown;
  try {
    createJson = JSON.parse(createTxt);
  } catch {
    throw new Error("Respuesta inválida de Notion al crear file upload.");
  }

  const parsed = readFileUploadPayload(createJson);
  if (!parsed) {
    throw new Error("Respuesta de Notion sin id de file upload.");
  }
  const uploadId = parsed.id;

  const blob =
    input.body instanceof Blob
      ? input.body
      : new Blob([input.body as ArrayBuffer], { type: contentType });

  const form = new FormData();
  form.append("file", blob, filenameSafe);

  const sendRes = await fetch(
    `https://api.notion.com/v1/file_uploads/${encodeURIComponent(uploadId)}/send`,
    {
      method: "POST",
      headers: notionApiAuthHeadersCapabilitiesOnly(token),
      body: form,
    },
  );

  const sendTxt = await sendRes.text();
  if (!sendRes.ok) {
    const msg = extractNotionErrorMessage(sendTxt) ?? sendTxt.slice(0, 600);
    throw new Error(msg);
  }

  let sendJson: unknown;
  try {
    sendJson = JSON.parse(sendTxt);
  } catch {
    throw new Error("Respuesta inválida de Notion al enviar archivo.");
  }

  const sent = readFileUploadPayload(sendJson);
  if (!sent || sent.status !== "uploaded") {
    throw new Error("Notion no marcó el archivo como subido (uploaded).");
  }

  return { fileUploadId: sent.id };
}

/** Añade un bloque archivo (desde file upload API) al final del cuerpo de la página-tarea. */
export async function notionAppendFileUploadBlock(
  token: string,
  pageId: string,
  fileUploadId: string,
): Promise<void> {
  const child = {
    object: "block" as const,
    type: "file" as const,
    file: {
      caption: [] as unknown[],
      type: "file_upload" as const,
      file_upload: { id: fileUploadId },
    },
  };

  const res = await fetch(`https://api.notion.com/v1/blocks/${encodeURIComponent(pageId)}/children`, {
    method: "PATCH",
    headers: notionApiJsonHeadersCapabilities(token),
    body: JSON.stringify({
      children: [child],
    }),
  });

  const txt = await res.text();
  if (!res.ok) {
    const msg = extractNotionErrorMessage(txt) ?? txt.slice(0, 600);
    throw new Error(msg);
  }
}

export type NotionTaskCommentRow = {
  id: string;
  createdAt: string;
  text: string;
  authorLabel: string;
};

function richTextItemsToPlain(items: unknown): string {
  if (!Array.isArray(items)) return "";
  const parts: string[] = [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const pt = item.plain_text;
    if (typeof pt === "string") parts.push(pt);
  }
  return parts.join("").trim();
}

function commentAuthorLabel(c: Record<string, unknown>): string {
  const by = c.created_by;
  if (!isRecord(by)) return "Notion";

  if (by.type === "user" && isRecord(by.user)) {
    const n = by.user.name;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  if (by.type === "bot") return "Bot";
  if (typeof by.id === "string" && by.id.length > 6) {
    return `Usuario ${by.id.slice(0, 6)}…`;
  }
  return "Notion";
}

function mapNotionComment(raw: unknown): NotionTaskCommentRow | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : null;
  const created = typeof raw.created_time === "string" ? raw.created_time : null;
  if (!id || !created) return null;
  const rt = raw.rich_text;
  const markdown = raw.markdown;
  const text =
    typeof markdown === "string" && markdown.trim()
      ? markdown.trim()
      : richTextItemsToPlain(rt);
  return {
    id,
    createdAt: created,
    text,
    authorLabel: commentAuthorLabel(raw),
  };
}

/** Comentarios sin resolver en la página-tarea (pages = blocks en Notion). Paginado. */
export async function notionListUnresolvedCommentsForPage(
  token: string,
  pageId: string,
): Promise<NotionTaskCommentRow[]> {
  const out: NotionTaskCommentRow[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL("https://api.notion.com/v1/comments");
    url.searchParams.set("block_id", pageId);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: notionApiJsonHeadersCapabilities(token),
      cache: "no-store",
    });
    const txt = await res.text();
    if (!res.ok) {
      const msg = extractNotionErrorMessage(txt) ?? txt.slice(0, 600);
      throw new Error(msg);
    }

    let json: unknown;
    try {
      json = JSON.parse(txt);
    } catch {
      throw new Error("Respuesta inválida listando comentarios.");
    }

    if (!isRecord(json)) break;
    const results = json.results;
    if (Array.isArray(results)) {
      for (const r of results) {
        const row = mapNotionComment(r);
        if (row) out.push(row);
      }
    }

    const more = json.has_more === true;
    const next = typeof json.next_cursor === "string" ? json.next_cursor : null;
    cursor = more && next ? next : undefined;
  } while (cursor);

  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function notionCreatePageCommentMarkdown(
  token: string,
  pageId: string,
  markdown: string,
): Promise<void> {
  const body = markdown.trim();
  if (!body) {
    throw new Error("El comentario no puede estar vacío.");
  }

  const res = await fetch("https://api.notion.com/v1/comments", {
    method: "POST",
    headers: notionApiJsonHeadersCapabilities(token),
    body: JSON.stringify({
      parent: {
        page_id: pageId,
      },
      markdown: body.slice(0, 12_000),
    }),
  });

  const txt = await res.text();
  if (!res.ok) {
    const msg = extractNotionErrorMessage(txt) ?? txt.slice(0, 600);
    throw new Error(msg);
  }
}

export { MAX_SINGLE_PART_BYTES };
