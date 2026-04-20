import { Suspense } from "react";
import { PanelPageContent } from "@/components/panel/PanelPageContent";
import { PanelPageSkeleton } from "@/components/panel/PanelPageSkeleton";

export default function PanelPage() {
  return (
    <Suspense fallback={<PanelPageSkeleton />}>
      <PanelPageContent />
    </Suspense>
  );
}
