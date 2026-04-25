"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useMemo } from "react";
import { ItProjectWorkflowLinksPanel } from "@/components/it-projects/ItProjectWorkflowLinksPanel";
import { useMergedItProjects } from "@/lib/itProjectsLocalStore";
import { phaseLabel, riskLabel, urgencyLabel, urgencyBadgeClass } from "@/lib/itProjectPortfolio";
import type { ItProject } from "@/lib/itProjectTypes";

function riskBarClass(risk: "bajo" | "medio" | "alto"): string {
  if (risk === "alto") return "border-l-4 border-l-rose-500";
  if (risk === "medio") return "border-l-4 border-l-amber-400";
  return "border-l-4 border-l-emerald-500";
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-slate-100" />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

function ItProjectDetailBody({ p }: { p: ItProject }) {
  const done = p.milestones.filter((m) => m.done).length;
  const total = p.milestones.length || 1;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/proyectos"
        className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm font-medium text-indigo-800 transition hover:bg-indigo-50 hover:text-indigo-950"
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
        Volver a proyectos
      </Link>

      <header
        className={`relative mt-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/30 to-slate-50/80 px-6 py-8 shadow-sm sm:px-8 sm:py-10 ${riskBarClass(
          p.riskLevel,
        )}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold text-indigo-700">{p.code}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{p.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{p.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 ring-1 ring-slate-200">
              {phaseLabel(p.phase)}
            </span>
            <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
              Riesgo: {riskLabel(p.riskLevel)}
            </span>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${urgencyBadgeClass(p.urgencyLevel)}`}>
              Urgencia: {urgencyLabel(p.urgencyLevel)}
            </span>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Gobierno</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Sponsor</dt>
              <dd className="font-medium text-slate-900">{p.sponsor}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Project manager</dt>
              <dd className="font-medium text-slate-900">{p.pmName}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Inicio</dt>
              <dd className="tabular-nums font-medium text-slate-900">{p.startDate}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Fin objetivo</dt>
              <dd className="tabular-nums font-medium text-slate-900">{p.targetEndDate}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Avance de hitos</h2>
          <p className="mt-2 text-sm text-slate-600">
            {done} de {total} hitos completados ({pct}%).
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hitos</h2>
        {p.milestones.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aún no hay hitos. Podrás gestionarlos cuando exista persistencia en API.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {p.milestones.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
              >
                <span className={`text-sm font-medium ${m.done ? "text-slate-500 line-through" : "text-slate-900"}`}>
                  {m.title}
                </span>
                <span className="text-xs tabular-nums text-slate-500">{m.dueDate}</span>
                {m.done ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                    Hecho
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    Pendiente
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ItProjectWorkflowLinksPanel project={p} />
    </div>
  );
}

type Props = { id: string };

export function ItProjectDetailView({ id }: Props) {
  const { projects, ready } = useMergedItProjects();
  const p = useMemo(() => projects.find((x) => x.id === id), [projects, id]);

  if (!ready) {
    return <DetailSkeleton />;
  }
  if (!p) {
    notFound();
  }
  return <ItProjectDetailBody p={p} />;
}
