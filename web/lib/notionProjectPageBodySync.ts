import { extractNotionErrorMessage, notionRichTextFromPlain } from "@/lib/notionCreateProjectPayload";
import { notionApiJsonHeaders } from "@/lib/notionRelations";

/**
 * Sincroniza la descripción del proyecto con el **cuerpo de la página** Notion
 * (el área bajo las propiedades), no con una columna de la base.
 *
 * - Borra los bloques de primer nivel existentes y añade párrafos con el texto.
 * - Fallos se registran en consola; no relanzan (no bloquean el PATCH del proyecto).
 */
export async function syncNotionProjectPageBodyFromPlainBestEffort(
  token: string,
  pageId: string,
  plainText: string | undefined,
): Promise<void> {
  if (process.env.NOTION_SYNC_PROJECT_DESCRIPTION_TO_PAGE_BODY === "0") {
    return;
  }

  const trimmed = plainText?.trim() ?? "";

  try {
    const childIds = await listTopLevelBlockIds(token, pageId);
    for (const id of childIds) {
      await deleteNotionBlock(token, id);
    }

    if (!trimmed) return;

    const children = [
      {
        object: "block" as const,
        type: "paragraph" as const,
        paragraph: {
          rich_text: notionRichTextFromPlain(trimmed),
        },
      },
    ];

    const res = await fetch(`https://api.notion.com/v1/blocks/${encodeURIComponent(pageId)}/children`, {
      method: "PATCH",
      headers: notionApiJsonHeaders(token),
      body: JSON.stringify({ children }),
    });
    const txt = await res.text();
    if (!res.ok) {
      const msg = extractNotionErrorMessage(txt);
      console.error("[Notion] Sincronizar cuerpo de página proyecto:", msg ?? txt.slice(0, 500));
    }
  } catch (e) {
    console.error("[Notion] Sincronizar cuerpo de página proyecto:", e);
  }
}

async function listTopLevelBlockIds(token: string, pageId: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${encodeURIComponent(pageId)}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: notionApiJsonHeaders(token),
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await res.text();
      console.warn("[Notion] Listar bloques hijos:", extractNotionErrorMessage(t) ?? t.slice(0, 300));
      break;
    }
    const data = (await res.json()) as {
      results?: Array<{ id?: string }>;
      has_more?: boolean;
      next_start_cursor?: string;
    };
    for (const r of data.results ?? []) {
      if (typeof r.id === "string") ids.push(r.id);
    }
    cursor = data.has_more && data.next_start_cursor ? data.next_start_cursor : undefined;
  } while (cursor);

  return ids;
}

async function deleteNotionBlock(token: string, blockId: string): Promise<void> {
  const res = await fetch(`https://api.notion.com/v1/blocks/${encodeURIComponent(blockId)}`, {
    method: "DELETE",
    headers: notionApiJsonHeaders(token),
  });
  if (!res.ok) {
    const t = await res.text();
    console.warn("[Notion] Borrar bloque:", blockId, extractNotionErrorMessage(t) ?? t.slice(0, 200));
  }
}
