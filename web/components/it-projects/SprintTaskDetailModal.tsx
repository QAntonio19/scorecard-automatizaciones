"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import type { ItProject, ItProjectPlannedTask } from "@/lib/itProjectTypes";
import {
  SPRINT_TASK_KANBAN_COLUMN_ORDER,
  applySprintTaskTitleForKanbanColumn,
  inferSprintTaskKanbanColumn,
  sprintTaskKanbanColumnLabel,
  type SprintTaskKanbanColumn,
} from "@/lib/itProjectScopeProgress";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";

type NotionTaskCommentDto = {
  id: string;
  createdAt: string;
  text: string;
  authorLabel: string;
};

export type SprintTaskDetailModalProps = {
  open: boolean;
  task: ItProjectPlannedTask | null;
  project: ItProject;
  /** Si el proyecto vive solo en navegador, el texto debe hablar de caché local, no Notion */
  persistedOnNotion: boolean;
  saving: boolean;
  saveError: string | null;
  onClose: () => void;
  onSave: (nextTitle: string) => void;
};

function notionTaskPageUrl(taskPageId: string): string {
  const raw = taskPageId.trim();
  if (!raw) return "";
  const id = raw.replace(/-/g, "");
  return `https://www.notion.so/${id}`;
}

function parseCommentsResponse(raw: unknown): NotionTaskCommentDto[] | null {
  if (typeof raw !== "object" || raw === null || !("comments" in raw)) return null;
  const list = (raw as { comments: unknown }).comments;
  if (!Array.isArray(list)) return null;
  const out: NotionTaskCommentDto[] = [];
  for (const row of list) {
    if (typeof row !== "object" || row === null) continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const createdAt = typeof o.createdAt === "string" ? o.createdAt : "";
    const text = typeof o.text === "string" ? o.text : "";
    const authorLabel = typeof o.authorLabel === "string" ? o.authorLabel : "Notion";
    if (!id || !createdAt) continue;
    out.push({ id, createdAt, text, authorLabel });
  }
  return out;
}

function fmtCommentDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function SprintTaskDetailModal({
  open,
  task,
  project,
  persistedOnNotion,
  saving,
  saveError,
  onClose,
  onSave,
}: SprintTaskDetailModalProps) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [columnDraft, setColumnDraft] = useState<SprintTaskKanbanColumn>("pendiente");
  const [comments, setComments] = useState<NotionTaskCommentDto[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );

  const notionUrl = useMemo(() => {
    if (!task || !isLikelyNotionPageId(task.id)) return "";
    return notionTaskPageUrl(task.id);
  }, [task]);

  useEffect(() => {
    if (!open || !task) return;
    setColumnDraft(inferSprintTaskKanbanColumn(task.title));
  }, [open, task]);

  const loadComments = useCallback(async (taskPageId: string) => {
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const res = await fetch(`/api/notion/tasks/${encodeURIComponent(taskPageId)}/comments`, {
        cache: "no-store",
      });
      const payload: unknown = await res.json().catch(() => null);
      const parsed = parseCommentsResponse(payload);

      const errMsg =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof (payload as { error: unknown }).error === "string"
          ? (payload as { error: string }).error
          : null;

      if (!res.ok || !parsed) {
        setComments([]);
        setCommentsError(errMsg ?? "No se pudieron cargar los comentarios.");
        return;
      }
      setComments(parsed);
      if (!res.ok && errMsg) {
        setCommentsError(errMsg);
      }
    } catch {
      setComments([]);
      setCommentsError("Red o respuesta inválida al cargar comentarios.");
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    setCommentDraft("");
    setUploadFeedback(null);
    if (!open || !task?.id.trim()) return;
    const notionTaskOk = isLikelyNotionPageId(task.id);
    setComments([]);
    setCommentsError(null);
    if (!(persistedOnNotion && notionTaskOk)) {
      return undefined;
    }
    void loadComments(task.id);
    return undefined;
  }, [open, task?.id, persistedOnNotion, loadComments]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submitComment(taskPageId: string) {
    const text = commentDraft.trim();
    if (!text || postingComment) return;
    setPostingComment(true);
    setCommentsError(null);
    try {
      const res = await fetch(`/api/notion/tasks/${encodeURIComponent(taskPageId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "No se pudo publicar el comentario.";
        setCommentsError(msg);
        return;
      }
      setCommentDraft("");
      await loadComments(taskPageId);
    } finally {
      setPostingComment(false);
    }
  }

  async function uploadAttachedFile(taskPageId: string, file: File) {
    setUploadFeedback(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/notion/tasks/${encodeURIComponent(taskPageId)}/files`, {
        method: "POST",
        body: fd,
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "No se pudo subir el archivo a Notion.";
        setUploadFeedback({ type: "error", text: msg });
        return;
      }
      setUploadFeedback({ type: "ok", text: `«${file.name}» subido y añadido al cuerpo de la página en Notion.` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!open || !task) {
    return null;
  }

  const boardCol = sprintTaskKanbanColumnLabel(inferSprintTaskKanbanColumn(task.title));
  const nextTitle = applySprintTaskTitleForKanbanColumn(task.title, columnDraft);
  const notionTaskOk = isLikelyNotionPageId(task.id);
  const blockNotionWrite = persistedOnNotion && !notionTaskOk;
  const notionExtras = persistedOnNotion && notionTaskOk;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90vh,880px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15"
      >
        <div className="shrink-0 border-b border-slate-100 p-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-base font-bold text-slate-900">
              Tarea del sprint
            </h2>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>

          <p className="mt-3 text-sm font-medium leading-snug text-slate-800">{task.title}</p>
          {task.description?.trim() ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{task.description.trim()}</p>
          ) : null}

          <p className="mt-4 text-xs text-slate-500">
            Columna actual: <span className="font-semibold text-slate-700">{boardCol}</span>
          </p>

          <label className="mt-4 block rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
            <span id={`${titleId}-status`} className="text-sm font-semibold text-slate-800">
              Estado en el tablero
            </span>
            <select
              id={`${titleId}-status-select`}
              aria-labelledby={`${titleId}-status`}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400/30 disabled:opacity-50"
              value={columnDraft}
              disabled={saving}
              onChange={(e) => setColumnDraft(e.target.value as SprintTaskKanbanColumn)}
            >
              {SPRINT_TASK_KANBAN_COLUMN_ORDER.map((col) => (
                <option key={col} value={col}>
                  {sprintTaskKanbanColumnLabel(col)}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs leading-relaxed text-slate-600">
              {persistedOnNotion ? (
                <>
                  Al guardar, el título en Notion queda así: Pendiente sin prefijo,{" "}
                  <span className="font-mono">[~]</span> para en curso, <span className="font-mono">[x]</span> para
                  hecho (misma convención que el tablero del sprint).
                </>
              ) : (
                <>
                  Se actualiza el título sólo en el navegador en este equipo (proyectos sin sincronización Notion).
                </>
              )}
            </span>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-2">
          {notionExtras ? (
            <>
              <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-3 text-xs text-slate-700">
                <p className="font-semibold text-violet-950">Archivos en Notion</p>
                <p className="mt-1 leading-relaxed">
                  Sube hasta 20 MB por archivo; se enlaza como bloque archivo al pie del contenido de la página-tarea en
                  Notion.{" "}
                  {notionUrl ? (
                    <a
                      href={notionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-sky-800 underline decoration-sky-300 underline-offset-2 hover:text-sky-950"
                    >
                      Abrir en Notion
                    </a>
                  ) : null}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  accept="*/*"
                  disabled={uploading}
                  aria-label="Seleccionar archivo para subir"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && task?.id) void uploadAttachedFile(task.id, f);
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  className="mt-3 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-950 hover:bg-violet-50 disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? "Subiendo…" : "Elegir archivo y subir"}
                </button>
                {uploadFeedback ? (
                  <p
                    className={`mt-2 text-xs font-medium ${uploadFeedback.type === "ok" ? "text-emerald-800" : "text-rose-700"}`}
                    role="status"
                  >
                    {uploadFeedback.text}
                  </p>
                ) : null}
              </div>

              <section className="mt-5" aria-labelledby="task-comments-heading">
                <h3 id="task-comments-heading" className="text-sm font-bold text-slate-900">
                  Comentarios (Notion)
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  La API de Notion solo devuelve comentarios <strong className="text-slate-600">abiertos</strong> en esta
                  página.
                </p>
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-2">
                  {commentsLoading ? (
                    <p className="px-1 py-3 text-center text-xs text-slate-500">Cargando…</p>
                  ) : comments.length === 0 ? (
                    <p className="px-1 py-3 text-center text-xs text-slate-500">Sin comentarios activos aquí.</p>
                  ) : (
                    <ul className="space-y-3">
                      {comments.map((c) => (
                        <li key={c.id} className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {c.authorLabel} · {fmtCommentDate(c.createdAt)}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-800">{c.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <label className="mt-3 block">
                  <span className="sr-only">Nuevo comentario</span>
                  <textarea
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    rows={3}
                    placeholder="Escribe un comentario visible en Notion..."
                    maxLength={12_000}
                    value={commentDraft}
                    disabled={postingComment}
                    onChange={(e) => setCommentDraft(e.target.value)}
                  />
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={postingComment || commentDraft.trim().length === 0}
                    className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
                    onClick={() => {
                      const id = task.id.trim();
                      if (id) void submitComment(id);
                    }}
                  >
                    {postingComment ? "Publicando…" : "Publicar comentario"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    disabled={commentsLoading || postingComment}
                    onClick={() => {
                      const id = task.id.trim();
                      if (id) void loadComments(id);
                    }}
                  >
                    Actualizar
                  </button>
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-3 text-xs text-amber-950">
              {persistedOnNotion ? (
                <>
                  <p>
                    Esta fila no es una página Notion válida; no puedo subir archivos ni sincronizar comentarios hasta
                    que la relación en Notion enlace una página de tareas con UUID.
                  </p>
                  <p className="mt-2">
                    Revisa enlaces desde <span className="font-semibold">Editar proyecto: {project.name}</span>.
                  </p>
                </>
              ) : (
                <>
                  <p>Las subtidas y comentarios en Notion solo aplican cuando el proyecto sincroniza con Notion.</p>
                  <p className="mt-2">En proyectos sólo navegador usa Notion enlazando el proyecto desde la configuración IT.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 p-6 pt-4">
          {saveError ? (
            <p className="mb-3 text-xs font-medium text-rose-700" role="alert">
              {saveError}
            </p>
          ) : null}

          {commentsError ? (
            <p className="mb-3 text-xs font-medium text-amber-900" role="status">
              {commentsError}
            </p>
          ) : null}

          {blockNotionWrite ? (
            <p className="mb-3 text-xs font-medium text-rose-800" role="status">
              No se puede guardar el estado desde aquí: la fila debe ser una página Notion válida enlazada al proyecto
              para mutar el título vía API.
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={saving || uploading || postingComment}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={
                saving || uploading || postingComment || nextTitle.trim() === task.title.trim() || blockNotionWrite
              }
              onClick={() => onSave(nextTitle)}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
