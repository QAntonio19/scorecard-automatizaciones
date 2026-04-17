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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          id={`phase-${projectId}`}
          value={phase}
          disabled={pending}
          onChange={(e) => void patchPhase(e.target.value as ProjectPhase)}
          className="min-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-60"
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
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Quitar fase manual
        </button>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <p className="text-xs text-slate-500">
        <strong>Backlog</strong>: idea o petición sin aprobar. <strong>Por iniciar</strong>: aprobado y aún
        no arranca. <strong>En proceso</strong>: en curso. <strong>Terminados</strong>: entrega cerrada en
        su versión actual (otra versión puede abrirse en otra fase). <strong>Archivado</strong>: ya no se usa.
        La fase que eliges aquí se guarda y no la pisa el sync.
      </p>
    </div>
  );
}
