"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { ItProject } from "@/lib/itProjectTypes";
import { phaseLabel } from "@/lib/itProjectPortfolio";

const RISK_Y: Record<ItProject["riskLevel"], number> = { alto: 16.66, medio: 50, bajo: 83.33 };
const URGENCY_X: Record<string, number> = { baja: 16.66, media: 50, alta: 83.33 };

const DOT_COLORS: Record<ItProject["riskLevel"], string> = {
  alto: "#3b82f6", // blue-500
  medio: "#3b82f6", // blue-500
  bajo: "#3b82f6", // blue-500
};

const BACKGROUND_CELLS = [
  // Alto riesgo
  { x: 0, y: 0, fill: "#f8b7af6e" }, // orange-50
  { x: 33.33, y: 0, fill: "#f3a1a87e" }, // rose-50
  { x: 66.66, y: 0, fill: "#cf6a6a75" }, // red-50
  // Medio riesgo
  { x: 0, y: 33.33, fill: "#fffbeb" }, // amber-50
  { x: 33.33, y: 33.33, fill: "#faf19fda" }, // yellow-50
  { x: 66.66, y: 33.33, fill: "#e1d1559c" }, // yellow-100
  // Bajo riesgo
  { x: 0, y: 66.66, fill: "#c2f8c9b5" }, // teal-50
  { x: 33.33, y: 66.66, fill: "#a8f1b7d0" }, // emerald-50
  { x: 66.66, y: 66.66, fill: "#90d1a0b0" }, // green-50
];

type Point = {
  project: ItProject;
  x: number;
  y: number;
};

function buildPoints(projects: ItProject[]): Point[] {
  const activeProjects = projects.filter((p) => p.phase !== "archivado");
  const grid = new Map<string, ItProject[]>();
  
  activeProjects.forEach((p) => {
    const key = `${p.riskLevel}-${p.urgencyLevel ?? "media"}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(p);
  });

  const points: Point[] = [];
  
  grid.forEach((cellProjects, key) => {
    const [risk, urgency] = key.split("-") as [ItProject["riskLevel"], string];
    const cx = URGENCY_X[urgency] ?? 50;
    const cy = RISK_Y[risk] ?? 50;
    const total = cellProjects.length;
    
    // Sort deterministically
    cellProjects.sort((a, b) => a.name.localeCompare(b.name));
    
    cellProjects.forEach((p, i) => {
      let x = cx;
      let y = cy;
      if (total > 1) {
        // Fermat's spiral for deterministic organic distribution without overlap
        const c = total > 10 ? 2.8 : 3.5; 
        const angle = i * 137.5 * (Math.PI / 180);
        const radius = c * Math.sqrt(i);
        x = cx + Math.cos(angle) * radius;
        y = cy + Math.sin(angle) * radius;
      }
      points.push({ project: p, x, y });
    });
  });
  
  return points.sort((a, b) => a.project.name.localeCompare(b.project.name));
}

export function PanelRiskMatrix({ projects }: { projects: ItProject[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const points = useMemo(() => buildPoints(projects), [projects]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-full">
      <header className="border-b border-slate-100 px-5 py-4 shrink-0">
        <h2 className="text-sm font-bold text-slate-900">Matriz de Riesgo y Urgencia</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Ubicación de proyectos activos por nivel de riesgo y urgencia.
        </p>
      </header>

      <div className="p-5 flex-1 flex flex-col">
        {/* Gráfico SVG con ejes centrado y con tamaño máximo */}
        <div className="flex w-full justify-center">
          <div className="flex w-full max-w-[360px] lg:max-w-[500px]">
          {/* Eje Y */}
          <div className="relative flex w-12 shrink-0 flex-col justify-around py-4 pr-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <div className="absolute bottom-0 left-0 top-0 flex w-4 items-center justify-center">
              <span className="whitespace-nowrap font-bold uppercase tracking-[0.2em] text-slate-300" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                Riesgo
              </span>
            </div>
            <span className="text-red-400/80">A.</span>
            <span className="text-amber-500/80">M.</span>
            <span className="text-emerald-500/80">B.</span>
          </div>

          <div className="flex-1 relative">
            {/* SVG Background Container */}
            <div className="overflow-hidden rounded-xl border border-slate-200/60 shadow-inner">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-auto overflow-visible"
                style={{ aspectRatio: "1" }}
              >
                {/* Cuadrantes de color */}
                {BACKGROUND_CELLS.map((c, i) => (
                  <rect key={i} x={c.x} y={c.y} width="33.34" height="33.34" fill={c.fill} />
                ))}

                {/* Líneas divisorias */}
                <line x1="33.33" y1="0" x2="33.33" y2="100" stroke="#cbd5e1" strokeWidth="0.4" strokeDasharray="1 1.5" />
                <line x1="66.66" y1="0" x2="66.66" y2="100" stroke="#cbd5e1" strokeWidth="0.4" strokeDasharray="1 1.5" />
                <line x1="0" y1="33.33" x2="100" y2="33.33" stroke="#cbd5e1" strokeWidth="0.4" strokeDasharray="1 1.5" />
                <line x1="0" y1="66.66" x2="100" y2="66.66" stroke="#cbd5e1" strokeWidth="0.4" strokeDasharray="1 1.5" />
                
                {/* Puntos (Ordenados dinámicamente para que el hovered quede arriba sin perder animación CSS) */}
                {[...points]
                  .sort((a, b) => {
                    if (hovered === a.project.id) return 1;
                    if (hovered === b.project.id) return -1;
                    return 0;
                  })
                  .map(({ project: p, x, y }) => {
                    const isHovered = hovered === p.id;
                    return (
                      <circle
                        key={p.id}
                        cx={x}
                        cy={y}
                        r={isHovered ? 3.5 : 2.2}
                        fill={DOT_COLORS[p.riskLevel]}
                        stroke="white"
                        strokeWidth={isHovered ? 0.8 : 0.5}
                        opacity={isHovered ? 1 : 0.85}
                        className="cursor-pointer transition-all duration-300 ease-out"
                        onMouseEnter={() => setHovered(p.id)}
                        onMouseLeave={() => setHovered(null)}
                      />
                    );
                  })}
              </svg>
            </div>
            
            {/* HTML Tooltip Overlay (Fluid and shows full name) */}
            <div className="absolute inset-0 pointer-events-none">
              {points
                .filter((pt) => hovered === pt.project.id)
                .map((pt) => {
                  let xOffset = '-50%';
                  if (pt.x < 20) xOffset = '-5%';
                  if (pt.x > 80) xOffset = '-95%';

                  return (
                    <div
                      key={`tooltip-${pt.project.id}`}
                      className="absolute z-10 w-max max-w-[14rem] animate-in fade-in zoom-in-90 duration-200 ease-out"
                      style={{
                        left: `${pt.x}%`,
                        top: `${pt.y}%`,
                        transform: `translate(${xOffset}, -130%)`,
                      }}
                    >
                      <div className="rounded-lg bg-slate-900/95 px-3 py-2 text-center text-[11px] font-semibold leading-tight text-white shadow-xl drop-shadow-md">
                        {pt.project.name}
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {/* Eje X */}
            <div className="flex justify-around pt-3 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="text-emerald-500/80">Baja</span>
              <span className="text-amber-500/80">Media</span>
              <span className="text-red-400/80">Alta</span>
            </div>
            <div className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
              Urgencia
            </div>
          </div>
        </div>
        </div>

        {/* Lista de proyectos */}
        <div className="mt-6 flex-1 flex flex-col min-h-0">
          <h3 className="mb-3 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Proyectos ({points.length})
          </h3>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 pb-2 custom-scrollbar">
            {points.map(({ project: p }) => (
              <Link 
                key={p.id}
                href={`/proyectos/${p.id}`}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                className={`group flex flex-col gap-1 rounded-lg border px-3 py-2.5 transition-all duration-200 ${
                  hovered === p.id 
                    ? "border-sky-200 bg-sky-50/50 shadow-sm scale-[1.02]" 
                    : "border-slate-100 bg-slate-50 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] font-bold text-slate-400 transition-colors group-hover:text-sky-600">
                    {p.code}
                  </span>
                  <span 
                    className="h-2 w-2 shrink-0 rounded-full shadow-sm" 
                    style={{ backgroundColor: DOT_COLORS[p.riskLevel] }} 
                  />
                </div>
                <span className="line-clamp-2 text-xs font-bold leading-tight text-slate-700">
                  {p.name}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                  {phaseLabel(p.phase)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
