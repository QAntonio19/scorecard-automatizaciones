import type { OwnerCode } from "@/lib/projectTypes";

export function workflowOwnerChipClass(code: OwnerCode): string {
  return code === "JA"
    ? "bg-violet-50 text-violet-800 ring-violet-100"
    : "bg-sky-50 text-sky-800 ring-sky-100";
}
