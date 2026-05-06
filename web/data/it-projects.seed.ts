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
    keyResults: [
      { id: "kr-s1", title: "KR: Adopción activa del nuevo CRM en cuentas piloto AMER" },
      { id: "kr-s2", title: "KR: Calidad de datos cliente > 95% en campos maestros acordados" },
    ],
    plannedTasks: [
      { id: "t1", title: "Mapear integraciones ERP ↔ CRM y dependencias batch" },
      { id: "t2", title: "Curación y calidad de datos maestros (clientes)" },
      { id: "t3", title: "Pruebas de regresión y UAT regional" },
    ],
    sprints: [
      { id: "s1", title: "Sprint Integración MVP", timeframe: "2026-02-03 — 2026-02-14" },
      { id: "s2", title: "Sprint AMER rollout", timeframe: "2026-02-17 — 2026-03-07" },
    ],
    deliverables: [
      { id: "d1", title: "Contrato técnico de integraciones (AS-IS / TO-BE)", targetDate: "2025-12-01" },
      { id: "d2", title: "Playbook de soporte nivel 2", targetDate: "2026-02-01" },
      { id: "d3", title: "Documentación de recuperación ante desastres (DR) AMER", targetDate: "2026-06-01" },
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
    keyResults: [{ id: "kr-d1", title: "KR: Catálogo con ≥ 80% de datasets críticos descritos y con owner" }],
    plannedTasks: [
      { id: "t1", title: "Catalogar datasets críticos y owners" },
      { id: "t2", title: "Políticas de acceso por dominio + auditoría (RLS blueprint)" },
    ],
    sprints: [{ id: "s1", title: "Discovery y diseño físico inicial", timeframe: "2026-01 → 2026-03" }],
    deliverables: [
      { id: "d1", title: "Documento de arquitectura de referencia", targetDate: "2025-11-30" },
      { id: "d2", title: "Catálogo v1 publicado para negocio", targetDate: "2026-04-01" },
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
    keyResults: [
      { id: "kr-sdr1", title: "KR: Reducción del tiempo de respuesta a leads inbound calificados" },
    ],
    plannedTasks: [
      { id: "t1", title: "Cierre de KPIs baseline pre vs post automatización" },
      { id: "t2", title: "Handover formal a Operations" },
    ],
    sprints: [],
    deliverables: [
      { id: "d1", title: "Informe de resultado y lecciones aprendidas", targetDate: "2025-12-15" },
    ],
  },
];
