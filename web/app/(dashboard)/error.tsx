"use client";

import { ApiBackendMissingEnv, ApiBackendUnreachable } from "@/components/deployment/ApiBackendNotice";
import { isApiNotConfiguredError } from "@/lib/projectsApi";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const missing =
    isApiNotConfiguredError(error) ||
    error?.message?.includes("API_NOT_CONFIGURED") === true;

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {missing ? <ApiBackendMissingEnv /> : <ApiBackendUnreachable />}
        {error.digest ? (
          <p className="mt-6 text-center text-xs text-slate-400">Digest: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
