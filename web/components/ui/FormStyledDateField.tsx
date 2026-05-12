"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";

import "react-day-picker/style.css";

import {
  formPopoverHiddenClasses,
  formPopoverPanelMotionClasses,
  formPopoverVisibleClasses,
} from "@/components/ui/formPopoverMotion";
import { formFieldSelectTriggerClass } from "@/components/ui/formFieldClasses";
import { usePopoverPresence } from "@/components/ui/usePopoverPresence";

function parseIsoToLocalDate(iso: string): Date | undefined {
  const t = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;
  const [ys, ms, ds] = t.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return undefined;
  return dt;
}

function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface FormStyledDateFieldProps {
  readonly id: string;
  /** Fecha local en formato ISO `yyyy-MM-DD` o vacío. */
  readonly value: string;
  readonly onChange: (isoYYYY_MM_DD: string) => void;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly placeholder?: string;
  /** Aplica tono muted al trigger cuando no hay fecha. */
  readonly dimWhenEmpty?: boolean;
}

/** Calendario y panel homogéneos con selects custom (sin `<input type="date">`). */
export function FormStyledDateField({
  id,
  value,
  onChange,
  disabled,
  invalid,
  placeholder = "Seleccionar fecha…",
  dimWhenEmpty,
}: FormStyledDateFieldProps): ReactElement {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelId = `${id}-calendar`;
  const { mounted: panelMounted, visible: panelVisible } = usePopoverPresence(open);

  const parsed = useMemo(() => parseIsoToLocalDate(value), [value]);

  const [menuMonth, setMenuMonth] = useState<Date>(() => parsed ?? new Date());

  useEffect(() => {
    if (!open) return;
    setMenuMonth(parsed ?? new Date());
  }, [open, parsed]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent): void => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [open, close]);

  const triggerInvalid = invalid ? " border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : "";
  const showAsPlaceholder = Boolean(dimWhenEmpty && !parsed);

  const displayLabel =
    parsed?.toLocaleDateString("es", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }) ?? placeholder;

  const clearAndClose = (): void => {
    onChange("");
    close();
    requestAnimationFrame(() => btnRef.current?.focus({ preventScroll: true }));
  };

  const pickTodayAndClose = (): void => {
    const t = new Date();
    onChange(toLocalIsoDate(t));
    close();
    requestAnimationFrame(() => btnRef.current?.focus({ preventScroll: true }));
  };

  const onBtnKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) return;
    if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
      return;
    }
    if ((e.key === "ArrowDown" || e.key === " ") && !open) {
      e.preventDefault();
      setOpen(true);
      return;
    }
  };

  return (
    <div ref={wrapRef} className="group relative mt-1">
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={panelId}
        id={id}
        disabled={disabled}
        className={
          formFieldSelectTriggerClass +
          triggerInvalid +
          (disabled ? " cursor-not-allowed opacity-60" : "") +
          (showAsPlaceholder ? " font-normal text-slate-400" : "")
        }
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        onKeyDown={onBtnKeyDown}
      >
        <span className="capitalize">{displayLabel}</span>
      </button>
      <span
        className="pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl border-l border-slate-100/90 bg-slate-50/50 text-sky-900/55 transition group-hover:border-slate-200 group-hover:bg-white group-hover:text-sky-800/80 group-focus-within:border-sky-200/70 group-focus-within:bg-sky-50/60 group-focus-within:text-sky-900"
        aria-hidden
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-colors duration-200 ${open ? "text-sky-800" : ""}`}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V5m8 2V5m-9 8h10M6 21h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
          />
        </svg>
      </span>

      {panelMounted ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 min-w-0">
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            className={
              "it-datepicker-popover pointer-events-auto w-full min-w-0 max-w-full rounded-xl border border-slate-200/95 bg-white p-3 shadow-lg shadow-slate-900/12 ring-1 ring-slate-900/5 " +
              "[--rdp-accent-color:#0284c7] [--rdp-accent-background-color:#e0f2fe] [--rdp-day_button-border-radius:0.625rem] " +
              `${formPopoverPanelMotionClasses} ${panelVisible ? formPopoverVisibleClasses : formPopoverHiddenClasses}`
            }
          >
            <div className="flex min-w-0 w-full flex-col items-center">
              <DayPicker
                mode="single"
                locale={es}
                weekStartsOn={1}
                captionLayout="label"
                navLayout="around"
                animate={false}
                month={menuMonth}
                onMonthChange={setMenuMonth}
                selected={parsed}
                startMonth={new Date(2000, 0)}
                endMonth={new Date(2040, 11)}
                classNames={{
                  root: "rdp-root !m-0 !min-w-0 !max-w-full !p-0 w-full outline-none",
                  months: "rdp-months w-full max-w-full min-w-0 justify-center",
                  month: "rdp-month w-full max-w-full min-w-0",
                  month_caption: "rdp-month_caption !justify-center",
                  month_grid: "rdp-month_grid min-w-0 w-full max-w-full",
                }}
              onSelect={(next) => {
                if (!next || disabled) return;
                onChange(toLocalIsoDate(next));
                close();
                requestAnimationFrame(() => btnRef.current?.focus({ preventScroll: true }));
              }}
              disabled={disabled}
              />
            </div>
            <div className="mt-3 flex justify-between gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                className="text-sm font-semibold text-slate-600 underline-offset-4 transition hover:text-sky-700 hover:underline disabled:opacity-40"
                disabled={disabled}
                onClick={clearAndClose}
              >
                Limpiar
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-sky-700 underline-offset-4 transition hover:underline disabled:opacity-40"
                disabled={disabled}
                onClick={pickTodayAndClose}
              >
                Hoy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
