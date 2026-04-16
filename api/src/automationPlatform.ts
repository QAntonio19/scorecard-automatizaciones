import type { ProjectRecord } from "./projectTypes.js";

/** Plataforma inferida: Make (campo o tag), n8n en integraciones, o resto como código. */
export type AutomationPlatform = "n8n" | "make" | "codigo_puro";

export function deriveAutomationPlatform(
  p: Pick<ProjectRecord, "platform" | "technologies">,
): AutomationPlatform {
  const plat = p.platform?.trim().toLowerCase() ?? "";
  const tech = p.technologies.map((t) => t.trim().toLowerCase());
  if (plat === "make" || tech.includes("make")) {
    return "make";
  }
  if (plat === "n8n" || tech.some((t) => t.includes("n8n"))) {
    return "n8n";
  }
  return "codigo_puro";
}
