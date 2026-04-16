import type { ProjectHealth } from "@/lib/projectTypes";

export function HealthDot({ health }: { health: ProjectHealth }) {
  const cls =
    health === "en_riesgo"
      ? "bg-rose-500"
      : health === "pausado"
        ? "bg-amber-400"
        : "bg-emerald-500";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm ${cls}`}
      title={health}
    />
  );
}
