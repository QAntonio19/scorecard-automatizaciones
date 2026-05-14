import { NextResponse } from "next/server";
import { z } from "zod";
import {
  notionCreatePageCommentMarkdown,
  notionListUnresolvedCommentsForPage,
} from "@/lib/notionTaskPageContent";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";
import { embellishKnownNotionPermissionErrors } from "@/lib/notionPermissionHints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pageId: string }> };

const postBodySchema = z.object({
  text: z.string().min(1).max(12_000),
});

const COMMENTS_FORBIDDEN_HINT =
  "Notion devolvió 403 al leer o escribir comentarios. En el portal del desarrollador, activa en la integración las " +
  "capacidades de **leer comentarios** y **insertar comentarios** y vuelve a compartir la base o página.";

export async function GET(_request: Request, ctx: RouteCtx) {
  const { pageId: raw } = await ctx.params;
  const pageId = decodeURIComponent(raw).trim();

  if (!isLikelyNotionPageId(pageId)) {
    return NextResponse.json({ error: "Identificador de página de tarea no válido." }, { status: 400 });
  }

  const token = process.env.NOTION_API_KEY;

  if (!token) {
    return NextResponse.json(
      {
        code: "NOTION_NOT_CONFIGURED",
        error: "Falta NOTION_API_KEY en el servidor.",
      },
      { status: 503 },
    );
  }

  try {
    const comments = await notionListUnresolvedCommentsForPage(token, pageId);
    return NextResponse.json({ comments });
  } catch (e) {
    const rawMsg = e instanceof Error ? e.message : String(e);
    const lowered = rawMsg.toLowerCase();
    const looksLikeAuthz =
      lowered.includes("403") ||
      /\binsufficient\s+permissions\b/i.test(rawMsg) ||
      lowered.includes("restricted_resource");
    if (looksLikeAuthz) {
      const summary =
        /\binsufficient\s+permissions\b/i.test(rawMsg) || lowered.includes("restricted_resource")
          ? embellishKnownNotionPermissionErrors(rawMsg, "task_comments")
          : COMMENTS_FORBIDDEN_HINT;
      return NextResponse.json({ error: summary, comments: [], detail: rawMsg }, { status: 403 });
    }
    console.error("GET Notion task comments:", rawMsg);
    return NextResponse.json({ error: rawMsg.slice(0, 800), comments: [] }, { status: 502 });
  }
}

export async function POST(request: Request, ctx: RouteCtx) {
  const { pageId: raw } = await ctx.params;
  const pageId = decodeURIComponent(raw).trim();

  if (!isLikelyNotionPageId(pageId)) {
    return NextResponse.json({ error: "Identificador de página de tarea no válido." }, { status: 400 });
  }

  const token = process.env.NOTION_API_KEY;

  if (!token) {
    return NextResponse.json(
      {
        code: "NOTION_NOT_CONFIGURED",
        error: "Falta NOTION_API_KEY en el servidor.",
      },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validación incorrecta", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    await notionCreatePageCommentMarkdown(token, pageId, parsed.data.text.trim());
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const rawMsg = e instanceof Error ? e.message : String(e);
    const lowered = rawMsg.toLowerCase();
    const looksLikeAuthz =
      lowered.includes("403") ||
      /\binsufficient\s+permissions\b/i.test(rawMsg) ||
      lowered.includes("restricted_resource");
    if (looksLikeAuthz) {
      const summary =
        /\binsufficient\s+permissions\b/i.test(rawMsg) || lowered.includes("restricted_resource")
          ? embellishKnownNotionPermissionErrors(rawMsg, "task_comments")
          : COMMENTS_FORBIDDEN_HINT;
      return NextResponse.json({ error: summary, detail: rawMsg }, { status: 403 });
    }
    console.error("POST Notion task comment:", rawMsg);
    return NextResponse.json({ error: rawMsg.slice(0, 800) }, { status: 502 });
  }
}
