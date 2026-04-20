/** Skeleton mostrado mientras llega el resumen del scorecard (streaming). */
export function PanelPageSkeleton() {
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Cargando panel">
      <header className="space-y-2">
        <div className="h-9 max-w-md animate-pulse rounded-lg bg-slate-200/90" />
        <div className="h-4 max-w-sm animate-pulse rounded bg-slate-100" />
      </header>

      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 min-w-[min(100%,10rem)] flex-1 animate-pulse rounded-xl border border-slate-100 bg-slate-100/80 sm:min-w-[8rem]"
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[min(24rem,50vh)] animate-pulse rounded-xl border border-slate-100 bg-slate-100/80" />
        <div className="h-[min(24rem,50vh)] animate-pulse rounded-xl border border-slate-100 bg-slate-100/80" />
      </div>
    </div>
  );
}
