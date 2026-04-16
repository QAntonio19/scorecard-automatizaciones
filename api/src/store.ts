import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AutomationRecord } from "./types.js";

const dataPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "automations.json",
);

function readRecords(): AutomationRecord[] {
  const raw = readFileSync(dataPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid automations data: expected array");
  }
  return parsed as AutomationRecord[];
}

export function listAllAutomations(): AutomationRecord[] {
  return readRecords();
}
