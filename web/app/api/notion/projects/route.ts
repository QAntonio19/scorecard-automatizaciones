import { NextResponse } from "next/server";
import type { ItProject } from "@/lib/itProjectTypes";
import { mapNotionEstatusToPhase } from "@/lib/notionEstatusPhase";
import {
  notionQueryAllDatabaseRows,
  notionRelationPropertyCandidates,
  relationIdsFromCandidates,
  resolveNotionRelatedPageTitles,
} from "@/lib/notionRelations";
import { resolveItProjectPmName } from "@/lib/notionProjectResponsable";

/** Cache Notion response for 0s — avoids hammering Notion API but ensures fresh data for debug. */
export const revalidate = 0;

type RowExtract = {
  base: Omit<ItProject, "keyResults" | "plannedTasks" | "sprints" | "deliverables">;
  keyResultIds: string[];
  taskIds: string[];
  sprintIds: string[];
  deliverableIds: string[];
};

export async function GET() {
  const token = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_IT_PROJECTS_DB_ID;

  if (!token || !dbId) {
    return NextResponse.json({ error: "Missing Notion API keys" }, { status: 500 });
  }

  try {
    const results = await notionQueryAllDatabaseRows(dbId, token);

    const krPropNames = notionRelationPropertyCandidates("keyResults");
    const taskPropNames = notionRelationPropertyCandidates("tasks");
    const sprintPropNames = notionRelationPropertyCandidates("sprints");
    const deliverablePropNames = notionRelationPropertyCandidates("deliverables");

    const extracted: RowExtract[] = results.map((r: unknown) => {
      const row = r as Record<string, unknown>;
      const props = row.properties as Record<string, unknown> | undefined;

      const archivar = props?.archivar as Record<string, unknown> | undefined;
      const isArchived = archivar?.checkbox === true;

      const estatusProp = props?.Estatus as Record<string, unknown> | undefined;
      const estatusValue = (estatusProp?.status as Record<string, unknown> | undefined)?.name as
        | string
        | undefined;

      const phase = mapNotionEstatusToPhase(estatusValue, isArchived);

      const nombre = props?.Nombre as Record<string, unknown> | undefined;
      const titleProp = nombre?.title as Array<Record<string, unknown>> | undefined;
      const name =
        Array.isArray(titleProp) && titleProp.length > 0 && typeof titleProp[0].plain_text === "string"
          ? titleProp[0].plain_text
          : "Proyecto sin nombre";
      const id = row.id as string;
      const created_time = row.created_time as string | undefined;
      const pmName = resolveItProjectPmName(props, name);

      // Extracción ultra-robusta de valores de Notion
      const getVal = (p: unknown) => {
        if (!p || typeof p !== "object") return undefined;
        const obj = p as Record<string, unknown>;
        
        // select
        const sel = obj.select as { name: string } | undefined;
        if (sel?.name) return sel.name;
        
        // status
        const st = obj.status as { name: string } | undefined;
        if (st?.name) return st.name;
        
        // multi_select
        const ms = obj.multi_select as Array<{ name: string }> | undefined;
        if (ms?.[0]?.name) return ms[0].name;
        
        // formula
        const f = obj.formula as { string?: string; number?: number } | undefined;
        if (f) return f.string || f.number?.toString();
        
        // rich_text
        const rt = obj.rich_text as Array<{ plain_text: string }> | undefined;
        if (rt?.[0]?.plain_text) return rt[0].plain_text;
        
        // rollup
        if (obj.rollup) {
          const r = obj.rollup as {
            type: string;
            array?: Array<{
              select?: { name: string };
              status?: { name: string };
              multi_select?: Array<{ name: string }>;
              rich_text?: Array<{ plain_text: string }>;
              title?: Array<{ plain_text: string }>;
            }>;
            string?: string;
            number?: number;
          };
          if (r.type === "array" && r.array?.[0]) {
            const first = r.array[0];
            return (
              first.select?.name ||
              first.status?.name ||
              first.multi_select?.[0]?.name ||
              first.rich_text?.[0]?.plain_text ||
              first.title?.[0]?.plain_text
            );
          }
          return r.string || r.number?.toString();
        }
        return undefined;
      };

      // Nivel de riesgo
      const riskProp = props?.["Nivel de riesgo"] || props?.["Nivel de Riesgo"];
      const riskName = getVal(riskProp);
      const riskLevel: ItProject["riskLevel"] =
        riskName === "Alta" ? "alto" :
        riskName === "Media" ? "medio" : "bajo";

      // Nivel de Urgencia
      const urgencyProp = props?.["Nivel de Urgencia"] || props?.["Urgencia"];
      const urgencyName = getVal(urgencyProp);
      const urgencyLevel: ItProject["urgencyLevel"] =
        urgencyName === "Alta" ? "alta" :
        urgencyName === "Baja" ? "baja" : "media";

      console.log(`DEBUG_NOTION_VALS: [${name}] -> RiskName: "${riskName}", UrgencyName: "${urgencyName}"`);

      const keyResultIds = relationIdsFromCandidates(props, krPropNames);
      const taskIds = relationIdsFromCandidates(props, taskPropNames);
      const sprintIds = relationIdsFromCandidates(props, sprintPropNames);
      const deliverableIds = relationIdsFromCandidates(props, deliverablePropNames);

      return {
        base: {
          id,
          code: `PRJ-${id.split("-")[0].toUpperCase()}`,
          name,
          description: "",
          phase,
          sponsor: "Notion Sync",
          pmName,
          startDate: created_time || new Date().toISOString(),
          targetEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
          riskLevel,
          urgencyLevel,
          milestones: [],
        },
        keyResultIds,
        taskIds,
        sprintIds,
        deliverableIds,
      };
    });

    const relatedIdSet = new Set<string>();
    for (const ex of extracted) {
      for (const kid of ex.keyResultIds) relatedIdSet.add(kid);
      for (const tid of ex.taskIds) relatedIdSet.add(tid);
      for (const sid of ex.sprintIds) relatedIdSet.add(sid);
      for (const did of ex.deliverableIds) relatedIdSet.add(did);
    }

    const titleById = await resolveNotionRelatedPageTitles([...relatedIdSet], token);

    const projects: ItProject[] = extracted.map((ex) => ({
      ...ex.base,
      keyResults: ex.keyResultIds.map((pageId) => ({
        id: pageId,
        title: titleById.get(pageId) ?? "Sin título",
      })),
      plannedTasks: ex.taskIds.map((pageId) => ({
        id: pageId,
        title: titleById.get(pageId) ?? "Sin título",
      })),
      sprints: ex.sprintIds.map((pageId) => ({
        id: pageId,
        title: titleById.get(pageId) ?? "Sin título",
      })),
      deliverables: ex.deliverableIds.map((pageId) => ({
        id: pageId,
        title: titleById.get(pageId) ?? "Sin título",
      })),
    }));

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching Notion projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
