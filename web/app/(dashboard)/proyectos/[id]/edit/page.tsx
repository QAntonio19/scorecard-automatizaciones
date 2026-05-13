import { Suspense } from "react";
import { EditItProjectGate } from "@/components/it-projects/EditItProjectGate";

type PageProps = { params: Promise<{ id: string }> };

function EditFallback() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mx-auto max-w-2xl h-[32rem] animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
    </div>
  );
}

export default async function EditarItProjectPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<EditFallback />}>
      <EditItProjectGate id={decodeURIComponent(id)} />
    </Suspense>
  );
}
