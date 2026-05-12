"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { ItProjectPhase } from "@/lib/itProjectTypes";
import { IT_PROJECT_PHASE_ORDER, phaseLabel } from "@/lib/itProjectPortfolio";
import { buildItProjectsQuery, parseKanbanExtras } from "@/lib/itProjectsUrl";

const phases = IT_PROJECT_PHASE_ORDER;

/** Fases del flujo principal (sin backlog/archivado en la misma fila visual). */
const MIDDLE_PHASE_ROW: ItProjectPhase[] = [
  "sin_empezar",
  "planificacion",
  "ejecucion",
  "cierre",
];

const EDGE_PHASE_PAIR = ["backlog", "archivado"] as const;

const chipBase =
  "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset transition-colors";

function phaseChipHref(
  ph: ItProjectPhase,
  ctx: {
    qInit: string;
    faseInit: string;
    bk: boolean;
    ar: boolean;
  },
): string {
  const { qInit, faseInit, bk, ar } = ctx;

  const middleHref = (): string => buildItProjectsQuery({ q: qInit, fase: ph });

  if (ph !== "backlog" && ph !== "archivado") return middleHref();

  if (ph === "backlog") {
    if (faseInit === "backlog") return buildItProjectsQuery({ q: qInit });
    if (!faseInit) {
      return buildItProjectsQuery({
        q: qInit,
        kanbanExtraBacklog: !bk,
        kanbanExtraArchivado: ar,
      });
    }
    return buildItProjectsQuery({ q: qInit, fase: "backlog" });
  }

  if (faseInit === "archivado") return buildItProjectsQuery({ q: qInit });
  if (!faseInit) {
    return buildItProjectsQuery({
      q: qInit,
      kanbanExtraBacklog: bk,
      kanbanExtraArchivado: !ar,
    });
  }
  return buildItProjectsQuery({ q: qInit, fase: "archivado" });
}

function phaseChipClass(
  ph: ItProjectPhase,
  ctx: { faseInit: string; bk: boolean; ar: boolean },
): string {
  const { faseInit, bk, ar } = ctx;
  const filterOn = faseInit === ph;
  const todExtrasOn = !faseInit && ((ph === "backlog" && bk) || (ph === "archivado" && ar));
  if (filterOn) return `${chipBase} bg-sky-700 text-white ring-sky-800`;
  if (todExtrasOn)
    return `${chipBase} bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/55 shadow-sm`;
  return `${chipBase} bg-white text-slate-600 ring-slate-200 hover:bg-slate-50`;
}

function edgeChipTitle(ph: "backlog" | "archivado", ctx: { faseInit: string; bk: boolean; ar: boolean }): string {
  const { faseInit, bk, ar } = ctx;
  if (faseInit === ph) return "Solo proyectos en esta fase (clic para volver a «Todas»).";
  if (!faseInit) {
    const on = ph === "backlog" ? bk : ar;
    return on
      ? "«Todas»: esta columna se muestra. Clic para ocultarla del tablero."
      : "«Todas»: oculto. Clic para añadir la columna y sus tarjetas al tablero.";
  }
  return `Filtrar solo proyectos ${ph === "backlog" ? "en backlog" : "archivados"}`;
}

export function ItProjectsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const qInit = searchParams.get("q") ?? "";
  const faseInit = searchParams.get("fase") ?? "";
  const [q, setQ] = useState(qInit);
  const { extraBacklog: bk, extraArchivado: ar } = parseKanbanExtras(searchParams);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const apply = useCallback(
    (nextQ: string, nextFase: string) => {
      startTransition(() => {
        const nextF =
          phases.includes(nextFase as ItProjectPhase) ? (nextFase as ItProjectPhase) : undefined;
        const { extraBacklog: bkN, extraArchivado: arN } = parseKanbanExtras(searchParams);
        router.push(
          `/proyectos${buildItProjectsQuery({
            q: nextQ.trim(),
            fase: nextF,
            kanbanExtraBacklog: nextF ? undefined : bkN,
            kanbanExtraArchivado: nextF ? undefined : arN,
          })}`,
        );
      });
    },
    [router, searchParams],
  );

  const ctx = { qInit, faseInit, bk, ar };

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

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Fase</span>
          <Link
            href={`/proyectos${buildItProjectsQuery({ q: qInit })}`}
            scroll={false}
            className={`${chipBase} ${
              !faseInit
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
            title={!faseInit ? "Sin filtrar por fase (flujo central)" : "Volver a vista «Todas»"}
          >
            Todas
          </Link>
          {MIDDLE_PHASE_ROW.map((ph) => (
            <Link
              key={ph}
              href={`/proyectos${phaseChipHref(ph, ctx)}`}
              scroll={false}
              className={phaseChipClass(ph, { faseInit, bk, ar })}
            >
              {phaseLabel(ph)}
            </Link>
          ))}
        </div>

        <div
          className="hidden h-6 w-px shrink-0 bg-slate-200 sm:block"
          aria-hidden
        />

        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-emerald-50/50 px-2 py-1 ring-1 ring-emerald-900/5">
          <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-800/70">
            Colas
          </span>
          {EDGE_PHASE_PAIR.map((ph) => (
            <Link
              key={ph}
              href={`/proyectos${phaseChipHref(ph, ctx)}`}
              scroll={false}
              title={edgeChipTitle(ph, { faseInit, bk, ar })}
              className={phaseChipClass(ph, { faseInit, bk, ar })}
            >
              {phaseLabel(ph)}
            </Link>
          ))}
        </div>
      </div>
      {pending ? (
        <p className="mt-2 text-[10px] font-medium text-slate-400">Actualizando…</p>
      ) : null}
    </div>
  );
}
