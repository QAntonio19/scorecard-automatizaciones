import {
  notionRichTextFromPlain,
  notionRiskToSelectName,
  notionUrgencyToSelectName,
} from "@/lib/notionCreateProjectPayload";
import { mapPhaseToNotionEstatus } from "@/lib/notionEstatusPhase";
import type { ItProjectPhase, ItProjectRisk, ItProjectUrgency } from "@/lib/itProjectTypes";

export interface NotionProjectFullPatchDto {
  name: string;
  description?: string;
  phase: ItProjectPhase;
  riskLevel: ItProjectRisk;
  urgencyLevel: ItProjectUrgency;
  pmNames?: readonly string[];
  startDate?: string;
  targetEndDate?: string;
}

/**
 * Payload `properties` para Notion PATCH (página de base ITAI proyectos).
 * Incluye Estatus + casilla archivar cuando aplica la fase.
 *
 * La descripción del proyecto sólo se envía a Notion si defines `NOTION_PROP_PROJECT_DESCRIPTION`
 * con el nombre **exacto** de la columna rich_text en tu base (si no existe, Notion devuelve error).
 * Sin esa variable, la descripción sigue mostrándose en la app gracias a la fusión en caché tras guardar.
 */
export function buildNotionPatchPropertiesFull(dto: NotionProjectFullPatchDto): Record<string, unknown> {
  const titlePropName = process.env.NOTION_PROP_PROJECT_TITLE?.trim() || "Nombre";
  const riskProp = process.env.NOTION_PROP_PROJECT_RISK?.trim() || "Nivel de riesgo";
  const urgProp = process.env.NOTION_PROP_PROJECT_URGENCY?.trim() || "Nivel de Urgencia";
  const statusProp = process.env.NOTION_PROP_PROJECT_STATUS?.trim() || "Estatus";
  const responsableProp = process.env.NOTION_PROP_RESPONSABLE?.trim() || "Responsable";
  const archivarProp = process.env.NOTION_PROP_PROJECT_ARCHIVED?.trim() || "archivar";
  const descriptionPropName = process.env.NOTION_PROP_PROJECT_DESCRIPTION?.trim();
  const descTrim = dto.description?.trim();

  const resolvedPm = (dto.pmNames ?? []).map((s) => s.trim()).filter((s) => s && s !== "—");

  const props: Record<string, unknown> = {
    [titlePropName]: {
      title: [{ type: "text", text: { content: dto.name.slice(0, 2000) } }],
    },
    [riskProp]: {
      status: { name: notionRiskToSelectName(dto.riskLevel) },
    },
    [urgProp]: {
      status: { name: notionUrgencyToSelectName(dto.urgencyLevel ?? "media") },
    },
    [statusProp]: {
      status: { name: mapPhaseToNotionEstatus(dto.phase) },
    },
    [archivarProp]: {
      checkbox: dto.phase === "archivado",
    },
  };

  if (descriptionPropName) {
    props[descriptionPropName] = descTrim
      ? { rich_text: notionRichTextFromPlain(descTrim.slice(0, 16_000)) }
      : { rich_text: [] };
  }

  if (resolvedPm.length > 0) {
    props[responsableProp] = {
      multi_select: resolvedPm.map((n) => ({ name: n.slice(0, 500) })),
    };
  } else {
    props[responsableProp] = {
      multi_select: [],
    };
  }

  // Nota: INICIO, FIN OBJETIVO, meses y años son relaciones o no existen en el esquema detectado.
  // Para evitar errores de validación (400), dejamos de enviarlos por ahora.
  // Si el usuario crea las columnas de tipo Fecha/Select con estos nombres, 
  // se podrían reactivar aquí.

  return props;
}
