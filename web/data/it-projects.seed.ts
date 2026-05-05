import type { ItProject } from "@/lib/itProjectTypes";

/**
 * Datos de ejemplo. Sustituir por API cuando exista tabla `it_projects` o similar.
 */
export const IT_PROJECTS_SEED: ItProject[] = [
  {
    id: "itp-crm-2025",
    code: "CRM-2025",
    name: "Renovación CRM corporativo",
    description:
      "Programa para sustituir el CRM legado, alinear datos con ERP y definir gobierno de datos cliente. Incluye varios flujos de integración y reporting.",
    phase: "ejecucion",
    sponsor: "Dirección Comercial",
    pmName: "Edgar",
    startDate: "2025-01-15",
    targetEndDate: "2026-06-30",
    riskLevel: "medio",
    milestones: [
      { id: "m1", title: "Kick-off y alcance firmado", dueDate: "2025-02-01", done: true },
      { id: "m2", title: "Migración datos históricos (pilot)", dueDate: "2025-08-15", done: true },
      { id: "m3", title: "Go-live regional AMER", dueDate: "2026-03-01", done: false },
      { id: "m4", title: "Cierre hypercare", dueDate: "2026-06-15", done: false },
    ],
  },
  {
    id: "itp-data-lake",
    code: "DATA-LAKE",
    name: "Capa analítica unificada",
    description:
      "Diseño del lago de datos, catálogo y políticas de acceso.",
    phase: "planificacion",
    sponsor: "ITAI / Datos",
    pmName: "Evelyn",
    startDate: "2025-09-01",
    targetEndDate: "2027-12-31",
    riskLevel: "alto",
    milestones: [
      { id: "m1", title: "Arquitecto referencia aprobada", dueDate: "2025-12-01", done: false },
      { id: "m2", title: "Primer dominio productivo", dueDate: "2026-06-30", done: false },
    ],
  },
  {
    id: "itp-automatizacion-sdr",
    code: "SDR-AUTO",
    name: "Automatización comercial SDR",
    description:
      "Iniciativa para orquestar captación inbound bajo un mismo objetivo de negocio y KPIs compartidos.",
    phase: "cierre",
    sponsor: "Marketing",
    pmName: "Juan Antonio",
    startDate: "2024-06-01",
    targetEndDate: "2025-12-31",
    riskLevel: "bajo",
    milestones: [
      { id: "m1", title: "Playbooks acordados", dueDate: "2024-09-01", done: true },
      { id: "m2", title: "Revisión beneficios", dueDate: "2025-11-30", done: false },
    ],
  },
];
