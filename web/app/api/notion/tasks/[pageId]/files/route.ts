import { NextResponse } from "next/server";
import {
  MAX_SINGLE_PART_BYTES,
  notionAppendFileUploadBlock,
  notionUploadFileSinglePart,
} from "@/lib/notionTaskPageContent";
import { embellishKnownNotionPermissionErrors } from "@/lib/notionPermissionHints";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pageId: string }> };

const FORBIDDEN_HINT =
  "Notion rechazó la operación (403). Verifica en el portal del desarrollador que la integración tiene " +
  "permisos de «insertar contenido» en la página o base donde vive la tarea (archivos/adjuntos en bloques).";

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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulario multipart inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Envía un campo de archivo llamado «file».' }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "Archivo vacío." }, { status: 400 });
  }
  if (file.size > MAX_SINGLE_PART_BYTES) {
    return NextResponse.json(
      {
        error: `El archivo supera ${Math.floor(MAX_SINGLE_PART_BYTES / (1024 * 1024))} MB (límite Notion para subida por partes única).`,
      },
      { status: 400 },
    );
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const { fileUploadId } = await notionUploadFileSinglePart(token, {
      filename: file.name || "adjunto",
      contentType: file.type || "application/octet-stream",
      body: buf,
    });
    await notionAppendFileUploadBlock(token, pageId, fileUploadId);
    return NextResponse.json({ ok: true as const, fileUploadId });
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
          ? embellishKnownNotionPermissionErrors(rawMsg, "task_file_attachment")
          : FORBIDDEN_HINT;
      return NextResponse.json({ error: summary, detail: rawMsg }, { status: 403 });
    }
    console.error("POST Notion task file:", rawMsg);
    return NextResponse.json({ error: rawMsg.slice(0, 800) }, { status: 502 });
  }
}
