"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { useCanEdit } from "@/hooks/useCanEdit";
import { phaseLabel, workflowPhaseTopBorderClass } from "@/lib/phaseLabels";
import { getApiBaseUrl } from "@/lib/projectsApi";
import type { ProjectPhase, ProjectRecord } from "@/lib/projectTypes";
import { ProjectKanbanCard } from "@/components/proyectos/ProjectKanbanCard";

const phases: ProjectPhase[] = [
  "backlog",
  "por_iniciar",
  "en_proceso",
  "terminados",
  "archivado",
];

const PHASE_SET = new Set<ProjectPhase>(phases);

function resolveDropPhase(overId: string, items: ProjectRecord[]): ProjectPhase | null {
  if (PHASE_SET.has(overId as ProjectPhase)) return overId as ProjectPhase;
  const target = items.find((p) => p.id === overId);
  return target ? target.phase : null;
}

async function patchProjectPhase(projectId: string, phase: ProjectPhase): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/projects/${encodeURIComponent(projectId)}/phase`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phase }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
}

function DraggableKanbanCard({ project, canEdit }: { project: ProjectRecord; canEdit: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    disabled: !canEdit,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : undefined,
    touchAction: "none" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl ${canEdit ? "touch-none" : ""}`}
      {...(canEdit ? listeners : {})}
      {...(canEdit ? attributes : {})}
    >
      <ProjectKanbanCard project={project} />
    </div>
  );
}

function KanbanColumn({
  col,
  projects,
  canEdit,
}: {
  col: ProjectPhase;
  projects: ProjectRecord[];
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col });
  const colProjects = projects.filter((p) => p.phase === col);
  const atRisk = colProjects.filter((p) => p.health === "en_riesgo").length;
  const suffix =
    col === "en_proceso" && atRisk > 0 ? ` — ${atRisk} en riesgo` : "";

  return (
    <section
      className={`flex min-h-0 max-h-[min(75vh,calc(100dvh-13rem))] flex-col rounded-xl border border-slate-200 bg-white shadow-sm ${workflowPhaseTopBorderClass(
        col,
      )} border-t-4`}
    >
      <header className="shrink-0 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">
          {phaseLabel(col)}{" "}
          <span className="font-semibold text-slate-500">
            / {colProjects.length} {colProjects.length === 1 ? "flujo" : "flujos"}
            {suffix}
          </span>
        </h2>
      </header>
      <div
        ref={setNodeRef}
        className={`flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch] transition-colors ${
          isOver ? "bg-sky-50/60 ring-1 ring-inset ring-sky-200/80" : ""
        }`}
      >
        {colProjects.map((p) => (
          <DraggableKanbanCard key={p.id} project={p} canEdit={canEdit} />
        ))}
        {colProjects.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-1 py-8 text-center text-xs text-slate-400">
            Arrastra aquí
          </p>
        ) : null}
      </div>
    </section>
  );
}

type Props = { projects: ProjectRecord[] };

export function KanbanBoard({ projects: initialProjects }: Props) {
  const canEdit = useCanEdit() ?? false;
  const router = useRouter();
  const dndTitleId = useId();
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
  );

  const activeProject = useMemo(
    () => (activeId ? projects.find((p) => p.id === activeId) : undefined),
    [activeId, projects],
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const projectId = String(active.id);
    const targetPhase = resolveDropPhase(String(over.id), projects);
    if (!targetPhase) return;

    const current = projects.find((p) => p.id === projectId);
    if (!current || current.phase === targetPhase) return;

    const previous = projects;
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, phase: targetPhase } : p)),
    );
    setError(null);
    setPending(true);
    try {
      await patchProjectPhase(projectId, targetPhase);
      router.refresh();
    } catch (e) {
      setProjects(previous);
      setError(e instanceof Error ? e.message : "No se pudo mover el flujo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <p id={dndTitleId} className="sr-only">
        Tablero Kanban: arrastra una tarjeta a otra columna para cambiar la fase del flujo.
      </p>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? (
        <p className="text-xs text-slate-500" aria-live="polite">
          Guardando…
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }: DragStartEvent) => setActiveId(String(active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        <div className="grid min-h-0 grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {phases.map((col) => (
            <KanbanColumn key={col} col={col} projects={projects} canEdit={canEdit} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeProject ? (
            <div className="cursor-grabbing rounded-xl shadow-lg ring-2 ring-sky-400/80">
              <ProjectKanbanCard project={activeProject} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
