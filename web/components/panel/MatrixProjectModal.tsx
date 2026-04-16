"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PortfolioSummaryResponse, ProjectHealth, ProjectPhase } from "@/lib/projectTypes";

export type MatrixPointFull = PortfolioSummaryResponse["matrixPoints"][number];

function phaseLabel(phase: ProjectPhase): string {
  if (phase === "sin_iniciar") return "Sin iniciar";
  if (phase === "en_progreso") return "En progreso";
  return "Completado";
}

function HealthBadge({ health, label }: { health: ProjectHealth; label: string }) {
  const styles =
    health === "en_riesgo"
      ? "bg-rose-50 text-rose-800 ring-rose-200"
      : health === "pausado"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : "bg-emerald-50 text-emerald-800 ring-emerald-200";
  const dot =
    health === "en_riesgo"
      ? "bg-rose-500"
      : health === "pausado"
        ? "bg-amber-400"
        : "bg-emerald-500";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ring-inset ${styles}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function PhaseValue({ phase }: { phase: ProjectPhase }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full border-2 border-sky-400 border-t-transparent"
        aria-hidden
      />
      {phaseLabel(phase)}
    </span>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  point: MatrixPointFull | null;
  onSave: (complexity: number, businessValue: number) => void;
};

export function MatrixProjectModal({ open, onClose, point, onSave }: Props) {
  const [complexity, setComplexity] = useState(5);
  const [businessValue, setBusinessValue] = useState(5);

  useEffect(() => {
    if (open && point) {
      setComplexity(point.complexity);
      setBusinessValue(point.businessValue);
    }
  }, [open, point]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !point) return null;

  const handleSave = () => {
    onSave(complexity, businessValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="matrix-modal-title"
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h2 id="matrix-modal-title" className="pr-8 text-lg font-bold text-slate-800">
            {point.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar ventana"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="px-6">
          <Row label="Categoría" value={point.category} />
          <Row label="Responsable" value={point.ownerName} />
          {point.platform ? <Row label="Plataforma" value={point.platform} /> : null}
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3">
            <span className="text-sm text-slate-500">Estatus</span>
            <HealthBadge health={point.health} label={point.healthLabel} />
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3">
            <span className="text-sm text-slate-500">Fase</span>
            <PhaseValue phase={point.phase} />
          </div>

          <SliderBlock
            label="Complejidad"
            min={1}
            max={10}
            value={complexity}
            onChange={setComplexity}
          />
          <SliderBlock
            label="Valor de negocio"
            min={1}
            max={10}
            value={businessValue}
            onChange={setBusinessValue}
          />
        </div>

        <footer className="mt-2 grid grid-cols-1 gap-3 border-t border-slate-100 px-6 py-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
          >
            Guardar cambios
          </button>
          <Link
            href={`/proyectos/${point.id}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            Ver proyecto
            <span aria-hidden>→</span>
          </Link>
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function SliderBlock({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-3 flex items-center gap-4">
        <span className="text-xs font-semibold text-slate-400">{min}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-md"
        />
        <span className="text-xs font-semibold text-slate-400">{max}</span>
        <span className="min-w-[2rem] text-right text-lg font-bold text-blue-600">{value}</span>
      </div>
    </div>
  );
}
