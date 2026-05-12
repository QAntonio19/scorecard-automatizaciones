"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { formFieldControlClass } from "@/components/ui/formFieldClasses";
import { useCanEdit } from "@/hooks/useCanEdit";
import { useItProjectResponsableOptions } from "@/hooks/useItProjectResponsableOptions";
import {
  normalizeResponsableNameList,
  persistResponsableNames,
} from "@/lib/itProjectResponsablesLocal";

export function ItProjectResponsablesPageContent() {
  const canEdit = useCanEdit();
  const effectiveList = useItProjectResponsableOptions();
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const addName = useCallback(() => {
    const name = draft.trim();
    if (!name) return;
    if (effectiveList.some((x) => x.toLowerCase() === name.toLowerCase())) {
      setFeedback(`«${name}» ya está en la lista.`);
      return;
    }
    persistResponsableNames([...effectiveList, name]);
    setDraft("");
    setFeedback(null);
  }, [draft, effectiveList]);

  const removeName = useCallback(
    (name: string) => {
      const next = effectiveList.filter((n) => n !== name);
      persistResponsableNames(next);
      setFeedback(null);
    },
    [effectiveList],
  );

  return (
    <div className="mx-auto w-full max-w-xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Link href="/proyectos" className="text-sky-700 hover:text-sky-900 hover:underline">
              Proyectos
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-500">Responsables</span>
          </nav>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Responsables</h1>
          <p className="mt-2 text-sm text-slate-600">
            Quién puede elegirse en el campo <strong>Responsable</strong> al crear un proyecto se alinea con las
            etiquetas válidas del <code className="rounded bg-slate-100 px-1 text-[11px]">multi_select</code> en Notion.
            Los cambios se guardan solo en este navegador.
          </p>
        </div>
      </header>

      {feedback ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          {feedback}
        </p>
      ) : null}

      {canEdit === false ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Sin permiso de edición</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
            Tu cuenta puede ver proyectos pero no modificar opciones locales. Solicita rol de editor si necesitas
            administrar esta lista.
          </p>
        </div>
      ) : null}

      {canEdit !== false ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Lista actual</h2>
            <p className="mt-1 text-xs text-slate-500">
              Hay {effectiveList.length} opción{effectiveList.length === 1 ? "" : "es"} disponible
              {effectiveList.length === 1 ? "" : "s"} en el formulario{" "}
              <Link href="/proyectos/nuevo" className="font-semibold text-sky-700 hover:underline">
                Nuevo proyecto
              </Link>
              .
            </p>
            {effectiveList.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">Sin entradas. Añade al menos un nombre.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
                {effectiveList.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-3 px-4 py-3 first:rounded-t-[inherit] last:rounded-b-[inherit]"
                  >
                    <span className="min-w-0 flex-1 font-medium text-slate-800">{name}</span>
                    <button
                      type="button"
                      disabled={canEdit !== true}
                      onClick={() => removeName(name)}
                      className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Añadir responsable</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="resp-draft" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Nombre visible
                </label>
                <input
                  id="resp-draft"
                  value={draft}
                  disabled={canEdit !== true}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addName();
                    }
                  }}
                  placeholder="Ej. María"
                  className={`${formFieldControlClass} mt-1`}
                />
              </div>
              <button
                type="button"
                disabled={canEdit !== true}
                onClick={addName}
                className="shrink-0 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Añadir
              </button>
            </div>
          </section>

          <button
            type="button"
            disabled={canEdit !== true || effectiveList.length === 0}
            onClick={() => {
              persistResponsableNames(normalizeResponsableNameList(effectiveList.slice().sort((a, b) => a.localeCompare(b, "es"))));
              setFeedback(null);
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ordenar A–Z
          </button>
        </div>
      ) : null}
    </div>
  );
}
