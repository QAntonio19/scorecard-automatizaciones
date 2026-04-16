import type { PortfolioSummaryResponse } from "@/lib/projectTypes";

export function MetricStrip({ summary }: { summary: PortfolioSummaryResponse }) {
  const ja = summary.workload.find((w) => w.ownerCode === "JA");
  const ev = summary.workload.find((w) => w.ownerCode === "EV");
  const maxLoad = Math.max(ja?.count ?? 0, ev?.count ?? 0, 1);

  const wc = summary.workflowCounts ?? { n8n: 0, make: 0, codigo_puro: 0 };

  return (
    <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Total de proyectos
        </p>
        <p className="mt-2 text-4xl font-bold text-slate-900">{summary.total}</p>
        <p className="mt-1 text-xs text-slate-500">Entre 2 miembros del equipo</p>
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Activos</p>
        <p className="mt-2 text-4xl font-bold text-emerald-600">{summary.activos}</p>
        <p className="mt-1 text-xs text-slate-500">En producción</p>
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pausados</p>
        <p className="mt-2 text-4xl font-bold text-amber-500">{summary.pausados}</p>
        <p className="mt-1 text-xs text-slate-500">Esperando reactivación</p>
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">En riesgo</p>
        <p className="mt-2 text-4xl font-bold text-rose-600">{summary.enRiesgo}</p>
        <p className="mt-1 text-xs text-slate-500">Necesita atención inmediata</p>
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Distribución de carga
        </p>
        <div className="mt-4 space-y-3">
          {[
            { code: "JA", label: "JA", count: ja?.count ?? 0, tone: "bg-violet-500" },
            { code: "EV", label: "EV", count: ev?.count ?? 0, tone: "bg-sky-500" },
          ].map((row) => (
            <div key={row.code}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>{row.label}</span>
                <span>{row.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${row.tone}`}
                  style={{ width: `${(row.count / maxLoad) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Workflows n8n</p>
        <p className="mt-2 text-4xl font-bold text-pink-600">{wc.n8n}</p>
        <p className="mt-1 text-xs text-slate-500">Automatizaciones en n8n</p>
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Workflows Make</p>
        <p className="mt-2 text-4xl font-bold text-violet-600">{wc.make}</p>
        <p className="mt-1 text-xs text-slate-500">Escenarios en Make</p>
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Código puro</p>
        <p className="mt-2 text-4xl font-bold text-slate-700">{wc.codigo_puro}</p>
        <p className="mt-1 text-xs text-slate-500">Python, Power Automate, APIs, etc.</p>
      </article>
    </div>
    </div>
  );
}
