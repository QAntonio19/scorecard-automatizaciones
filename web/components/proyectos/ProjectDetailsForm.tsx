"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/projectsApi";
import type { ProjectHealth, ProjectRecord } from "@/lib/projectTypes";

type Props = { project: ProjectRecord };

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

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-500/15 disabled:opacity-60";

const labelClass = "text-[11px] font-bold uppercase tracking-wider text-slate-400";

export function ProjectDetailsForm({ project }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [category, setCategory] = useState(project.category);
  const [complexity, setComplexity] = useState(String(project.complexity));
  const [businessValue, setBusinessValue] = useState(String(project.businessValue));
  const [steps, setSteps] = useState(String(project.steps));
  const [progress, setProgress] = useState(String(project.progress));
  const [schedule, setSchedule] = useState(project.schedule);
  const [failureRate, setFailureRate] = useState(
    project.failureRate != null ? String(project.failureRate) : "",
  );
  const [riskNote, setRiskNote] = useState(project.riskNote ?? "");
  const [health, setHealth] = useState<ProjectHealth>(project.health);
  const [healthLabel, setHealthLabel] = useState(project.healthLabel);

  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
    setCategory(project.category);
    setComplexity(String(project.complexity));
    setBusinessValue(String(project.businessValue));
    setSteps(String(project.steps));
    setProgress(String(project.progress));
    setSchedule(project.schedule);
    setFailureRate(project.failureRate != null ? String(project.failureRate) : "");
    setRiskNote(project.riskNote ?? "");
    setHealth(project.health);
    setHealthLabel(project.healthLabel);
  }, [project]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setOk(false);
    const base = getApiBaseUrl();
    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      complexity: Number.parseInt(complexity, 10),
      businessValue: Number.parseInt(businessValue, 10),
      steps: Number.parseInt(steps, 10),
      progress: Number.parseFloat(progress),
      schedule: schedule.trim(),
      riskNote: riskNote.trim() === "" ? null : riskNote.trim(),
      health,
      healthLabel: healthLabel.trim(),
    };
    const fr = failureRate.trim();
    body.failureRate = fr === "" ? null : Number.parseFloat(fr);

    if (!Number.isFinite(body.complexity as number) || (body.complexity as number) < 1) {
      setError("Complejidad debe ser un número entre 1 y 10.");
      setPending(false);
      return;
    }
    if (!Number.isFinite(body.businessValue as number) || (body.businessValue as number) < 1) {
      setError("Valor de negocio debe ser un número entre 1 y 10.");
      setPending(false);
      return;
    }
    if (!Number.isFinite(body.steps as number) || (body.steps as number) < 0) {
      setError("Pasos debe ser un número ≥ 0.");
      setPending(false);
      return;
    }
    if (!Number.isFinite(body.progress as number)) {
      setError("Progreso inválido.");
      setPending(false);
      return;
    }

    try {
      const res = await fetch(`${base}/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await errorMessageFromResponse(res));
      }
      setOk(true);
      router.refresh();
      window.setTimeout(() => setOk(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-800">Identidad</h3>
        <p className="mt-1 text-xs text-slate-500">Nombre, descripción y categoría visibles en el scorecard.</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass} htmlFor="wf-name">
              Nombre
            </label>
            <input id="wf-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass} htmlFor="wf-desc">
              Descripción
            </label>
            <textarea
              id="wf-desc"
              rows={3}
              className={`${inputClass} resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="wf-cat">
              Categoría
            </label>
            <input id="wf-cat" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
          <label className={labelClass} htmlFor="wf-steps">
            Pasos del flujo
          </label>
          <input
            id="wf-steps"
            type="number"
            min={0}
            className={inputClass}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
          />
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
          <label className={labelClass} htmlFor="wf-cx">
            Complejidad (1–10)
          </label>
          <input
            id="wf-cx"
            type="number"
            min={1}
            max={10}
            className={inputClass}
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
          />
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
          <label className={labelClass} htmlFor="wf-bv">
            Valor negocio (1–10)
          </label>
          <input
            id="wf-bv"
            type="number"
            min={1}
            max={10}
            className={inputClass}
            value={businessValue}
            onChange={(e) => setBusinessValue(e.target.value)}
          />
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
          <label className={labelClass} htmlFor="wf-fr">
            Tasa de fallo (%)
          </label>
          <input
            id="wf-fr"
            type="text"
            inputMode="decimal"
            placeholder="Vacío = sin dato"
            className={inputClass}
            value={failureRate}
            onChange={(e) => setFailureRate(e.target.value)}
          />
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80 sm:col-span-2 lg:col-span-1">
          <label className={labelClass} htmlFor="wf-sch">
            Programación
          </label>
          <input id="wf-sch" className={inputClass} value={schedule} onChange={(e) => setSchedule(e.target.value)} />
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80 sm:col-span-2 lg:col-span-1">
          <label className={labelClass} htmlFor="wf-pr">
            Progreso (%)
          </label>
          <input
            id="wf-pr"
            type="number"
            min={0}
            max={100}
            step={0.1}
            className={inputClass}
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
          />
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
              style={{
                width: `${Math.min(100, Math.max(0, Number.parseFloat(progress) || 0))}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
          <label className={labelClass} htmlFor="wf-health">
            Estado (salud)
          </label>
          <select
            id="wf-health"
            className={inputClass}
            value={health}
            onChange={(e) => setHealth(e.target.value as ProjectHealth)}
          >
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
            <option value="en_riesgo">En riesgo</option>
          </select>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
          <label className={labelClass} htmlFor="wf-hl">
            Etiqueta de estado
          </label>
          <input
            id="wf-hl"
            className={inputClass}
            value={healthLabel}
            onChange={(e) => setHealthLabel(e.target.value)}
            placeholder="p. ej. Pausado"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
        <label className={labelClass} htmlFor="wf-risk">
          Notas de riesgo
        </label>
        <textarea
          id="wf-risk"
          rows={3}
          className={`${inputClass} resize-y`}
          value={riskNote}
          onChange={(e) => setRiskNote(e.target.value)}
          placeholder="Observaciones opcionales…"
        />
      </div>

      {project.platform ? (
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Plataforma (solo lectura):</span> {project.platform}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">{error}</p>
      ) : null}
      {ok ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-100">
          Cambios guardados.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-500/30 disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <span className="text-xs text-slate-500">Se guarda en la API (Supabase o archivo local según configuración).</span>
      </div>
    </form>
  );
}
