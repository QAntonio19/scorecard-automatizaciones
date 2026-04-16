"use client";

import { useMemo, useState } from "react";
import type { PortfolioSummaryResponse } from "@/lib/projectTypes";
import { MatrixProjectModal } from "@/components/panel/MatrixProjectModal";

export type MatrixPoint = PortfolioSummaryResponse["matrixPoints"][number];

function jitter(id: string): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i) * (i + 1)) % 17;
  const x = ((h % 7) - 3) * 0.55;
  const y = (((h >> 2) % 7) - 3) * 0.55;
  return { x, y };
}

function healthBubbleClass(health: MatrixPoint["health"]) {
  if (health === "en_riesgo") return "bg-rose-500";
  if (health === "pausado") return "bg-amber-500";
  return "bg-emerald-500";
}

function bubbleSizeClass(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i)) % 3;
  if (h === 0) return "h-3 w-3";
  if (h === 1) return "h-3.5 w-3.5";
  return "h-4 w-4";
}

/** Cerca del borde superior del gráfico el tooltip va debajo del punto para no salirse del área. */
const TOOLTIP_FLIP_THRESHOLD_PCT = 28;

type Edits = Record<string, { c: number; v: number }>;

function effectiveValues(p: MatrixPoint, edits: Edits): { c: number; v: number } {
  return {
    c: edits[p.id]?.c ?? p.complexity,
    v: edits[p.id]?.v ?? p.businessValue,
  };
}

export function PriorityMatrixPlot({ points }: { points: MatrixPoint[] }) {
  const [edits, setEdits] = useState<Edits>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const modalPoint = useMemo(() => {
    if (!activeId) return null;
    const p = points.find((x) => x.id === activeId);
    if (!p) return null;
    const { c, v } = effectiveValues(p, edits);
    return { ...p, complexity: c, businessValue: v };
  }, [activeId, points, edits]);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 overflow-visible">
        {points.map((p) => {
          const { c, v } = effectiveValues(p, edits);
          const left = (v / 10) * 100;
          const top = 100 - (c / 10) * 100;
          const { x, y } = jitter(p.id);
          const size = bubbleSizeClass(p.id);
          const tooltipBelow = top < TOOLTIP_FLIP_THRESHOLD_PCT;
          return (
            <div
              key={p.id}
              className="group pointer-events-auto absolute z-[1] hover:z-[200]"
              style={{
                left: `calc(${left}% + ${x}px)`,
                top: `calc(${top}% + ${y}px)`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="relative isolate flex items-center justify-center">
                <button
                  type="button"
                  aria-label={`Abrir detalles de ${p.name}`}
                  className={`relative z-10 block cursor-pointer rounded-full shadow-md ring-2 ring-white transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg ${size} ${healthBubbleClass(
                    p.health,
                  )}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveId(p.id);
                    setModalOpen(true);
                  }}
                />
                <div
                  className={`pointer-events-none invisible absolute left-1/2 z-[60] w-max min-w-[180px] max-w-[240px] -translate-x-1/2 rounded-lg border border-slate-100 bg-white p-3 opacity-0 shadow-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 ${
                    tooltipBelow ? "top-full mt-2" : "bottom-full mb-2"
                  }`}
                  role="tooltip"
                >
                  <p className="font-bold text-slate-900">{p.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{p.category}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    C:{c} · V:{v}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <MatrixProjectModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setActiveId(null);
        }}
        point={modalPoint}
        onSave={(complexity, businessValue) => {
          if (!activeId) return;
          setEdits((prev) => ({
            ...prev,
            [activeId]: { c: complexity, v: businessValue },
          }));
        }}
      />
    </>
  );
}
