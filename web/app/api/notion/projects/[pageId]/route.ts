import { NextResponse } from "next/server";
import { extractNotionErrorMessage } from "@/lib/notionCreateProjectPayload";
import {
  fetchItProjectByNotionPageId,
  isLikelyNotionPageId,
  notionTrashPageBestEffort,
} from "@/lib/notionProjectFromPage";

export const revalidate = 0;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pageId: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const { pageId: pageIdRaw } = await ctx.params;
  const pageId = decodeURIComponent(pageIdRaw);

  if (!isLikelyNotionPageId(pageId)) {
    return NextResponse.json({ error: "Id de página no válido" }, { status: 400 });
  }

  const token = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_IT_PROJECTS_DB_ID;

  if (!token || !dbId) {
    return NextResponse.json(
      {
        code: "NOTION_NOT_CONFIGURED",
        error: "Faltan NOTION_API_KEY o NOTION_IT_PROJECTS_DB_ID en el servidor.",
      },
      { status: 503 },
    );
  }

  try {
    const project = await fetchItProjectByNotionPageId(pageId, token, dbId);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error("GET Notion project by id:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const { pageId: pageIdRaw } = await ctx.params;
  const pageId = decodeURIComponent(pageIdRaw);

  if (!isLikelyNotionPageId(pageId)) {
    return NextResponse.json({ error: "Id de página no válido" }, { status: 400 });
  }

  const token = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_IT_PROJECTS_DB_ID;

  if (!token || !dbId) {
    return NextResponse.json(
      {
        code: "NOTION_NOT_CONFIGURED",
        error: "Faltan NOTION_API_KEY o NOTION_IT_PROJECTS_DB_ID en el servidor.",
      },
      { status: 503 },
    );
  }

  try {
    const existing = await fetchItProjectByNotionPageId(pageId, token, dbId);
    if (!existing) {
      return NextResponse.json(
        { error: "No encontrado o la página no pertenece a la base de proyectos configurada." },
        { status: 404 },
      );
    }

    await notionTrashPageBestEffort(pageId, token);
    return NextResponse.json({ trashed: true });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const notionMsg = extractNotionErrorMessage(raw);
    console.error("DELETE Notion project:", notionMsg ?? raw);
    return NextResponse.json(
      { error: notionMsg ?? "No se pudo eliminar el proyecto en Notion (enviarlo a papelera)." },
      { status: 502 },
    );
  }
}
