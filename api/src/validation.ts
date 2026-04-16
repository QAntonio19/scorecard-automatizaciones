import { z } from "zod";

const automationStatusSchema = z.enum([
  "activa",
  "pausada",
  "error",
  "borrador",
]);

export const listAutomationsQuerySchema = z.object({
  status: automationStatusSchema.optional(),
  q: z.string().trim().min(1).optional(),
});

export type ListAutomationsQuery = z.infer<typeof listAutomationsQuerySchema>;
