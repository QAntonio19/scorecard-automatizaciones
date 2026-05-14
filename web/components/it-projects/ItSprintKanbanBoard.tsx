"use client";

import { useCallback, useState } from "react";

import { SprintTaskDetailModal } from "@/components/it-projects/SprintTaskDetailModal";
import { buildNotionPersistBodyUpdatingOneTaskTitle } from "@/lib/itProjectFormShared";
import type { ItProject, ItProjectPlannedTask } from "@/lib/itProjectTypes";
import {
  invalidateNotionProjectsCache,
  notionPatchResponseToProject,
  upsertNotionProjectInCache,
  upsertUserProject,
} from "@/lib/itProjectsLocalStore";
import {
  SPRINT_TASK_KANBAN_COLUMN_ORDER,
  inferSprintTaskKanbanColumn,
  sprintTaskKanbanColumnLabel,
  sprintTaskKanbanColumnTopBorderClass,
  type SprintTaskKanbanColumn,
} from "@/lib/itProjectScopeProgress";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";

function mergeProjectPlannedTaskTitle(project: ItProject, taskId: string, title: string): ItProject {
  const next = title.trim().slice(0, 2000);
  return {
    ...project,
    plannedTasks: project.plannedTasks.map((t) => (t.id === taskId ? { ...t, title: next } : t)),
  };
}

function SprintTaskCard({
  task,
  onOpen,
}: {
  task: ItProjectPlannedTask;
  onOpen: (task: ItProjectPlannedTask) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-sky-300/80 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    >
      <span className="sr-only">Abrir detalle de tarea:</span>
      <p className="font-medium leading-snug text-slate-900">{task.title}</p>
      {task.description?.trim() ? (
        <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-slate-600">{task.description.trim()}</p>
      ) : null}
      <p className="sr-only">
        Pulse para marcar estado, enlazar archivos en Notion o guardar desde el navegador.
      </p>
    </button>
  );
}

function SprintKanbanColumn({
  column,
  tasks,
  onOpenTask,
}: {
  column: SprintTaskKanbanColumn;
  tasks: ItProjectPlannedTask[];
  onOpenTask: (task: ItProjectPlannedTask) => void;
}) {
  const border = sprintTaskKanbanColumnTopBorderClass(column);

  return (
    <section
      className={`flex min-h-0 max-h-[min(75vh,calc(100dvh-14rem))] flex-col rounded-xl border border-slate-200 bg-white shadow-sm ${border} border-t-4`}
    >
      <header className="shrink-0 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">
          {sprintTaskKanbanColumnLabel(column)}{" "}
          <span className="font-semibold text-slate-500">
            / {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
          </span>
        </h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch]">
        {tasks.map((t) => (
          <SprintTaskCard key={t.id} task={t} onOpen={onOpenTask} />
        ))}
        {tasks.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-1 py-8 text-center text-xs text-slate-400">
            Sin tareas en esta columna
          </p>
        ) : null}
      </div>
    </section>
  );
}

export type ItSprintKanbanBoardProps = {
  tasks: ItProjectPlannedTask[];
  project: ItProject;
};

export function ItSprintKanbanBoard({ tasks, project }: ItSprintKanbanBoardProps) {
  const [overlayTask, setOverlayTask] = useState<ItProjectPlannedTask | null>(null);
  const [savingTitle, setSavingTitle] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const persistTaskTitle = useCallback(
    async (taskId: string, nextTitle: string) => {
      setSaveError(null);
      setSavingTitle(true);
      try {
        const trimmed = nextTitle.trim().slice(0, 2000);

        if (!isLikelyNotionPageId(project.id)) {
          upsertUserProject(mergeProjectPlannedTaskTitle(project, taskId, trimmed));
          setOverlayTask(null);
          return;
        }

        if (!isLikelyNotionPageId(taskId)) {
          setSaveError(
            "La tarea debe ser una página de Notion válida para actualizar desde el tablero. Edita desde el proyecto o en Notion.",
          );
          return;
        }

        const body = buildNotionPersistBodyUpdatingOneTaskTitle(project, taskId, trimmed);

        const res = await fetch(`/api/notion/projects/${encodeURIComponent(project.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const payload: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof (payload as { error: unknown }).error === "string"
              ? (payload as { error: string }).error
              : "No se pudo guardar la tarea en Notion.";
          setSaveError(msg);
          return;
        }

        const patched = notionPatchResponseToProject(payload);
        if (patched) {
          upsertNotionProjectInCache(patched);
        } else {
          invalidateNotionProjectsCache();
        }
        setOverlayTask(null);
      } finally {
        setSavingTitle(false);
      }
    },
    [project],
  );

  const byCol: Record<SprintTaskKanbanColumn, ItProjectPlannedTask[]> = {
    pendiente: [],
    en_curso: [],
    hecho: [],
  };

  for (const t of tasks) {
    byCol[inferSprintTaskKanbanColumn(t.title)].push(t);
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 p-10 text-center text-sm text-slate-600">
        Todavía no hay tareas asignadas a este sprint desde el proyecto (enlaza la relación sprint en las filas de
        tareas en Notion).
      </div>
    );
  }

  return (
    <>
      <div
        className="grid min-h-0 items-stretch gap-5"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))",
        }}
      >
        {SPRINT_TASK_KANBAN_COLUMN_ORDER.map((col) => (
          <SprintKanbanColumn
            key={col}
            column={col}
            tasks={byCol[col]}
            onOpenTask={(t) => {
              setSaveError(null);
              setOverlayTask(t);
            }}
          />
        ))}
      </div>

      <SprintTaskDetailModal
        open={overlayTask !== null}
        task={overlayTask}
        project={project}
        persistedOnNotion={isLikelyNotionPageId(project.id)}
        saving={savingTitle}
        saveError={saveError}
        onClose={() => {
          setSaveError(null);
          setOverlayTask(null);
        }}
        onSave={(nextTitle) => {
          const id = overlayTask?.id.trim() ?? "";
          if (!id) return;
          void persistTaskTitle(id, nextTitle);
        }}
      />
    </>
  );
}
