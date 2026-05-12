"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formPopoverHiddenClasses,
  formPopoverPanelMotionClasses,
  formPopoverVisibleClasses,
} from "@/components/ui/formPopoverMotion";
import { formFieldSelectTriggerClass } from "@/components/ui/formFieldClasses";
import { usePopoverPresence } from "@/components/ui/usePopoverPresence";

export interface FormStyledSelectOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

export interface FormStyledSelectProps<T extends string = string> {
  readonly id: string;
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly options: readonly FormStyledSelectOption<T>[];
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** Atenúa el texto del trigger cuando value es "" (p. ej. “Seleccionar…”). */
  readonly dimWhenEmpty?: boolean;
}

export function FormStyledSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  disabled,
  invalid,
  dimWhenEmpty,
}: FormStyledSelectProps<T>): ReactElement {
  const [open, setOpen] = useState(false);
  const { mounted: panelMounted, visible: panelVisible } = usePopoverPresence(open);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listId = `${id}-listbox`;

  const valueIndex = options.findIndex((o) => o.value === value);
  const selectedOption = valueIndex >= 0 ? options[valueIndex] : undefined;
  const [highlightIndex, setHighlightIndex] = useState(() => Math.max(0, valueIndex));

  const displayLabel = selectedOption?.label ?? (valueIndex < 0 && value !== ("" as T) ? String(value) : "—");

  const showAsPlaceholder = Boolean(dimWhenEmpty && String(value) === "");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const sync = (): void => {
      const idx = options.findIndex((o) => o.value === value);
      setHighlightIndex(idx >= 0 ? idx : 0);
    };
    sync();
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent): void => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [open, close]);

  const selectAt = useCallback(
    (index: number): void => {
      const opt = options[index];
      if (!opt || disabled) return;
      onChange(opt.value);
      close();
      requestAnimationFrame(() => btnRef.current?.focus({ preventScroll: true }));
    },
    [close, disabled, onChange, options],
  );

  const onBtnKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) return;

    if (e.key === "Escape") {
      if (!open) return;
      e.preventDefault();
      close();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightIndex((hi) => (hi + 1 >= options.length ? 0 : hi + 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightIndex(options.length - 1);
        return;
      }
      setHighlightIndex((hi) => (hi <= 0 ? options.length - 1 : hi - 1));
      return;
    }

    if (e.key === "Home" && open) {
      e.preventDefault();
      setHighlightIndex(0);
      return;
    }

    if (e.key === "End" && open) {
      e.preventDefault();
      setHighlightIndex(Math.max(0, options.length - 1));
      return;
    }

    if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      selectAt(highlightIndex);
    }
  };

  const triggerInvalid = invalid ? " border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : "";

  return (
    <div ref={wrapRef} className="group relative mt-1">
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-autocomplete="none"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${id}-opt-${highlightIndex}` : undefined}
        className={
          formFieldSelectTriggerClass +
          triggerInvalid +
          (disabled ? " cursor-not-allowed opacity-60" : "") +
          (showAsPlaceholder ? " text-slate-400" : "")
        }
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
        }}
        onKeyDown={onBtnKeyDown}
      >
        {displayLabel}
      </button>
      <span
        className="pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl border-l border-slate-100/90 bg-slate-50/50 text-sky-900/50 transition group-hover:border-slate-200 group-hover:bg-white group-hover:text-sky-800/80 group-focus-within:border-sky-200/70 group-focus-within:bg-sky-50/60 group-focus-within:text-sky-800"
        aria-hidden
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </span>

      {panelMounted ? (
        <ul
          id={listId}
          role="listbox"
          className={`absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200/95 bg-white p-1 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 ${formPopoverPanelMotionClasses} ${panelVisible ? formPopoverVisibleClasses : formPopoverHiddenClasses}`}
        >
          {options.map((opt, i) => {
            const selected = opt.value === value;
            const highlighted = i === highlightIndex;
            return (
              <li
                key={`${String(opt.value)}-${i}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={selected}
                className={
                  "cursor-pointer select-none rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors " +
                  (selected ? "bg-sky-50 text-sky-900 shadow-sm shadow-sky-900/5 " : "text-slate-800 ") +
                  (!selected && highlighted ? "bg-slate-50 ring-2 ring-inset ring-sky-400/35 " : "") +
                  (!selected && !highlighted ? "hover:bg-slate-50 " : "") +
                  (selected && highlighted ? "ring-2 ring-inset ring-sky-500/45 " : "")
                }
                onMouseEnter={() => setHighlightIndex(i)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  selectAt(i);
                }}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
