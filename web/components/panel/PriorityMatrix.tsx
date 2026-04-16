import type { PortfolioSummaryResponse } from "@/lib/projectTypes";
import { PriorityMatrixPlot } from "@/components/panel/PriorityMatrixPlot";

function MatrixTitleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="5" y="4" width="4" height="16" rx="1" fill="#0ea5e9" />
      <rect x="10" y="6" width="4" height="14" rx="1" fill="#e879f9" />
      <rect x="15" y="8" width="4" height="12" rx="1" fill="#94a3b8" />
    </svg>
  );
}

export function PriorityMatrix({ summary }: { summary: PortfolioSummaryResponse }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <MatrixTitleIcon className="h-7 w-7 shrink-0" />
        <h2 className="text-lg font-bold text-slate-900">Matriz de Prioridad</h2>
      </div>

      <div className="mt-6 flex gap-1 sm:gap-2">
        {/* Eje Y: COMPLEJIDAD */}
        <div className="flex w-9 shrink-0 items-center justify-center sm:w-10">
          <span className="origin-center rotate-[-90deg] whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500">
            COMPLEJIDAD —
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative rounded-xl border border-slate-200">
            {/* Cuadrantes 2×2: TL=estratégicos, TR=reconsiderar, BL=victorias, BR=complementarios */}
            <div className="relative min-h-[300px] sm:min-h-[340px]">
              <div className="grid min-h-[300px] grid-cols-2 grid-rows-2 sm:min-h-[340px]">
                <div className="flex items-center justify-center rounded-tl-xl border-b border-r border-slate-200/80 bg-green-50/50 p-3">
                  <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-emerald-900/35 sm:text-[11px]">
                    ESTRATÉGICOS
                  </span>
                </div>
                <div className="flex items-center justify-center rounded-tr-xl border-b border-slate-200/80 bg-red-50/50 p-3">
                  <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-red-900/35 sm:text-[11px]">
                    RECONSIDERAR
                  </span>
                </div>
                <div className="flex items-center justify-center rounded-bl-xl border-r border-slate-200/80 bg-blue-50/50 p-3">
                  <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-blue-900/35 sm:text-[11px]">
                    VICTORIAS RÁPIDAS
                  </span>
                </div>
                <div className="flex items-center justify-center rounded-br-xl bg-slate-50/30 p-3">
                  <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500 sm:text-[11px]">
                    COMPLEMENTARIOS
                  </span>
                </div>
              </div>
              <PriorityMatrixPlot points={summary.matrixPoints} />
            </div>
          </div>

          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            VALOR DE NEGOCIO →
          </p>
        </div>
      </div>
    </section>
  );
}
