import Link from "next/link";
import type { PortfolioSummaryResponse } from "@/lib/projectTypes";

function borderForHealth(health: PortfolioSummaryResponse["attention"][number]["health"]) {
  if (health === "en_riesgo") return "border-l-rose-500";
  if (health === "pausado") return "border-l-amber-400";
  return "border-l-emerald-500";
}

function badgeClass(health: PortfolioSummaryResponse["attention"][number]["health"]) {
  if (health === "en_riesgo") return "bg-rose-50 text-rose-800 ring-rose-100";
  if (health === "pausado") return "bg-amber-50 text-amber-900 ring-amber-100";
  return "bg-emerald-50 text-emerald-900 ring-emerald-100";
}

export function AttentionList({ items }: { items: PortfolioSummaryResponse["attention"] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Requieren atención</h2>
      <p className="mt-1 text-sm text-slate-500">
        Priorizado por riesgo, pausas y arranques pendientes.
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((row) => (
          <li key={row.id}>
            <Link
              href={`/proyectos/${row.id}`}
              className={`block rounded-lg border border-slate-100 bg-slate-50/60 p-4 transition hover:bg-white hover:shadow-sm border-l-4 ${borderForHealth(
                row.health,
              )}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">Responsable: {row.ownerName}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeClass(
                    row.health,
                  )}`}
                >
                  {row.healthLabel}
                </span>
              </div>
              {row.failureRate != null ? (
                <p className="mt-2 text-xs font-medium text-rose-700">
                  Tasa de falla: {row.failureRate.toFixed(2)}%
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
