/**
 * Responsables por nombre de proyecto (Notion — columna Nombre).
 * Sirve de respaldo si la API no devuelve la propiedad o viene vacía.
 */
export const NOTION_IT_PROJECT_PM_FALLBACK: Readonly<Record<string, string>> = {
  "Base de datos: equipo creativo": "Evelyn",
  REQUERIMIENTOS: "Evelyn",
  "Equipo Creativo": "Evelyn",
  "SDR Ai: C inmuebles": "Antonio",
  "Calculadora de viabilidad": "Antonio",
  "Fullstack Ai - Inmoleads": "Antonio",
  "CLARA 6.0": "Antonio",
  "Mapeo de procesos críticos o repetitivos": "Antonio, Evelyn",
  "App para revisar creditos infonavit": "Evelyn",
  "Proyecto - Gobernanza de datos": "Evelyn",
  "Analisis - Todas las tareas del equipo": "Antonio, Evelyn",
  "Automatizacion - Reportes de BDC": "Evelyn",
  "Soporte tecnico para Bot N8N Kommo (Agente IA)": "Antonio",
  "ADS - Reportes Automatizados": "Evelyn",
  "WEB APP: ExpertizDigital": "Antonio",
  "Mejoras: Inmoleads web": "Antonio",
  "SDR Ai: RM Inmobiliaria": "Antonio",
  "ExpertizDigital Website": "Antonio",
};

const DEFAULT_PM = "Equipo IT";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function joinUnique(names: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const t = n.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.join(", ");
}

/**
 * Extrae texto legible de la propiedad Notion "Responsable"
 * (people, multi_select, select o rich_text).
 */
export function extractResponsableFromNotionProps(
  props: Record<string, unknown> | undefined
): string | undefined {
  if (!props) return undefined;
  const raw = props.Responsable ?? props.responsable;
  if (!isRecord(raw)) return undefined;

  const type = raw.type;

  if (type === "people" && Array.isArray(raw.people)) {
    const names: string[] = [];
    for (const p of raw.people) {
      if (isRecord(p) && typeof p.name === "string" && p.name.trim()) {
        names.push(p.name.trim());
      }
    }
    const s = joinUnique(names);
    return s || undefined;
  }

  if (type === "multi_select" && Array.isArray(raw.multi_select)) {
    const names: string[] = [];
    for (const o of raw.multi_select) {
      if (isRecord(o) && typeof o.name === "string" && o.name.trim()) {
        names.push(o.name.trim());
      }
    }
    const s = joinUnique(names);
    return s || undefined;
  }

  if (type === "select" && isRecord(raw.select) && typeof raw.select.name === "string") {
    const n = raw.select.name.trim();
    return n || undefined;
  }

  if (type === "rich_text" && Array.isArray(raw.rich_text)) {
    const parts: string[] = [];
    for (const chunk of raw.rich_text) {
      if (isRecord(chunk) && typeof chunk.plain_text === "string" && chunk.plain_text.trim()) {
        parts.push(chunk.plain_text.trim());
      }
    }
    const s = parts.join(" ").trim();
    return s || undefined;
  }

  return undefined;
}

export function resolveItProjectPmName(
  props: Record<string, unknown> | undefined,
  projectName: string
): string {
  const fromApi = extractResponsableFromNotionProps(props)?.trim();
  if (fromApi) return fromApi;

  const trimmed = projectName.trim();
  const fallback = NOTION_IT_PROJECT_PM_FALLBACK[trimmed];
  if (fallback) return fallback;

  return DEFAULT_PM;
}
