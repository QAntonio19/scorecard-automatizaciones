import { ApiBackendMissingEnv, ApiBackendUnreachable } from "@/components/deployment/ApiBackendNotice";
import { AttentionList } from "@/components/panel/AttentionList";
import { MetricStrip } from "@/components/panel/MetricStrip";
import { PriorityMatrix } from "@/components/panel/PriorityMatrix";
import { fetchPortfolioSummary, isApiNotConfiguredError } from "@/lib/projectsApi";

export async function PanelPageContent() {
  let summary: Awaited<ReturnType<typeof fetchPortfolioSummary>>;
  try {
    summary = await fetchPortfolioSummary();
  } catch (e) {
    if (isApiNotConfiguredError(e)) {
      return (
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <ApiBackendMissingEnv />
        </div>
      );
    }
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <ApiBackendUnreachable />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Scorecard de salud del portafolio
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Expertiz ITAI — resumen para el Program Manager
        </p>
      </header>

      <MetricStrip summary={summary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PriorityMatrix summary={summary} />
        <AttentionList items={summary.attention} />
      </div>
    </div>
  );
}
