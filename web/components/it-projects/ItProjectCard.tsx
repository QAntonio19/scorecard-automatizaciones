import Link from "next/link";
import type { ItProject } from "@/lib/itProjectTypes";
import {
  itPhaseTopBorderClass,
  phaseLabel,
} from "@/lib/itProjectPortfolio";
import { 
  computeProjectScopeProgress, 
  projectScopeProgressFillClass 
} from "@/lib/itProjectScopeProgress";

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
  return (
    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 13 5 5 5-5M7 6l5 5 5-5"/>
    </svg>
  );
}

function ProjectCardBody({ p, phaseBorderOnCard }: { p: ItProject; phaseBorderOnCard: boolean }) {
  const { completed, total, percent } = computeProjectScopeProgress(p);

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
        <UrgencyIcon urgency={p.urgencyLevel} />
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-slate-600">{p.description}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${projectScopeProgressFillClass(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">
          {completed} de {total} {total === 1 ? "ítem" : "ítems"}
        </span>
        <span className="text-slate-300">·</span>
        <span>
          {formatMonthYear(p.startDate)} → {formatMonthYear(p.targetEndDate)}
        </span>
        {percent > 0 && (
          <>
            <span className="text-slate-300">·</span>
            <span className="font-bold text-slate-900">{percent}%</span>
          </>
        )}
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
    </>
  );
}

type Props = {
  project: ItProject;
  /** En Kanban la columna ya indica la fase; en tabla se muestra acento en la tarjeta. */
  phaseBorderOnCard: boolean;
  /** Vista flotante al arrastrar (misma apariencia, sin navegación) */
  renderMode?: "link" | "dragGhost";
};

export function ItProjectCard({ project: p, phaseBorderOnCard, renderMode = "link" }: Props) {
  const phaseBorder = phaseBorderOnCard ? `${itPhaseTopBorderClass(p.phase)} border-t-4` : "";

  const linkSurface =
    "block cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md hover:ring-1 hover:ring-indigo-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-sm";

  if (renderMode === "dragGhost") {
    return (
      <div
        role="presentation"
        className={`block w-80 max-w-[calc(100vw-1.5rem)] cursor-grabbing rounded-xl border border-slate-200 bg-white p-4 shadow-2xl ring-2 ring-sky-400/40 ${phaseBorder}`}
      >
        <ProjectCardBody p={p} phaseBorderOnCard={phaseBorderOnCard} />
      </div>
    );
  }

  return (
    <Link
      href={`/proyectos/${encodeURIComponent(p.id)}`}
      className={`${linkSurface} ${phaseBorder}`}
    >
      <ProjectCardBody p={p} phaseBorderOnCard={phaseBorderOnCard} />
    </Link>
  );
}
