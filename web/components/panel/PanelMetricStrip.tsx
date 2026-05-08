import type { ItProject } from "@/lib/itProjectTypes";
import { IT_PROJECT_PHASE_ORDER, phaseLabel } from "@/lib/itProjectPortfolio";

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "rose" | "amber" | "sky" | "emerald" | "indigo";
}) {
  const valueColor =
    accent === "rose"
      ? "text-rose-700"
      : accent === "amber"
        ? "text-amber-700"
        : accent === "sky"
          ? "text-sky-700"
          : accent === "emerald"
            ? "text-emerald-700"
            : accent === "indigo"
              ? "text-indigo-700"
              : "text-slate-900";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function milestoneProgress(projects: ItProject[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const p of projects) {
    total += p.milestones.length;
    done += p.milestones.filter((m) => m.done).length;
  }
  return { done, total };
}

export function PanelMetricStrip({ projects }: { projects: ItProject[] }) {
  const total = projects.length;
  const enEjecucion = projects.filter((p) => p.phase === "ejecucion").length;
  const altoRiesgo = projects.filter((p) => p.riskLevel === "alto").length;
  const urgenciaAlta = projects.filter((p) => p.urgencyLevel === "alta").length;
  const { done, total: mTotal } = milestoneProgress(projects);
  const pctHitos = mTotal === 0 ? 0 : Math.round((done / mTotal) * 100);

  // Distribución por fase
  const byPhase = IT_PROJECT_PHASE_ORDER.map((ph) => ({
    phase: ph,
    label: phaseLabel(ph),
    count: projects.filter((p) => p.phase === ph).length,
  })).filter((x) => x.count > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="En cartera" value={total} sub="proyectos registrados" />
        <MetricCard label="En proceso" value={enEjecucion} sub="con entregas activas" accent="sky" />
        <MetricCard label="Alto riesgo" value={altoRiesgo} sub="requieren atención" accent="rose" />
        <MetricCard
          label="Hitos completados"
          value={`${pctHitos}%`}
          sub={`${done} de ${mTotal} hitos`}
          accent="emerald"
        />
      </div>
    </div>
  );
}
