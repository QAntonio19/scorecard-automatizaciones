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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          id={`owner-${projectId}`}
          value={ownerCode}
          disabled={pending}
          onChange={(e) => void patchOwner(e.target.value as OwnerCode)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-60"
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
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Quitar asignación manual
        </button>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <p className="text-xs text-slate-500">
        Las APIs de n8n/Make no definen un &quot;responsable&quot; JA/EV por workflow; el sync aplica un
        valor por defecto (variable <code className="rounded bg-slate-100 px-1">EXTERNAL_SYNC_DEFAULT_OWNER</code> en
        la API). Lo que eliges aquí se guarda aparte y no se pierde al sincronizar.
      </p>
    </div>
  );
}
