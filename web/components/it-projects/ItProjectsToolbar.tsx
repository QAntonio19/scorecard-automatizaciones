"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildItProjectsQuery, type VistaProyectosIt } from "@/lib/itProjectsUrl";
import type { ItProjectPhase } from "@/lib/itProjectTypes";

const PHASE_IDS: ItProjectPhase[] = [
  "backlog",
  "sin_empezar",
  "planificacion",
  "ejecucion",
  "cierre",
  "archivado",
];

function parseFaseParam(raw: string): ItProjectPhase | undefined {
  return PHASE_IDS.includes(raw as ItProjectPhase) ? (raw as ItProjectPhase) : undefined;
}

export function ItProjectsToolbar() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const faseRaw = searchParams.get("fase") ?? "";
  const fase = parseFaseParam(faseRaw);
  const vista: VistaProyectosIt = searchParams.get("vista") === "tabla" ? "tabla" : "kanban";

  const vistaBtn = (v: VistaProyectosIt, label: string) => {
    const active = vista === v;
    return (
      <Link
        href={`/proyectos${buildItProjectsQuery({
          q,
          fase,
          vista: v,
        })}`}
        scroll={false}
        className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide transition ${
          active ? "bg-sky-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
        }`}
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
        </div>
      </div>
    </div>
  );
}
