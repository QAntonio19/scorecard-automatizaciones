"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KANBAN_PHASE_ORDER, phaseLabel } from "@/lib/phaseLabels";
import { getApiBaseUrl } from "@/lib/projectsApi";
import type { ProjectPhase } from "@/lib/projectTypes";

type Props = {
  projectId: string;
  phase: ProjectPhase;
  phaseIsManual: boolean;
};

async function errorMessageFromResponse(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error?: { message?: string } };
    if (j.error?.message) return j.error.message;
  } catch {
    /* ignore */
  }
  return text.trim() || `Error HTTP ${res.status}`;
}

export function ProjectPhasePicker({ projectId, phase, phaseIsManual }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = getApiBaseUrl();

  async function patchPhase(next: ProjectPhase) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/projects/${encodeURIComponent(projectId)}/phase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: next }),
      });
      if (!res.ok) {
        throw new Error(await errorMessageFromResponse(res));
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la fase.");
    } finally {
      setPending(false);
    }
  }

  async function clearOverride() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/projects/${encodeURIComponent(projectId)}/phase`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await errorMessageFromResponse(res));
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo restablecer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-stretch gap-2 sm:items-center">
        <select
          id={`phase-${projectId}`}
          value={phase}
          disabled={pending}
          onChange={(e) => void patchPhase(e.target.value as ProjectPhase)}
          className="min-w-[13rem] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-500/15 disabled:opacity-60"
        >
          {KANBAN_PHASE_ORDER.map((id) => (
            <option key={id} value={id}>
              {phaseLabel(id)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !phaseIsManual}
          onClick={() => void clearOverride()}
          title={
            phaseIsManual
              ? "Quita la fase manual y usa la que venga de datos base o del sync."
              : "No hay fase manual: se usa la fase inferida o del JSON."
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Quitar manual
        </button>
      </div>
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-100">
          {error}
        </p>
      ) : null}
      <details className="group rounded-xl border border-slate-100 bg-slate-50/80">
        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-slate-500 transition hover:text-slate-700 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-slate-400 transition group-open:rotate-90">▸</span>
            Qué significa cada fase
          </span>
        </summary>
        <p className="border-t border-slate-100 px-3 pb-3 pt-1 text-xs leading-relaxed text-slate-600">
          <strong className="text-slate-700">Backlog</strong>: idea o petición sin aprobar.{" "}
          <strong className="text-slate-700">Por iniciar</strong>: aprobado y aún no arranca.{" "}
          <strong className="text-slate-700">En proceso</strong>: en curso.{" "}
          <strong className="text-slate-700">Terminados</strong>: entrega cerrada en su versión actual.{" "}
          <strong className="text-slate-700">Archivado</strong>: ya no se usa. La fase que eliges aquí se
          guarda y no la pisa el sync.
        </p>
      </details>
    </div>
  );
}
