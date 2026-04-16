/**
 * Categorías oficiales del portafolio (filtro en /proyectos).
 * Deben coincidir con las que uses en los datos de proyectos (`category`).
 */
export const PROJECT_CATEGORIES = [
  "Inteligencia Comercial",
  "Desempeño del Equipo",
  "Legal / Automatización Admin",
  "Publicidad / Marketing",
  "Ventas y Marketing",
  "Reportes a Clientes",
  "CRM / Gestión de Leads",
  "IA / Creativos",
] as const;

export type ProjectCategoryOption = (typeof PROJECT_CATEGORIES)[number];

export function normalizeCategoryQuery(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  const t = raw.trim();
  return (PROJECT_CATEGORIES as readonly string[]).includes(t) ? t : "";
}
