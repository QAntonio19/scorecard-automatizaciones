"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { CsvExportButton } from "@/components/proyectos/CsvExportButton";
import type {
  AutomationPlatform,
  OwnerCode,
  ProjectHealth,
  VistaWorkflows,
} from "@/lib/projectTypes";
import { PROJECT_CATEGORIES } from "@/lib/projectCategories";
import { toApiProjectsQuery, buildWorkflowsQuery, parseWorkflowsSearchParams } from "@/lib/workflowsUrl";

function readState(sp: URLSearchParams) {
  const raw: Record<string, string | undefined> = {};
  sp.forEach((v, k) => {
    if (raw[k] === undefined) raw[k] = v;
  });
  return parseWorkflowsSearchParams(raw);
}

function toggleSingleOwner(current: OwnerCode[], code: OwnerCode): OwnerCode[] {
  if (current.length === 1 && current[0] === code) return [];
  return [code];
}

function toggleSingleHealth(current: ProjectHealth[], h: ProjectHealth): ProjectHealth[] {
  if (current.length === 1 && current[0] === h) return [];
  return [h];
}

function mergePlatform(
  current: AutomationPlatform[],
  x: AutomationPlatform,
): AutomationPlatform[] {
  if (current.includes(x)) return current.filter((p) => p !== x);
  return [...current, x];
}

const chipBase =
  "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset transition-colors";

export function WorkflowsToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const state = useMemo(() => readState(searchParams), [searchParams]);

  const apiQuery = useMemo(() => toApiProjectsQuery(state), [state]);

  const push = (next: ReturnType<typeof readState>) => {
    startTransition(() => {
      router.push(`/workflows${buildWorkflowsQuery(next)}`);
    });
  };

  const vistaBtn = (v: VistaWorkflows, label: string) => {
    const active = state.vista === v;
    return (
      <Link
        href={`/workflows${buildWorkflowsQuery({ ...state, vista: v })}`}
        className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide transition ${
          active
            ? "bg-sky-700 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100"
        }`}
        scroll={false}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1.5">
        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
          {vistaBtn("kanban", "Kanban")}
          {vistaBtn("tabla", "Tabla")}
          {vistaBtn("tarjetas", "Tarjetas")}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <CsvExportButton query={apiQuery} />
          {pending ? (
            <span className="text-[10px] font-medium text-slate-400">Actualizando…</span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Resp.</span>
          <button
            type="button"
            onClick={() => push({ ...state, owners: [] })}
            className={`${chipBase} ${
              state.owners.length === 0
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Todos
          </button>
          {(["JA", "EV"] as const).map((code) => {
            const active = state.owners.includes(code);
            const tone =
              code === "JA"
                ? active
                  ? "bg-violet-600 text-white ring-violet-700"
                  : "bg-violet-50 text-violet-900 ring-violet-100"
                : active
                  ? "bg-sky-600 text-white ring-sky-700"
                  : "bg-sky-50 text-sky-900 ring-sky-100";
            return (
              <button
                key={code}
                type="button"
                onClick={() => push({ ...state, owners: toggleSingleOwner(state.owners, code) })}
                className={`${chipBase} ${tone}`}
              >
                {code}
              </button>
            );
          })}
        </div>

        <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Est.</span>
          <button
            type="button"
            onClick={() => push({ ...state, health: [] })}
            className={`${chipBase} ${
              state.health.length === 0
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Todos
          </button>
          {(
            [
              { h: "activo" as const, label: "Activo", dot: "bg-emerald-500" },
              { h: "pausado" as const, label: "Pausado", dot: "bg-amber-400" },
              { h: "en_riesgo" as const, label: "Riesgo", dot: "bg-rose-500" },
            ] as const
          ).map(({ h, label, dot }) => {
            const active = state.health.includes(h);
            return (
              <button
                key={h}
                type="button"
                onClick={() => push({ ...state, health: toggleSingleHealth(state.health, h) })}
                className={`inline-flex items-center gap-1 ${chipBase} ${
                  active
                    ? "bg-slate-900 text-white ring-slate-900"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {label}
              </button>
            );
          })}
        </div>

        <span className="hidden h-4 w-px bg-slate-200 lg:block" aria-hidden />

        <div className="flex min-w-[8rem] flex-1 items-center gap-1.5 sm:min-w-0 sm:max-w-[11rem]">
          <label className="sr-only" htmlFor="filtro-categoria">
            Categoría
          </label>
          <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">Cat.</span>
          <select
            id="filtro-categoria"
            value={state.category}
            onChange={(e) => push({ ...state, category: e.target.value })}
            className="min-w-0 flex-1 rounded border border-slate-200 bg-white py-0.5 pl-1.5 pr-6 text-[11px] font-medium text-slate-800 outline-none ring-sky-500/30 focus:ring-1"
          >
            <option value="">Todas</option>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <form
          className="flex min-w-[min(100%,14rem)] flex-1 items-center gap-1 sm:min-w-[12rem] md:max-w-sm md:flex-initial"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = String(fd.get("q") ?? "");
            push({ ...state, q });
          }}
        >
          <label className="sr-only" htmlFor="filtro-q">
            Búsqueda
          </label>
          <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">Buscar</span>
          <input
            id="filtro-q"
            key={searchParams.toString()}
            name="q"
            defaultValue={state.q}
            placeholder="Nombre, stack…"
            className="min-w-0 flex-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] outline-none ring-sky-500/30 focus:bg-white focus:ring-1"
          />
          <button
            type="submit"
            className="shrink-0 rounded bg-sky-700 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-sky-800"
          >
            Ir
          </button>
        </form>
      </div>

      <div
        className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-2"
        title="n8n, Make o código (Python, APIs, Power Automate, etc.)."
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Plat.</span>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => push({ ...state, platforms: [] })}
            className={`${chipBase} ${
              state.platforms.length === 0
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            Todas
          </button>
          {(
            [
              { key: "n8n" as const, label: "n8n" },
              { key: "make" as const, label: "Make" },
              { key: "codigo_puro" as const, label: "Código" },
            ] as const
          ).map(({ key, label }) => {
            const active = state.platforms.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => push({ ...state, platforms: mergePlatform(state.platforms, key) })}
                className={`${chipBase} ${
                  active
                    ? "bg-indigo-600 text-white ring-indigo-700"
                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
