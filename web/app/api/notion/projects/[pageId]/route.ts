import { NextResponse } from "next/server";
import { z } from "zod";
import { extractNotionErrorMessage } from "@/lib/notionCreateProjectPayload";
import type { ItProjectPhase, ItProjectRisk, ItProjectUrgency } from "@/lib/itProjectTypes";
import { buildNotionPatchPropertiesFull } from "@/lib/notionProjectPatchPayload";
import {
  fetchItProjectByNotionPageId,
  isLikelyNotionPageId,
  notionTrashPageBestEffort,
} from "@/lib/notionProjectFromPage";
import {
  NotionRelationSyncError,
  buildNotionRelationsPropertiesPatch,
  fetchNotionProjectPageProperties,
  mirrorProjectTasksToLinkedSprintsBestEffort,
  type NotionRelationsSyncInput,
} from "@/lib/notionProjectRelationsSync";
import { notionApiJsonHeaders } from "@/lib/notionRelations";
import { syncNotionProjectPageBodyFromPlainBestEffort } from "@/lib/notionProjectPageBodySync";
import { resolveProjectPeriodRelations } from "@/lib/notionPeriodSync";

export const revalidate = 0;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ pageId: string }> };

const krLineSchema = z.object({
  id: z.string(),
  text: z.string().max(2000),
});

const taskLinePatchSchema = z.object({
  id: z.string(),
  text: z.string().max(2000),
  sprintId: z
    .union([
      z
        .string()
        .max(120)
        .refine((s) => isLikelyNotionPageId(s.trim()), {
          message: "sprintId debe ser un UUID de página Notion",
        }),
      z.null(),
    ])
    .optional(),
  sprintBoardColumn: z.enum(["pendiente", "en_curso", "hecho"]).optional(),
  assigneeName: z.string().max(500).optional(),
  targetDate: z.string().max(120).optional(),
});

const sprintRowPatchSchema = z.object({
  id: z.string(),
  title: z.string().max(2000),
  timeframe: z.string().max(500).optional(),
});

const deliverableRowPatchSchema = z.object({
  id: z.string(),
  title: z.string().max(2000),
  targetDate: z.string().max(120).optional(),
});

const patchFullBodySchema = z.object({
  name: z.string().min(1).max(2000),
  description: z.string().max(16000).optional(),
  phase: z.enum(["backlog", "sin_empezar", "planificacion", "ejecucion", "cierre", "archivado"]),
  riskLevel: z.enum(["bajo", "medio", "alto"]),
  urgencyLevel: z.enum(["baja", "media", "alta"]).optional(),
  pmNames: z.array(z.string().max(500)).max(32).optional(),
  startDate: z.string().max(120).optional(),
  targetEndDate: z.string().max(120).optional(),
  keyResultLines: z.array(krLineSchema).max(250).optional(),
  taskLines: z.array(taskLinePatchSchema).max(800).optional(),
  sprintRows: z.array(sprintRowPatchSchema).max(160).optional(),
  deliverables: z.array(deliverableRowPatchSchema).max(400).optional(),
});

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

export async function PATCH(request: Request, ctx: RouteCtx) {
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const parsed = patchFullBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validación incorrecta", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const dto = parsed.data;

  try {
    const existing = await fetchItProjectByNotionPageId(pageId, token, dbId);
    if (!existing) {
      return NextResponse.json(
        { error: "No encontrado o la página no pertenece a la base de proyectos configurada." },
        { status: 404 },
      );
    }

    const relationSlice: NotionRelationsSyncInput = {};
    if (dto.keyResultLines !== undefined) relationSlice.keyResultLines = dto.keyResultLines;
    if (dto.taskLines !== undefined) relationSlice.taskLines = dto.taskLines;
    if (dto.sprintRows !== undefined) relationSlice.sprintRows = dto.sprintRows;
    if (dto.deliverables !== undefined) relationSlice.deliverables = dto.deliverables;

    const propertiesCore = buildNotionPatchPropertiesFull({
      name: dto.name.trim(),
      description: dto.description?.trim(),
      phase: dto.phase as ItProjectPhase,
      riskLevel: dto.riskLevel as ItProjectRisk,
      urgencyLevel: (dto.urgencyLevel ?? "media") as ItProjectUrgency,
      pmNames: dto.pmNames,
      startDate: dto.startDate,
      targetEndDate: dto.targetEndDate,
    });

    // 1. Resolver Relaciones de Periodo (Meses/Años) automáticas
    const periodProps: Record<string, any> = {};
    let monthIdForTasks: string | undefined = undefined;
    if (dto.startDate) {
      try {
        const { monthId, yearId } = await resolveProjectPeriodRelations({
          token,
          startDateIso: dto.startDate,
        });
        if (monthId) {
          periodProps["meses"] = { relation: [{ id: monthId }] };
          monthIdForTasks = monthId;
        }
        if (yearId) periodProps["años"] = { relation: [{ id: yearId }] };
      } catch (err) {
        console.error("Error resolviendo periodo (meses/años):", err);
      }
    }

    // Si no cambió la fecha pero el proyecto ya tiene mes, lo recuperamos para las tareas
    if (!monthIdForTasks && existing.monthId) {
      monthIdForTasks = existing.monthId;
    }

    let relationProps: Record<string, unknown> = {};
    if (Object.keys(relationSlice).length > 0) {
      const pageProps = await fetchNotionProjectPageProperties(pageId, token);
      relationProps = await buildNotionRelationsPropertiesPatch({
        token,
        projectPageId: pageId,
        projectProperties: pageProps,
        input: relationSlice,
        monthId: monthIdForTasks,
      });
    }

    const properties = { ...propertiesCore, ...periodProps, ...relationProps };

    const notionRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "PATCH",
      headers: notionApiJsonHeaders(token),
      body: JSON.stringify({ properties }),
    });

    const bodyText = await notionRes.text();
    if (!notionRes.ok) {
      const notionMessage = extractNotionErrorMessage(bodyText);
      console.error("PATCH Notion proyecto:", notionMessage ?? bodyText.slice(0, 2000));
      return NextResponse.json(
        {
          error:
            notionMessage ??
            "No se pudo actualizar el proyecto en Notion (propiedades, tipos de dato u opciones de select/status).",
        },
        { status: 502 },
      );
    }

    if (dto.description !== undefined) {
      await syncNotionProjectPageBodyFromPlainBestEffort(token, pageId, dto.description);
    }

    await mirrorProjectTasksToLinkedSprintsBestEffort({ token, projectPageId: pageId }).catch((err) =>
      console.error("mirror sprint tareas desde proyecto:", err),
    );

    const updated = await fetchItProjectByNotionPageId(pageId, token, dbId);
    return NextResponse.json({ project: updated ?? existing });
  } catch (error) {
    if (error instanceof NotionRelationSyncError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus });
    }
    console.error("PATCH Notion project:", error);
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
