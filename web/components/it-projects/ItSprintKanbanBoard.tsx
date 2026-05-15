"use client";

import { useCallback, useEffect, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { SprintTaskDetailModal } from "@/components/it-projects/SprintTaskDetailModal";
import { buildNotionPersistBodyUpdatingOneSprintTask } from "@/lib/itProjectFormShared";
import type { ItProject, ItProjectPlannedTask } from "@/lib/itProjectTypes";
import {
  invalidateNotionProjectsCache,
  notionPatchResponseToProject,
  upsertNotionProjectInCache,
  upsertUserProject,
} from "@/lib/itProjectsLocalStore";
import {
  plannedTaskCanonicalTitle,
  resolvedSprintTaskKanbanColumn,
  SPRINT_TASK_KANBAN_COLUMN_ORDER,
  sprintTaskKanbanColumnLabel,
  sprintTaskKanbanColumnTopBorderClass,
  type SprintTaskKanbanColumn,
} from "@/lib/itProjectScopeProgress";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";

function mergeProjectPlannedTaskSprintState(
  project: ItProject,
  taskId: string,
  opts: { title: string; sprintBoardColumn: SprintTaskKanbanColumn },
): ItProject {
  const nextTitle = opts.title.trim().slice(0, 2000);
  return {
    ...project,
    plannedTasks: project.plannedTasks.map((t) =>
      t.id === taskId ? { ...t, title: nextTitle, sprintBoardColumn: opts.sprintBoardColumn } : t,
    ),
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
      className="w-full rounded-xl border border-slate-100 bg-white p-4 text-left text-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
    >
      <span className="sr-only">Abrir detalle de tarea:</span>
      <p className="font-medium leading-snug text-slate-900">{plannedTaskCanonicalTitle(task.title)}</p>
      {task.description?.trim() ? (
        <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-slate-600">{task.description.trim()}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-2 py-1 transition-colors group-hover:bg-sky-50 group-hover:border-sky-100">
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${task.assigneeName?.trim() ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
              {task.assigneeName?.trim() ? task.assigneeName.trim().charAt(0).toUpperCase() : '?'}
          </span>
          <span className={`text-[10px] font-medium truncate ${task.assigneeName?.trim() ? 'text-slate-600 group-hover:text-sky-700' : 'text-slate-400'}`}>
              {task.assigneeName?.trim() || "Sin responsable"}
          </span>
        </div>
        {task.targetDate?.trim() ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-100 px-2 py-1 transition-colors group-hover:bg-orange-100">
            <svg className="h-3 w-3 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] font-semibold text-orange-700">
              {(() => {
                const parts = task.targetDate.trim().split("-");
                if (parts.length !== 3) return task.targetDate.trim();
                const d = parseInt(parts[2], 10);
                const m = parseInt(parts[1], 10);
                if (isNaN(d) || isNaN(m) || m < 1 || m > 12) return task.targetDate.trim();
                const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return `${d} ${months[m - 1]}`;
              })()}
            </span>
          </div>
        ) : null}
      </div>
      <p className="sr-only">
        Pulse para marcar estado, enlazar archivos en Notion o guardar desde el navegador.
      </p>
    </button>
  );
}

function DraggableSprintTaskCard({
  task,
  onOpen,
}: {
  task: ItProjectPlannedTask;
  onOpen: (task: ItProjectPlannedTask) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      className={`touch-none cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
      {...attributes}
      {...listeners}
    >
      <SprintTaskCard task={task} onOpen={onOpen} />
    </div>
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
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column}`,
  });

  return (
    <section
      className={`flex min-h-0 max-h-[min(75vh,calc(100dvh-14rem))] flex-col rounded-2xl border border-slate-100 bg-slate-50/50 shadow-sm ${border} border-t-4 overflow-hidden ${
        isOver ? "ring-2 ring-indigo-500 ring-offset-2" : ""
      }`}
    >
      <header className="shrink-0 border-b border-slate-200/50 px-5 py-4 bg-white/40">
        <h2 className="text-sm font-black tracking-tight text-slate-800 flex items-center justify-between">
          <span>{sprintTaskKanbanColumnLabel(column)}</span>
          <span className="inline-flex items-center justify-center rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200/60">
            {tasks.length}
          </span>
        </h2>
      </header>
      <div ref={setNodeRef} className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain p-4 [-webkit-overflow-scrolling:touch]">
        {tasks.map((t) => (
          <DraggableSprintTaskCard key={t.id} task={t} onOpen={onOpenTask} />
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
  const [dndError, setDndError] = useState<string | null>(null);

  const [activeTask, setActiveTask] = useState<ItProjectPlannedTask | null>(null);

  const [optimisticColById, setOptimisticColById] = useState<Record<string, SprintTaskKanbanColumn>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 12 },
    }),
  );

  useEffect(() => {
    setOptimisticColById((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const id of keys) {
        const live = tasks.find((t) => t.id === id);
        const want = prev[id];
        if (live && want !== undefined && resolvedSprintTaskKanbanColumn(live) === want) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tasks]);

  const onDragStart = (e: DragStartEvent) => {
    const task = e.active.data.current?.task as ItProjectPlannedTask | undefined;
    setActiveTask(task ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over?.id) return;

    const task = active.data.current?.task as ItProjectPlannedTask | undefined;
    if (!task) return;

    const nextColStr = String(over.id).replace("col-", "");
    const nextCol = nextColStr as SprintTaskKanbanColumn;
    const currentResolved = resolvedSprintTaskKanbanColumn(task);
    const displayedCol = optimisticColById[task.id] ?? currentResolved;

    if (nextCol === displayedCol) return;

    setDndError(null);
    setOptimisticColById((prev) => ({ ...prev, [task.id]: nextCol }));

    void (async () => {
      try {
        if (!isLikelyNotionPageId(project.id)) {
          upsertUserProject(mergeProjectPlannedTaskSprintState(project, task.id, { title: task.title, sprintBoardColumn: nextCol }));
          return;
        }

        if (!isLikelyNotionPageId(task.id)) {
          setOptimisticColById((prev) => {
            const n = { ...prev };
            delete n[task.id];
            return n;
          });
          setDndError("La tarea no se puede arrastrar (falta Notion ID).");
          return;
        }

        const body = buildNotionPersistBodyUpdatingOneSprintTask(project, task.id, {
          title: task.title,
          sprintBoardColumn: nextCol,
        });

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
              : "No se pudo mover la tarea en Notion.";
          setOptimisticColById((prev) => {
            const n = { ...prev };
            delete n[task.id];
            return n;
          });
          setDndError(msg);
          return;
        }

        const patched = notionPatchResponseToProject(payload);
        const merged = patched !== null ? mergeProjectPlannedTaskSprintState(patched, task.id, { title: task.title, sprintBoardColumn: nextCol }) : null;
        if (merged) {
          upsertNotionProjectInCache(merged);
        } else {
          invalidateNotionProjectsCache();
        }
      } catch {
        setOptimisticColById((prev) => {
          const n = { ...prev };
          delete n[task.id];
          return n;
        });
        setDndError("Error de red al actualizar la columna.");
      }
    })();
  };

  const persistTaskSprintColumn = useCallback(
    async (taskId: string, opts: { title: string; sprintBoardColumn: SprintTaskKanbanColumn }) => {
      setSaveError(null);
      setSavingTitle(true);
      try {
        const trimmed = opts.title.trim().slice(0, 2000);

        if (!isLikelyNotionPageId(project.id)) {
          upsertUserProject(mergeProjectPlannedTaskSprintState(project, taskId, { title: trimmed, sprintBoardColumn: opts.sprintBoardColumn }));
          setOverlayTask(null);
          return;
        }

        if (!isLikelyNotionPageId(taskId)) {
          setSaveError(
            "La tarea debe ser una página de Notion válida para actualizar desde el tablero. Edita desde el proyecto o en Notion.",
          );
          return;
        }

        const body = buildNotionPersistBodyUpdatingOneSprintTask(project, taskId, {
          title: trimmed,
          sprintBoardColumn: opts.sprintBoardColumn,
        });

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
        const merged =
          patched !== null
            ? mergeProjectPlannedTaskSprintState(patched, taskId, {
                title: trimmed,
                sprintBoardColumn: opts.sprintBoardColumn,
              })
            : null;
        if (merged) {
          upsertNotionProjectInCache(merged);
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
    const col = optimisticColById[t.id] ?? resolvedSprintTaskKanbanColumn(t);
    byCol[col].push(t);
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-12 text-center text-sm text-slate-500 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 mb-4">
           <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2v1M12 12h.01M12 16h.01" /></svg>
        </div>
        Todavía no hay tareas asignadas a este sprint desde el proyecto (enlaza la relación sprint en las filas de
        tareas en Notion).
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="space-y-3 mb-4">
          {dndError ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950"
            >
              {dndError}{" "}
              <button
                type="button"
                className="ml-1 font-semibold text-amber-900 underline"
                onClick={() => setDndError(null)}
              >
                Cerrar
              </button>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Arrastra la tarea a otra columna para cambiar su estado; un clic normal abre sus detalles.
            </p>
          )}
        </div>

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
      
      <DragOverlay dropAnimation={null}>
        {activeTask ? <SprintTaskCard task={activeTask} onOpen={() => {}} /> : null}
      </DragOverlay>
    </DndContext>

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
        onSave={(opts) => {
          const id = overlayTask?.id.trim() ?? "";
          if (!id) return;
          void persistTaskSprintColumn(id, opts);
        }}
      />
    </>
  );
}
