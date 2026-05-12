import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildNotionCreateProjectProperties,
  extractNotionErrorMessage,
  notionApiCreateDatabasePage,
} from "@/lib/notionCreateProjectPayload";
import { notionRowsToItProjects } from "@/lib/notionProjectFromPage";
import type { ItProjectPhase } from "@/lib/itProjectTypes";
import { notionQueryAllDatabaseRows } from "@/lib/notionRelations";

/** Cache Notion response for 0s — avoids hammering Notion API but ensures fresh data for debug. */
export const revalidate = 0;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createBodySchema = z.object({
  name: z.string().min(1).max(2000),
  description: z.string().max(16000).optional(),
  phase: z.enum(["backlog", "sin_empezar", "planificacion", "ejecucion", "cierre", "archivado"]),
  riskLevel: z.enum(["bajo", "medio", "alto"]),
  urgencyLevel: z.enum(["baja", "media", "alta"]).optional(),
  /** Un responsable (API antigua). */
  pmName: z.string().max(500).optional(),
  /** Varios responsables (multi_select en Notion). */
  pmNames: z.array(z.string().max(500)).max(32).optional(),
});

export async function GET() {
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
    const results = await notionQueryAllDatabaseRows(dbId, token);
    const projects = await notionRowsToItProjects(results, token);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching Notion projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      {
        error: "Validación incorrecta",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  const dto = parsed.data;
  const pmNamesFromBody = ((dto.pmNames ?? []) as readonly string[])
    .map((s) => s.trim())
    .filter(Boolean);
  const resolvedPmNames =
    pmNamesFromBody.length > 0
      ? [...new Set(pmNamesFromBody)]
      : dto.pmName?.trim()
        ? [dto.pmName.trim()]
        : [];

  try {
    const properties = buildNotionCreateProjectProperties({
      name: dto.name.trim(),
      phase: dto.phase as ItProjectPhase,
      riskLevel: dto.riskLevel,
      urgencyLevel: dto.urgencyLevel,
      pmNames: resolvedPmNames,
      description: dto.description?.trim(),
    });
    const { id } = await notionApiCreateDatabasePage({
      databaseId: dbId,
      token,
      properties,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const notionMessage = extractNotionErrorMessage(rawMsg);
    console.error("POST Notion project failed:", notionMessage ?? rawMsg);
    return NextResponse.json(
      {
        error:
          notionMessage ??
          "Notion rechazó la creación. Revisa tipo de propiedades (p. ej. Responsable debe ser opción válida si es select).",
      },
      { status: 502 },
    );
  }
}
