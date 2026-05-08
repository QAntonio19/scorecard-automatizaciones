import Link from "next/link";
import type { ItProject, ItProjectRisk } from "@/lib/itProjectTypes";
import {
  itPhaseTopBorderClass,
  phaseLabel,
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

function UrgencyIcon({ urgency }: { urgency: ItProject["urgencyLevel"] }) {
  if (urgency === "alta") {
    return (
      <svg className="h-5 w-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m17 11-5-5-5 5M17 18l-5-5-5 5"/>
      </svg>
    );
  }
  if (urgency === "media") {
    return (
      <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m13 17 5-5-5-5M6 17l5-5-5-5"/>
      </svg>
    );
  }
  // baja or fallback
  return (
    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 13 5 5 5-5M7 6l5 5 5-5"/>
    </svg>
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
        <UrgencyIcon urgency={p.urgencyLevel} />
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

      {phaseBorderOnCard && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
            {phaseLabel(p.phase)}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <span className="inline-flex max-w-[min(100%,12rem)] items-center truncate rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-800 ring-1 ring-slate-200">
          {p.pmName}
        </span>
      </div>
    </Link>
  );
}
