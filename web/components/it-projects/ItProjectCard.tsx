import Link from "next/link";
import type { ItProject, ItProjectRisk } from "@/lib/itProjectTypes";
import {
  itPhaseTopBorderClass,
  phaseLabel,
  riskLabel,
  urgencyLabel,
  urgencyBadgeClass,
} from "@/lib/itProjectPortfolio";

const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

function formatMonthYear(dateStr: string | undefined): string {
  if (!dateStr || dateStr === "—") return "—";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length >= 2) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    if (month >= 1 && month <= 12) {
      return `${MONTHS[month - 1]} ${year}`;
    }
  }
  return dateStr;
}

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
          {formatMonthYear(p.startDate)} → {formatMonthYear(p.targetEndDate)}
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
        {p.urgencyLevel ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${urgencyBadgeClass(p.urgencyLevel)}`}>
            {urgencyLabel(p.urgencyLevel)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <span className="inline-flex max-w-[min(100%,12rem)] items-center truncate rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200">
          {p.pmName}
        </span>
      </div>
    </Link>
  );
}
