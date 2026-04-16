import type { OwnerCode } from "./projectTypes.js";

/** Nombres canónicos alineados con `projects.json` y filtros de la app. */
export const OWNER_PROFILE: Record<OwnerCode, { ownerName: string }> = {
  JA: { ownerName: "Juan Antonio" },
  EV: { ownerName: "Evelyn" },
};
