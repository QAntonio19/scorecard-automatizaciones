"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formPopoverHiddenClasses,
  formPopoverPanelMotionClasses,
  formPopoverVisibleClasses,
} from "@/components/ui/formPopoverMotion";
import { formFieldSelectTriggerClass } from "@/components/ui/formFieldClasses";
import { type FormStyledSelectOption } from "@/components/ui/FormStyledSelect";
import { usePopoverPresence } from "@/components/ui/usePopoverPresence";

export interface FormStyledMultiSelectProps {
  readonly id: string;
  readonly values: readonly string[];
  readonly onChange: (values: string[]) => void;
  readonly options: readonly FormStyledSelectOption<string>[];
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly placeholderWhenEmpty?: string;
}

export function FormStyledMultiSelect({
  id,
  values,
  onChange,
  options,
  disabled,
  invalid,
  placeholderWhenEmpty = "Seleccionar…",
}: FormStyledMultiSelectProps): ReactElement {
  const [open, setOpen] = useState(false);
  const { mounted: panelMounted, visible: panelVisible } = usePopoverPresence(open);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listId = `${id}-listbox`;

  const optionIndex = useMemo(() => new Map(options.map((o, i) => [o.value, i])), [options]);

  const displayLabel = useMemo(() => {
    if (values.length === 0) return placeholderWhenEmpty;
    const ordered = [...values].sort((a, b) => {
      const ia = optionIndex.get(a) ?? 999;
      const ib = optionIndex.get(b) ?? 999;
      return ia - ib;
    });
    return ordered
      .map((v) => options.find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }, [values, options, optionIndex, placeholderWhenEmpty]);

  const showAsPlaceholder = values.length === 0;

  const [highlightIndex, setHighlightIndex] = useState(0);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    setHighlightIndex((hi) => (hi < options.length ? hi : Math.max(0, options.length - 1)));
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent): void => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [open, close]);

  const toggleAt = useCallback(
    (index: number): void => {
      const opt = options[index];
      if (!opt || disabled) return;
      const v = opt.value;
      const has = values.includes(v);
      if (has) {
        onChange(values.filter((x) => x !== v));
      } else {
        onChange([...values, v]);
      }
    },
    [disabled, onChange, options, values],
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
      if (!open) setOpen(true);
      else setHighlightIndex((hi) => (hi + 1 >= options.length ? 0 : hi + 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightIndex(Math.max(0, options.length - 1));
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

    if ((e.key === "Enter" || e.key === " ") && open && options.length > 0) {
      e.preventDefault();
      toggleAt(highlightIndex);
    }
  };

  const triggerInvalid = invalid ? " border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : "";

  return (
    <div ref={wrapRef} className="group relative mt-1">
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-activedescendant={open ? `${id}-opt-${highlightIndex}` : undefined}
        id={id}
        disabled={disabled}
        title={displayLabel !== placeholderWhenEmpty ? displayLabel : undefined}
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
        <span className="block truncate text-left">{displayLabel}</span>
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
          aria-multiselectable="true"
          className={`absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200/95 bg-white p-1 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 ${formPopoverPanelMotionClasses} ${panelVisible ? formPopoverVisibleClasses : formPopoverHiddenClasses}`}
        >
          {options.map((opt, i) => {
            const selected = values.includes(opt.value);
            const highlighted = i === highlightIndex;
            return (
              <li
                key={`${opt.value}-${i}`}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={selected}
                className={
                  "flex cursor-pointer select-none items-start gap-2 rounded-lg px-2 py-2 text-sm font-medium outline-none transition-colors " +
                  (highlighted ? "bg-sky-50/90 ring-2 ring-inset ring-sky-400/35 " : "hover:bg-slate-50 ") +
                  "text-slate-800 "
                }
                onMouseEnter={() => setHighlightIndex(i)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  toggleAt(i);
                }}
              >
                <span
                  className={
                    "mt-0.5 flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded border text-[10px] " +
                    (selected
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-300 bg-white text-transparent")
                  }
                  aria-hidden
                >
                  ✓
                </span>
                <span>{opt.label}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
