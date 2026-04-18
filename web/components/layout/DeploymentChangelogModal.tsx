"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  deploymentChangelog,
  githubCommitsUrl,
  githubRepoUrl,
} from "@/lib/deploymentChangelog";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DeploymentChangelogModal({ open, onClose }: Props) {
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setPortalEl(document.body);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onKeyDown]);

  if (!open || !portalEl) return null;

  const { repository, releases } = deploymentChangelog;
  const repoUrl = githubRepoUrl(repository);
  const commitsUrl = githubCommitsUrl(repository.defaultBranch, repository);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Cerrar historial"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(85vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="shrink-0 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-bold text-slate-900">
                Historial de versiones
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Registro de despliegues y cambios (fuente:{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700">
                  web/data/deployment-changelog.json
                </code>
                ).
              </p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 ring-1 ring-sky-100 hover:bg-sky-100"
            >
              Repositorio en GitHub
            </a>
            <a
              href={commitsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              Commits en {repository.defaultBranch}
            </a>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ol className="space-y-6">
            {releases.map((rel) => {
              const formatted = (() => {
                try {
                  if (rel.releasedAt) {
                    return new Date(rel.releasedAt).toLocaleString("es-MX", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZoneName: "short",
                    });
                  }
                  return new Date(`${rel.date}T12:00:00`).toLocaleDateString("es-MX", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });
                } catch {
                  return rel.date;
                }
              })();

              return (
                <li key={rel.version}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-bold tabular-nums text-indigo-900 ring-1 ring-indigo-100">
                      v{rel.version}
                    </span>
                    <time
                      className="text-xs font-medium capitalize text-slate-500"
                      dateTime={rel.releasedAt ?? `${rel.date}T12:00:00`}
                    >
                      {formatted}
                    </time>
                  </div>
                  {rel.githubCompareUrl ? (
                    <a
                      href={rel.githubCompareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-sky-700 hover:underline"
                    >
                      Ver diff en GitHub →
                    </a>
                  ) : null}
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                    {rel.changes.map((line, idx) => (
                      <li key={`${rel.version}-${idx}`}>{line}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
          {releases.length === 0 ? (
            <p className="text-sm text-slate-500">No hay versiones registradas todavía.</p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <p className="text-[11px] leading-relaxed text-slate-500">
            Para documentar un nuevo despliegue, añade un objeto al inicio del array{" "}
            <code className="text-slate-600">releases</code> en el JSON (versión más reciente
            arriba) y despliega de nuevo.
          </p>
        </div>
      </div>
    </div>,
    portalEl,
  );
}
