import { Suspense } from "react";
import { PanelPageContent } from "@/components/panel/PanelPageContent";

function PanelSkeleton() {
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        <div className="h-80 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
      </div>
    </div>
  );
}

export default function PanelPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <PanelPageContent />
    </Suspense>
  );
}
