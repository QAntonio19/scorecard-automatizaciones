/**
 * Mientras se resuelve la ruta del dashboard (RSC), el usuario ve feedback inmediato
 * en lugar de pantalla en blanco.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <div className="h-9 max-w-lg animate-pulse rounded-lg bg-slate-200/90" />
        <div className="h-4 max-w-md animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-slate-100 bg-slate-100/80" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border border-slate-100 bg-slate-100/80" />
        <div className="h-64 animate-pulse rounded-xl border border-slate-100 bg-slate-100/80" />
      </div>
    </div>
  );
}
