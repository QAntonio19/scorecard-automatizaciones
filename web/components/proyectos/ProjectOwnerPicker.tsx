"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getApiBaseUrl } from "@/lib/projectsApi";
import type { OwnerCode } from "@/lib/projectTypes";

type Props = {
  projectId: string;
  ownerCode: OwnerCode;
  ownerIsManual: boolean;
};

async function errorMessageFromResponse(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error?: { message?: string } };
    if (j.error?.message) return j.error.message;
  } catch {
    /* JSON distinto */
  }
  return text.trim() || `Error HTTP ${res.status}`;
}

export function ProjectOwnerPicker({ projectId, ownerCode, ownerIsManual }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = getApiBaseUrl();

  async function patchOwner(next: OwnerCode) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/projects/${encodeURIComponent(projectId)}/owner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerCode: next }),
      });
      if (!res.ok) {
        throw new Error(await errorMessageFromResponse(res));
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el responsable.");
    } finally {
      setPending(false);
    }
  }

  async function clearOverride() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/projects/${encodeURIComponent(projectId)}/owner`, {
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
          id={`owner-${projectId}`}
          value={ownerCode}
          disabled={pending}
          onChange={(e) => void patchOwner(e.target.value as OwnerCode)}
          className="min-w-[13rem] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-500/15 disabled:opacity-60"
        >
          <option value="JA">Juan Antonio (JA)</option>
          <option value="EV">Evelyn (EV)</option>
        </select>
        <button
          type="button"
          disabled={pending || !ownerIsManual}
          onClick={() => void clearOverride()}
          title={
            ownerIsManual
              ? "Quita tu asignación y aplica solo el responsable por defecto del sync (EXTERNAL_SYNC_DEFAULT_OWNER)."
              : "No hay asignación manual: ya se usa el responsable por defecto del sync."
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
            Cómo funciona el responsable
          </span>
        </summary>
        <p className="border-t border-slate-100 px-3 pb-3 pt-1 text-xs leading-relaxed text-slate-600">
          Las APIs de n8n/Make no definen un responsable JA/EV por workflow; el sync aplica un valor por
          defecto (<code className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[0.7rem] text-slate-800 ring-1 ring-slate-200/80">
            EXTERNAL_SYNC_DEFAULT_OWNER
          </code>{" "}
          en la API). Lo que eliges aquí se guarda aparte y no se pierde al sincronizar.
        </p>
      </details>
    </div>
  );
}
