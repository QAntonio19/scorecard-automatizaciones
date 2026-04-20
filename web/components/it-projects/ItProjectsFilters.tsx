"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { ItProjectPhase } from "@/lib/itProjectTypes";
import { IT_PROJECT_PHASE_ORDER, phaseLabel } from "@/lib/itProjectPortfolio";
import { buildItProjectsQuery, parseVistaProyectosIt } from "@/lib/itProjectsUrl";

const phases = IT_PROJECT_PHASE_ORDER;

const chipBase =
  "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset transition-colors";

export function ItProjectsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const qInit = searchParams.get("q") ?? "";
  const faseInit = searchParams.get("fase") ?? "";
  const vista = parseVistaProyectosIt(searchParams.get("vista") ?? undefined);
  const [q, setQ] = useState(qInit);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const apply = useCallback(
    (nextQ: string, nextFase: string) => {
      startTransition(() => {
        const fase =
          phases.includes(nextFase as ItProjectPhase) ? (nextFase as ItProjectPhase) : undefined;
        router.push(
          `/proyectos${buildItProjectsQuery({
            q: nextQ,
            fase,
            vista,
          })}`,
        );
      });
    },
    [router, vista],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          apply(q, faseInit);
        }}
      >
        <div className="min-w-[min(100%,18rem)] flex-1 sm:max-w-md">
          <label htmlFor="itp-q" className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Buscar
          </label>
          <input
            id="itp-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código, nombre, descripción…"
            className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 outline-none ring-sky-500/30 focus:bg-white focus:ring-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-sky-800"
        >
          Aplicar
        </button>
      </form>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Fase</span>
        <Link
          href={`/proyectos${buildItProjectsQuery({ q: qInit, vista })}`}
          scroll={false}
          className={`${chipBase} ${
            !faseInit
              ? "bg-slate-900 text-white ring-slate-900"
              : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          Todas
        </Link>
        {phases.map((ph) => {
          const active = faseInit === ph;
          return (
            <Link
              key={ph}
              href={`/proyectos${buildItProjectsQuery({ q: qInit, fase: ph, vista })}`}
              scroll={false}
              className={`${chipBase} ${
                active
                  ? "bg-sky-700 text-white ring-sky-800"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {phaseLabel(ph)}
            </Link>
          );
        })}
      </div>
      {pending ? (
        <p className="mt-2 text-[10px] font-medium text-slate-400">Actualizando…</p>
      ) : null}
    </div>
  );
}
