import Link from "next/link";
import type { ItProject, ItProjectRisk } from "@/lib/itProjectTypes";
import {
  itPhaseTopBorderClass,
  phaseLabel,
  riskLabel,
} from "@/lib/itProjectPortfolio";

function ItRiskDot({ risk }: { risk: ItProjectRisk }) {
  const cls =
    risk === "alto"
      ? "bg-rose-500"
      : risk === "medio"
        ? "bg-amber-400"
        : "bg-emerald-500";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white shadow-sm ${cls}`}
      title={riskLabel(risk)}
    />
  );
}

function milestoneProgressPct(p: ItProject): number {
  const n = p.milestones.length;
  if (n === 0) return 0;
  const done = p.milestones.filter((m) => m.done).length;
  return (done / n) * 100;
}

function progressBarClass(risk: ItProjectRisk): string {
  if (risk === "alto") return "bg-rose-400";
  if (risk === "medio") return "bg-amber-300";
  return "bg-sky-500";
}

type Props = {
  project: ItProject;
  /** En Kanban la columna ya indica la fase; en tabla se muestra acento en la tarjeta. */
  phaseBorderOnCard: boolean;
};

export function ItProjectCard({ project: p, phaseBorderOnCard }: Props) {
  const pct = milestoneProgressPct(p);
  const phaseBorder = phaseBorderOnCard ? `${itPhaseTopBorderClass(p.phase)} border-t-4` : "";

  return (
    <Link
      href={`/proyectos/${p.id}`}
      className={`block cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-sm ${phaseBorder}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
        <ItRiskDot risk={p.riskLevel} />
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-slate-600">{p.description}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${progressBarClass(p.riskLevel)}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-600">
          {p.milestones.length} {p.milestones.length === 1 ? "paso" : "pasos"}
        </span>
        <span className="text-slate-300">·</span>
        <span>
          {p.startDate} → {p.targetEndDate}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {phaseBorderOnCard ? (
          <>
            <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
              {phaseLabel(p.phase)}
            </span>
            <span className="text-[11px] text-slate-600">{riskLabel(p.riskLevel)}</span>
          </>
        ) : (
          <span className="text-[11px] text-slate-600">{riskLabel(p.riskLevel)}</span>
        )}
        <span className="text-slate-300">·</span>
        <span className="truncate text-[11px] text-slate-600">{p.sponsor}</span>
        <span className="text-slate-300">·</span>
        <span className="text-[11px] text-slate-600">Tasa fallo: —</span>
        <span className="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset text-sky-800 ring-sky-200 bg-sky-50">
          Ver →
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex max-w-[min(100%,12rem)] items-center truncate rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200">
          {p.pmName}
        </span>
        <span className="shrink-0 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
          {p.code}
        </span>
      </div>
    </Link>
  );
}
