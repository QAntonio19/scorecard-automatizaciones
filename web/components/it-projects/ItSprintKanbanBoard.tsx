"use client";

import {
  SPRINT_TASK_KANBAN_COLUMN_ORDER,
  inferSprintTaskKanbanColumn,
  sprintTaskKanbanColumnLabel,
  sprintTaskKanbanColumnTopBorderClass,
  type SprintTaskKanbanColumn,
} from "@/lib/itProjectScopeProgress";
import type { ItProjectPlannedTask } from "@/lib/itProjectTypes";

function SprintTaskCard({ task }: { task: ItProjectPlannedTask }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm">
      <p className="font-medium leading-snug text-slate-900">{task.title}</p>
      {task.description?.trim() ? (
        <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-slate-600">{task.description.trim()}</p>
      ) : null}
    </div>
  );
}

function SprintKanbanColumn({
  column,
  tasks,
}: {
  column: SprintTaskKanbanColumn;
  tasks: ItProjectPlannedTask[];
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
          <SprintTaskCard key={t.id} task={t} />
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
};

export function ItSprintKanbanBoard({ tasks }: ItSprintKanbanBoardProps) {
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
        Todavía no hay tareas asignadas a este sprint desde el proyecto (enlaza la relación sprint en las filas de tareas en Notion).
      </div>
    );
  }

  return (
    <div
      className="grid min-h-0 items-stretch gap-5"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))",
      }}
    >
      {SPRINT_TASK_KANBAN_COLUMN_ORDER.map((col) => (
        <SprintKanbanColumn key={col} column={col} tasks={byCol[col]} />
      ))}
    </div>
  );
}
