import { Suspense } from "react";
import { ProyectosPortfolioContent } from "@/components/it-projects/ProyectosPortfolioContent";

function ProyectosFallback() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-10 max-w-md animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    </div>
  );
}

export default function ProyectosPortfolioPage() {
  return (
    <Suspense fallback={<ProyectosFallback />}>
      <ProyectosPortfolioContent />
    </Suspense>
  );
}
