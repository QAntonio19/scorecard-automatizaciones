"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { CsvExportButton } from "@/components/proyectos/CsvExportButton";
import type {
  AutomationPlatform,
  OwnerCode,
  ProjectHealth,
  VistaProyectos,
} from "@/lib/projectTypes";
import { PROJECT_CATEGORIES } from "@/lib/projectCategories";
import { toApiProjectsQuery, buildProyectosQuery, parseProyectosSearchParams } from "@/lib/proyectosUrl";

function readState(sp: URLSearchParams) {
  const raw: Record<string, string | undefined> = {};
  sp.forEach((v, k) => {
    if (raw[k] === undefined) raw[k] = v;
  });
  return parseProyectosSearchParams(raw);
}

/** Un solo responsable: mismo chip otra vez → quitar filtro (Todos). */
function toggleSingleOwner(current: OwnerCode[], code: OwnerCode): OwnerCode[] {
  if (current.length === 1 && current[0] === code) return [];
  return [code];
}

/** Un solo estatus: mismo chip otra vez → Todos. */
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

export function ProyectosToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const state = useMemo(() => readState(searchParams), [searchParams]);

  const apiQuery = useMemo(() => toApiProjectsQuery(state), [state]);

  const push = (next: ReturnType<typeof readState>) => {
    startTransition(() => {
      router.push(`/proyectos${buildProyectosQuery(next)}`);
    });
  };

  const vistaBtn = (v: VistaProyectos, label: string) => {
    const active = state.vista === v;
    return (
      <Link
        href={`/proyectos${buildProyectosQuery({ ...state, vista: v })}`}
        className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
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
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          {vistaBtn("kanban", "Kanban")}
          {vistaBtn("tabla", "Tabla")}
          {vistaBtn("tarjetas", "Tarjetas")}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CsvExportButton query={apiQuery} />
          {pending ? (
            <span className="text-xs font-medium text-slate-400">Actualizando…</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <fieldset className="space-y-2">
          <legend className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Responsable
          </legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => push({ ...state, owners: [] })}
              className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${
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
                  className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${tone}`}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Estatus
          </legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => push({ ...state, health: [] })}
              className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${
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
                { h: "en_riesgo" as const, label: "En riesgo", dot: "bg-rose-500" },
              ] as const
            ).map(({ h, label, dot }) => {
              const active = state.health.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => push({ ...state, health: toggleSingleHealth(state.health, h) })}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${
                    active
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400" htmlFor="filtro-categoria">
            Categoría
          </label>
          <select
            id="filtro-categoria"
            value={state.category}
            onChange={(e) => push({ ...state, category: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none ring-sky-500/30 focus:ring-2"
          >
            <option value="">Todas</option>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get("q") ?? "");
              push({ ...state, q });
            }}
          >
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400" htmlFor="filtro-q">
              Búsqueda
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="filtro-q"
                key={searchParams.toString()}
                name="q"
                defaultValue={state.q}
                placeholder="Nombre, stack…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800"
              >
                Aplicar
              </button>
            </div>
          </form>
        </div>
      </div>

      <fieldset className="space-y-2 border-t border-slate-100 pt-4">
        <legend className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Plataforma
        </legend>
        <p className="text-[11px] text-slate-500">
          n8n, Make o código (Python, APIs, Power Automate, etc.).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => push({ ...state, platforms: [] })}
            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${
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
              { key: "codigo_puro" as const, label: "Código puro" },
            ] as const
          ).map(({ key, label }) => {
            const active = state.platforms.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => push({ ...state, platforms: mergePlatform(state.platforms, key) })}
                className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${
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
      </fieldset>
    </div>
  );
}
