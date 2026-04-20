import { Suspense } from "react";
import { ItProjectDetailView } from "@/components/it-projects/ItProjectDetailView";

type PageProps = { params: Promise<{ id: string }> };

function DetailFallback() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

export default async function ItProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<DetailFallback />}>
      <ItProjectDetailView id={id} />
    </Suspense>
  );
}
