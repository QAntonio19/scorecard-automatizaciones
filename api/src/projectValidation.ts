import { z } from "zod";
import type { AutomationPlatform } from "./automationPlatform.js";
import type { OwnerCode, ProjectHealth } from "./projectTypes.js";

const ownerCodeSchema = z.enum(["JA", "EV"]);
const healthSchema = z.enum(["activo", "pausado", "en_riesgo"]);
const automationPlatformSchema = z.enum(["n8n", "make", "codigo_puro"]);

function splitCsv(value: string | undefined): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const listProjectsQuerySchema = z.object({
  owners: z.string().optional(),
  health: z.string().optional(),
  platform: z.string().optional(),
  category: z.string().optional(),
  q: z.string().trim().optional(),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export function parseOwnersFilter(raw: string | undefined): OwnerCode[] | null {
  const parts = splitCsv(raw);
  if (parts.length === 0) return null;
  const codes: OwnerCode[] = [];
  for (const p of parts) {
    const r = ownerCodeSchema.safeParse(p);
    if (!r.success) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: `Responsable inválido: ${p}`,
          path: ["owners"],
        },
      ]);
    }
    codes.push(r.data);
  }
  return codes;
}

export function parseHealthFilter(raw: string | undefined): ProjectHealth[] | null {
  const parts = splitCsv(raw);
  if (parts.length === 0) return null;
  const out: ProjectHealth[] = [];
  for (const p of parts) {
    const r = healthSchema.safeParse(p);
    if (!r.success) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: `Estatus inválido: ${p}`,
          path: ["health"],
        },
      ]);
    }
    out.push(r.data);
  }
  return out;
}

export function parsePlatformFilter(raw: string | undefined): AutomationPlatform[] | null {
  const parts = splitCsv(raw);
  if (parts.length === 0) return null;
  const out: AutomationPlatform[] = [];
  for (const p of parts) {
    const r = automationPlatformSchema.safeParse(p);
    if (!r.success) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: `Plataforma inválida: ${p}`,
          path: ["platform"],
        },
      ]);
    }
    out.push(r.data);
  }
  return out;
}

export const patchProjectOwnerBodySchema = z.object({
  ownerCode: ownerCodeSchema,
});

export type PatchProjectOwnerBody = z.infer<typeof patchProjectOwnerBodySchema>;

const projectPhaseSchema = z.enum([
  "backlog",
  "por_iniciar",
  "en_proceso",
  "terminados",
  "archivado",
]);

export const patchProjectPhaseBodySchema = z.object({
  phase: projectPhaseSchema,
});

export type PatchProjectPhaseBody = z.infer<typeof patchProjectPhaseBodySchema>;

/** Campos editables vía PATCH /api/projects/:id (además de fase y responsable). */
export const patchProjectDetailsBodySchema = z
  .object({
    name: z.string().min(1).max(500).optional(),
    description: z.string().max(20000).optional(),
    category: z.string().max(500).optional(),
    complexity: z.number().int().min(1).max(10).optional(),
    businessValue: z.number().int().min(1).max(10).optional(),
    steps: z.number().int().min(0).max(500_000).optional(),
    progress: z.number().min(0).max(100).optional(),
    schedule: z.string().max(1000).optional(),
    failureRate: z.number().min(0).max(100).nullable().optional(),
    riskNote: z.string().max(5000).nullable().optional(),
    health: healthSchema.optional(),
    healthLabel: z.string().max(80).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Envía al menos un campo para actualizar.",
  });

export type PatchProjectDetailsBody = z.infer<typeof patchProjectDetailsBodySchema>;
