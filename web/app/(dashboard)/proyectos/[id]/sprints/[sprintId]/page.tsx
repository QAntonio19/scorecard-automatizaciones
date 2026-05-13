import { Suspense } from "react";
import { SprintDetailView } from "@/components/it-projects/SprintDetailView";

type PageProps = { params: Promise<{ id: string; sprintId: string }> };

function SprintDetailFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl border border-slate-100 bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

export default async function SprintDetailPage({ params }: PageProps) {
  const { id, sprintId } = await params;
  return (
    <Suspense fallback={<SprintDetailFallback />}>
      <SprintDetailView projectId={decodeURIComponent(id)} sprintId={decodeURIComponent(sprintId)} />
    </Suspense>
  );
}
