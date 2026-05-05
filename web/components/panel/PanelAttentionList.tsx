import Link from "next/link";
import type { ItProject } from "@/lib/itProjectTypes";
import { phaseLabel, riskLabel, urgencyLabel } from "@/lib/itProjectPortfolio";

function RiskBadge({ risk }: { risk: ItProject["riskLevel"] }) {
  const cls =
    risk === "alto"
      ? "bg-rose-100 text-rose-800 ring-rose-200"
      : risk === "medio"
        ? "bg-amber-100 text-amber-700 ring-amber-200"
        : "bg-emerald-100 text-emerald-800 ring-emerald-200";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${cls}`}>
      {riskLabel(risk)}
    </span>
  );
}

function milestoneProgressPct(p: ItProject): number {
  if (p.milestones.length === 0) return 0;
  return Math.round((p.milestones.filter((m) => m.done).length / p.milestones.length) * 100);
}

export function PanelAttentionList({ projects }: { projects: ItProject[] }) {
  // Proyectos que requieren atención: alto riesgo O urgencia alta, excluyendo archivados
  const attention = projects
    .filter((p) => p.phase !== "archivado" && (p.riskLevel === "alto" || p.urgencyLevel === "alta"))
    .sort((a, b) => {
      const riskOrder = { alto: 0, medio: 1, bajo: 2 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">
          Atención requerida{" "}
          <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
            {attention.length}
          </span>
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">Proyectos con riesgo alto o urgencia alta</p>
      </header>

      {attention.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">
          Sin proyectos que requieran atención inmediata. ✅
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {attention.map((p) => {
            const pct = milestoneProgressPct(p);
            return (
              <li key={p.id}>
                <Link
                  href={`/proyectos/${p.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">{p.name}</span>
                      <RiskBadge risk={p.riskLevel} />
                      {p.urgencyLevel === "alta" && (
                        <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200">
                          Urgencia: {urgencyLabel(p.urgencyLevel)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{p.code}</span>
                      <span className="text-slate-300">·</span>
                      <span>{phaseLabel(p.phase)}</span>
                      <span className="text-slate-300">·</span>
                      <span>PM: {p.pmName}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${p.riskLevel === "alto" ? "bg-rose-400" : "bg-amber-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-slate-400">{pct}%</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-slate-400 text-sm">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
