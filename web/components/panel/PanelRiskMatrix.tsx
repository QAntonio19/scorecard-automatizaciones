"use client";

import Link from "next/link";
import { useState } from "react";
import type { ItProject } from "@/lib/itProjectTypes";
import { phaseLabel, riskLabel } from "@/lib/itProjectPortfolio";

const RISK_Y: Record<ItProject["riskLevel"], number> = { bajo: 15, medio: 50, alto: 85 };
const URGENCY_X: Record<string, number> = { baja: 15, media: 50, alta: 85 };
const RISK_COLOR: Record<ItProject["riskLevel"], string> = {
  alto: "#f43f5e",
  medio: "#f59e0b",
  bajo: "#22c55e",
};
const PHASE_ICON: Record<string, string> = {
  backlog: "📥",
  sin_empezar: "📋",
  planificacion: "🗓️",
  ejecucion: "⚡",
  cierre: "✅",
  archivado: "📁",
};

type Point = {
  project: ItProject;
  x: number; // 0-100
  y: number; // 0-100 (0 = bottom = bajo riesgo, 100 = top = alto riesgo)
};

function buildPoints(projects: ItProject[]): Point[] {
  return projects
    .filter((p) => p.phase !== "archivado")
    .map((p) => ({
      project: p,
      x: URGENCY_X[p.urgencyLevel ?? "media"] ?? 50,
      y: RISK_Y[p.riskLevel],
    }));
}

export function PanelRiskMatrix({ projects }: { projects: ItProject[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const points = buildPoints(projects);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">Matriz de riesgo / urgencia</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Posición según nivel de riesgo (eje Y) y urgencia (eje X). Se excluyen archivados.
        </p>
      </header>

      <div className="px-5 pb-5 pt-4">
        {/* SVG grid */}
        <div className="relative w-full">
          <svg
            viewBox="0 0 100 100"
            className="w-full"
            style={{ aspectRatio: "1" }}
            aria-label="Matriz de riesgo vs urgencia"
          >
            {/* Background quadrants */}
            <rect x="0" y="0" width="50" height="50" fill="#fef2f2" opacity="0.5" />
            <rect x="50" y="0" width="50" height="50" fill="#fff1f2" opacity="0.7" />
            <rect x="0" y="50" width="50" height="50" fill="#f0fdf4" opacity="0.5" />
            <rect x="50" y="50" width="50" height="50" fill="#fefce8" opacity="0.5" />

            {/* Grid lines */}
            <line x1="50" y1="0" x2="50" y2="100" stroke="#e2e8f0" strokeWidth="0.5" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.5" />

            {/* Axis labels */}
            <text x="25" y="99" textAnchor="middle" fontSize="4" fill="#94a3b8">Urgencia baja</text>
            <text x="75" y="99" textAnchor="middle" fontSize="4" fill="#94a3b8">Urgencia alta</text>
            <text x="2" y="75" textAnchor="start" fontSize="4" fill="#94a3b8" transform="rotate(-90 2 75)">Riesgo bajo</text>
            <text x="2" y="25" textAnchor="start" fontSize="4" fill="#94a3b8" transform="rotate(-90 2 25)">Riesgo alto</text>

            {/* Points */}
            {points.map(({ project: p, x, y }) => {
              // Invert Y so high risk = top
              const cy = 100 - y;
              const isHovered = hovered === p.id;
              return (
                <g key={p.id}>
                  <circle
                    cx={x}
                    cy={cy}
                    r={isHovered ? 5 : 3.5}
                    fill={RISK_COLOR[p.riskLevel]}
                    opacity={isHovered ? 1 : 0.82}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseLeave={() => setHovered(null)}
                  />
                  {isHovered && (
                    <text
                      x={x}
                      y={cy - 6}
                      textAnchor="middle"
                      fontSize="4"
                      fill="#1e293b"
                      fontWeight="600"
                    >
                      {p.name.length > 18 ? `${p.name.slice(0, 18)}…` : p.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend list */}
        <ul className="mt-4 space-y-1.5">
          {points.map(({ project: p }) => (
            <li key={p.id}>
              <Link
                href={`/proyectos/${p.id}`}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition ${
                  hovered === p.id ? "bg-slate-100 ring-1 ring-slate-200" : "hover:bg-slate-50"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: RISK_COLOR[p.riskLevel] }}
                />
                <span className="font-mono text-[10px] text-slate-400 shrink-0">{p.code}</span>
                <span className="flex-1 truncate font-medium text-slate-800">{p.name}</span>
                <span className="shrink-0 text-slate-400">{PHASE_ICON[p.phase]}</span>
                <span className="shrink-0 text-slate-500">{riskLabel(p.riskLevel)}</span>
                <span className="shrink-0 text-slate-500">{phaseLabel(p.phase)}</span>
              </Link>
            </li>
          ))}
          {points.length === 0 && (
            <li className="py-4 text-center text-sm text-slate-400">No hay proyectos activos para mostrar.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
