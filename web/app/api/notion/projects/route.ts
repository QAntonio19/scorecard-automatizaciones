import { NextResponse } from "next/server";
import type { ItProject, ItProjectPhase } from "@/lib/itProjectTypes";

export const revalidate = 0;

export async function GET() {
  const token = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_IT_PROJECTS_DB_ID;

  if (!token || !dbId) {
    return NextResponse.json({ error: "Missing Notion API keys" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Notion API Error:", err);
      return NextResponse.json({ error: "Failed to fetch from Notion" }, { status: res.status });
    }

    const data = await res.json();
    
    const projects: ItProject[] = data.results.map((r: unknown) => {
      const row = r as Record<string, unknown>;
      const props = row.properties as Record<string, unknown> | undefined;
      const archivar = props?.archivar as Record<string, unknown> | undefined;
      const isArchived = archivar?.checkbox === true;
      
      const estatusProp = props?.Estatus as Record<string, unknown> | undefined;
      const estatusValue = (estatusProp?.status as Record<string, unknown> | undefined)?.name as string | undefined;

      let phase: ItProjectPhase = "ejecucion";
      if (isArchived || estatusValue === "Archivado") {
        phase = "archivado";
      } else if (estatusValue === "Backlog" || estatusValue === "Sin empezar") {
        phase = "estrategia";
      } else if (estatusValue === "En planificacion") {
        phase = "planificacion";
      } else if (estatusValue === "En proceso") {
        phase = "ejecucion";
      } else if (estatusValue === "Completado") {
        phase = "cierre";
      }

      const nombre = props?.Nombre as Record<string, unknown> | undefined;
      const titleProp = nombre?.title as Array<Record<string, unknown>> | undefined;
      const name = Array.isArray(titleProp) && titleProp.length > 0 && typeof titleProp[0].plain_text === "string"
        ? titleProp[0].plain_text 
        : "Proyecto sin nombre";
      const id = row.id as string;
      const created_time = row.created_time as string | undefined;

      return {
        id,
        code: `PRJ-${id.split("-")[0].toUpperCase()}`,
        name,
        description: "",
        phase,
        sponsor: "Notion Sync",
        pmName: "Equipo IT",
        startDate: created_time || new Date().toISOString(),
        targetEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        riskLevel: "bajo",
        urgencyLevel: "media",
        milestones: []
      } satisfies ItProject;
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching Notion projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
