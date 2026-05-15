import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildNotionCreateProjectProperties,
  extractNotionErrorMessage,
  notionApiCreateDatabasePage,
} from "@/lib/notionCreateProjectPayload";
import {
  NotionRelationSyncError,
  buildNotionRelationsPropertiesPatch,
  fetchNotionProjectPageProperties,
  mirrorProjectTasksToLinkedSprintsBestEffort,
  type NotionRelationsSyncInput,
} from "@/lib/notionProjectRelationsSync";
import { notionRowsToItProjects } from "@/lib/notionProjectFromPage";
import type { ItProjectPhase } from "@/lib/itProjectTypes";
import { notionApiJsonHeaders, notionQueryAllDatabaseRows } from "@/lib/notionRelations";
import { syncNotionProjectPageBodyFromPlainBestEffort } from "@/lib/notionProjectPageBodySync";
import { resolveProjectPeriodRelations } from "@/lib/notionPeriodSync";

/** Cache Notion response for 0s — avoids hammering Notion API but ensures fresh data for debug. */
export const revalidate = 0;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mismas filas que en PATCH; `sprintId` puede ser UUID Notion o id local del formulario hasta remapeo en servidor. */
const createKrLineSchema = z.object({
  id: z.string(),
  text: z.string().max(2000),
});

const createTaskLineSchema = z.object({
  id: z.string(),
  text: z.string().max(2000),
  sprintId: z
    .union([z.string().max(120), z.null()])
    .optional(),
  sprintBoardColumn: z.enum(["pendiente", "en_curso", "hecho"]).optional(),
});

const createSprintRowSchema = z.object({
  id: z.string(),
  title: z.string().max(2000),
  timeframe: z.string().max(500).optional(),
});

const createBodySchema = z.object({
  name: z.string().min(1).max(2000),
  description: z.string().max(16000).optional(),
  phase: z.enum(["backlog", "sin_empezar", "planificacion", "ejecucion", "cierre", "archivado"]),
  riskLevel: z.enum(["bajo", "medio", "alto"]),
  urgencyLevel: z.enum(["baja", "media", "alta"]).optional(),
  startDate: z.string().max(120).optional(),
  targetEndDate: z.string().max(120).optional(),
  /** Un responsable (API antigua). */
  pmName: z.string().max(500).optional(),
  /** Varios responsables (multi_select en Notion). */
  pmNames: z.array(z.string().max(500)).max(32).optional(),
  keyResultLines: z.array(createKrLineSchema).max(250).optional(),
  taskLines: z.array(createTaskLineSchema).max(800).optional(),
  sprintRows: z.array(createSprintRowSchema).max(160).optional(),
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
    const propertiesCore = buildNotionCreateProjectProperties({
      name: dto.name.trim(),
      phase: dto.phase as ItProjectPhase,
      riskLevel: dto.riskLevel,
      urgencyLevel: dto.urgencyLevel,
      pmNames: resolvedPmNames,
      description: dto.description?.trim(),
      startDate: dto.startDate,
      targetEndDate: dto.targetEndDate,
    });

    // 1. Resolver Periodo Automático (Meses/Años)
    const periodProps: Record<string, any> = {};
    if (dto.startDate) {
      try {
        const { monthId, yearId } = await resolveProjectPeriodRelations({
          token,
          startDateIso: dto.startDate,
        });
        if (monthId) periodProps["meses"] = { relation: [{ id: monthId }] };
        if (yearId) periodProps["años"] = { relation: [{ id: yearId }] };
      } catch (err) {
        console.error("Error resolviendo periodo al crear:", err);
      }
    }

    const properties = { ...propertiesCore, ...periodProps };
    const { id } = await notionApiCreateDatabasePage({
      databaseId: dbId,
      token,
      properties,
    });
    if (dto.description !== undefined) {
      await syncNotionProjectPageBodyFromPlainBestEffort(token, id, dto.description);
    }

    const relationSlice: NotionRelationsSyncInput = {};
    if (dto.keyResultLines !== undefined) relationSlice.keyResultLines = dto.keyResultLines;
    if (dto.taskLines !== undefined) relationSlice.taskLines = dto.taskLines;
    if (dto.sprintRows !== undefined) relationSlice.sprintRows = dto.sprintRows;

    if (
      Object.keys(relationSlice).length > 0 &&
      (relationSlice.keyResultLines?.length ||
        relationSlice.sprintRows?.length ||
        relationSlice.taskLines?.length)
    ) {
      const pageProps = await fetchNotionProjectPageProperties(id, token);
      const relationProps = await buildNotionRelationsPropertiesPatch({
        token,
        projectPageId: id,
        projectProperties: pageProps,
        input: relationSlice,
      });
      const relRes = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: notionApiJsonHeaders(token),
        body: JSON.stringify({ properties: relationProps }),
      });
      const relTxt = await relRes.text();
      if (!relRes.ok) {
        const notionMessage = extractNotionErrorMessage(relTxt);
        console.error("POST Notion project (relaciones KR/sprints/tareas):", notionMessage ?? relTxt.slice(0, 2000));
        return NextResponse.json(
          {
            error:
              notionMessage ??
              "El proyecto se creó en Notion pero no se pudieron enlazar KR, sprints o tareas (revisa bases y propiedades relación).",
            id,
            partial: true,
          },
          { status: 502 },
        );
      }

      await mirrorProjectTasksToLinkedSprintsBestEffort({ token, projectPageId: id }).catch((e) =>
        console.error("mirror sprint tareas desde proyecto (POST create):", e),
      );
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof NotionRelationSyncError) {
      return NextResponse.json({ error: err.message }, { status: err.httpStatus });
    }
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
