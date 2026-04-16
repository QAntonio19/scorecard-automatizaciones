import { normalizeCategoryQuery } from "@/lib/projectCategories";
import type {
  AutomationPlatform,
  OwnerCode,
  ProjectHealth,
  VistaProyectos,
} from "@/lib/projectTypes";

export type ProyectosSearchState = {
  vista: VistaProyectos;
  owners: OwnerCode[];
  health: ProjectHealth[];
  platforms: AutomationPlatform[];
  category: string;
  q: string;
};

function joinList<T extends string>(values: T[]): string | undefined {
  if (values.length === 0) return undefined;
  return values.join(",");
}

export function buildProyectosQuery(state: ProyectosSearchState): string {
  const p = new URLSearchParams();
  if (state.vista !== "kanban") p.set("vista", state.vista);
  const owners = joinList(state.owners);
  if (owners) p.set("owners", owners);
  const health = joinList(state.health);
  if (health) p.set("health", health);
  const platform = joinList(state.platforms);
  if (platform) p.set("platform", platform);
  if (state.category.trim()) p.set("categoria", state.category.trim());
  if (state.q.trim()) p.set("q", state.q.trim());
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

export function parseProyectosSearchParams(sp: Record<string, string | string[] | undefined>): ProyectosSearchState {
  const vistaRaw = typeof sp.vista === "string" ? sp.vista : undefined;
  const vista: VistaProyectos =
    vistaRaw === "tabla" || vistaRaw === "tarjetas" ? vistaRaw : "kanban";

  const ownersRaw = typeof sp.owners === "string" ? sp.owners : undefined;
  const ownersParsed = (ownersRaw?.split(",").filter(Boolean) ?? []).filter(
    (o): o is OwnerCode => o === "JA" || o === "EV",
  );
  /** Un solo responsable a la vez (si la URL traía JA,EV, se usa el primero). */
  const owners = ownersParsed.length > 0 ? [ownersParsed[0]] : [];

  const healthRaw = typeof sp.health === "string" ? sp.health : undefined;
  const healthParsed = (healthRaw?.split(",").filter(Boolean) ?? []).filter(
    (h): h is ProjectHealth => h === "activo" || h === "pausado" || h === "en_riesgo",
  );
  /** Un solo estatus a la vez. */
  const health = healthParsed.length > 0 ? [healthParsed[0]] : [];

  const platformRaw = typeof sp.platform === "string" ? sp.platform : undefined;
  const platforms = (platformRaw?.split(",").filter(Boolean) ?? []).filter(
    (x): x is AutomationPlatform =>
      x === "n8n" || x === "make" || x === "codigo_puro",
  );

  const categoryRaw = typeof sp.categoria === "string" ? sp.categoria : "";
  const category = normalizeCategoryQuery(categoryRaw);
  const q = typeof sp.q === "string" ? sp.q : "";

  return { vista, owners, health, platforms, category, q };
}

export function toApiProjectsQuery(state: ProyectosSearchState): {
  owners?: string;
  health?: string;
  platform?: string;
  category?: string;
  q?: string;
} {
  return {
    owners: joinList(state.owners),
    health: joinList(state.health),
    platform: joinList(state.platforms),
    category: state.category.trim() || undefined,
    q: state.q.trim() || undefined,
  };
}
