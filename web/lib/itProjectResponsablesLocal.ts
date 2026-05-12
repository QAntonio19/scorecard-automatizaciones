/** Lista editable de responsables (multi_select Notion): env por defecto, override en localStorage. */

export const IT_PROJECT_RESPONSABLES_STORAGE_KEY = "scorecard-it-project-responsables-v1";

export const IT_PROJECT_RESPONSABLES_CHANGED_EVENT = "scorecard-it-project-responsables-changed";

const DEFAULT_IT_PROJECT_PM_NAMES = ["Antonio", "Evelyn"] as const;

export function buildItProjectPmOptionsFromEnv(): string[] {
  const raw =
    typeof process.env.NEXT_PUBLIC_IT_PROJECT_PM_OPTIONS === "string"
      ? process.env.NEXT_PUBLIC_IT_PROJECT_PM_OPTIONS
      : "";
  const fromEnv = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (fromEnv.length > 0) {
    return [...new Set(fromEnv)];
  }
  return [...DEFAULT_IT_PROJECT_PM_NAMES];
}

function sanitizeNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return [...new Set(out)];
}

export function normalizeResponsableNameList(names: readonly string[]): string[] {
  const out = names.map((s) => s.trim()).filter((s) => s.length > 0);
  return [...new Set(out)];
}

export function readStoredResponsablesOrNull(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(IT_PROJECT_RESPONSABLES_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    const list = sanitizeNames(parsed);
    return list.length > 0 ? list : null;
  } catch {
    return null;
  }
}

/** Si no hay lista guardada, usa env / valores por defecto (sin escribir en disco). */
export function getEffectiveResponsableNames(): string[] {
  const fromStore = typeof window !== "undefined" ? readStoredResponsablesOrNull() : null;
  if (fromStore) return [...fromStore];
  return [...buildItProjectPmOptionsFromEnv()];
}

export function persistResponsableNames(names: readonly string[]): void {
  if (typeof window === "undefined") return;
  const norm = normalizeResponsableNameList(names);
  if (norm.length === 0) {
    window.localStorage.removeItem(IT_PROJECT_RESPONSABLES_STORAGE_KEY);
  } else {
    window.localStorage.setItem(IT_PROJECT_RESPONSABLES_STORAGE_KEY, JSON.stringify(norm));
  }
  window.dispatchEvent(new CustomEvent(IT_PROJECT_RESPONSABLES_CHANGED_EVENT));
}

export function clearStoredResponsables(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(IT_PROJECT_RESPONSABLES_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(IT_PROJECT_RESPONSABLES_CHANGED_EVENT));
}

/** Orden de opciones conocidas; el resto alfabético después. */
export function sortPmNamesByOptionsOrder(
  pmNames: readonly string[],
  optionOrder: readonly string[],
): string[] {
  const baseLen = optionOrder.length;
  const idx = (n: string) => {
    const i = optionOrder.indexOf(n);
    return i === -1 ? baseLen : i;
  };
  return [...pmNames].sort((a, b) => {
    const d = idx(a) - idx(b);
    if (d !== 0) return d;
    return a.localeCompare(b, "es");
  });
}
