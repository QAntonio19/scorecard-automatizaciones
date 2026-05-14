"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

import { ItProjectCard } from "@/components/it-projects/ItProjectCard";
import { buildNotionPatchBodyPhaseOnly } from "@/lib/itProjectFormShared";
import {
  itPhaseTopBorderClass,
  phaseLabel,
} from "@/lib/itProjectPortfolio";
import type { ItProject, ItProjectPhase } from "@/lib/itProjectTypes";
import { isLikelyNotionPageId } from "@/lib/notionProjectFromPage";
import {
  invalidateNotionProjectsCache,
  notionPatchResponseToProject,
  refetchNotionProjectsListBestEffort,
  upsertNotionProjectInCache,
  upsertUserProject,
} from "@/lib/itProjectsLocalStore";

const DROP_ID_PREFIX = "it-phase-drop:";

function dropPhaseFromOverId(id: unknown): ItProjectPhase | null {
  if (typeof id !== "string" || !id.startsWith(DROP_ID_PREFIX)) return null;
  return id.slice(DROP_ID_PREFIX.length) as ItProjectPhase;
}

function DraggableProjectWrapper({
  project,
  draggingEnabled,
}: {
  project: ItProject;
  draggingEnabled: boolean;
}) {
  const dragId = `it-proj-drag:${project.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    disabled: !draggingEnabled,
    data: { project },
  });

  const card = <ItProjectCard project={project} phaseBorderOnCard={false} />;

  if (!draggingEnabled) {
    return card;
  }

  return (
    <div
      ref={setNodeRef}
      className={`touch-none outline-none ${draggingEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "[&>*]:invisible" : ""}`}
      {...listeners}
      {...attributes}
    >
      {card}
    </div>
  );
}

function KanbanColumn({
  phase,
  projects,
  draggingEnabled,
}: {
  phase: ItProjectPhase;
  projects: ItProject[];
  draggingEnabled: boolean;
}) {
  const colProjects = projects.filter((p) => p.phase === phase);
  const atRisk = colProjects.filter((p) => p.riskLevel === "alto").length;
  const suffix =
    phase === "ejecucion" && atRisk > 0 ? ` — ${atRisk} alto riesgo` : "";

  const { setNodeRef, isOver } = useDroppable({
    id: `${DROP_ID_PREFIX}${phase}`,
    data: { phase },
  });

  return (
    <section
      className={`flex min-h-0 max-h-[min(75vh,calc(100dvh-13rem))] flex-col rounded-xl border border-slate-200 bg-white shadow-sm ${itPhaseTopBorderClass(
        phase,
      )} border-t-4`}
    >
      <header className="shrink-0 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">
          {phaseLabel(phase)}{" "}
          <span className="font-semibold text-slate-500">
            / {colProjects.length}{" "}
            {colProjects.length === 1 ? "proyecto" : "proyectos"}
            {suffix}
          </span>
        </h2>
      </header>
      <div
        ref={setNodeRef}
        className={`flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch] ${
          isOver ? "rounded-b-xl bg-sky-50/50 ring-2 ring-inset ring-sky-300/60" : ""
        }`}
      >
        {colProjects.map((p) => (
          <DraggableProjectWrapper key={p.id} project={p} draggingEnabled={draggingEnabled} />
        ))}
        {colProjects.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-1 py-8 text-center text-xs text-slate-400">
            Sin proyectos en esta fase
          </p>
        ) : null}
      </div>
    </section>
  );
}

export type ItProjectsKanbanBoardProps = {
  projects: ItProject[];
  /** Orden izquierda → derecha; el padre construye columna Backlog/Archivo sólo si aplican. */
  columnPhases: readonly ItProjectPhase[];
  /** Permitir drag-and-drop entre columnas (Notion PATCH o proyecto local); requiere 2+ columnas visibles. */
  phaseDragAllowed?: boolean;
};

export function ItProjectsKanbanBoard({
  projects,
  columnPhases,
  phaseDragAllowed = false,
}: ItProjectsKanbanBoardProps) {
  const draggingEnabled = phaseDragAllowed && columnPhases.length > 1;
  const [activeProj, setActiveProj] = useState<ItProject | null>(null);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [optimisticPhaseById, setOptimisticPhaseById] = useState<
    Partial<Record<string, ItProjectPhase>>
  >({});

  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const projectsForBoard = useMemo(() => {
    if (Object.keys(optimisticPhaseById).length === 0) return projects;
    return projects.map((p) => {
      const o = optimisticPhaseById[p.id];
      return o !== undefined ? { ...p, phase: o } : p;
    });
  }, [projects, optimisticPhaseById]);

  useEffect(() => {
    setOptimisticPhaseById((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const id of keys) {
        const live = projects.find((p) => p.id === id);
        const want = prev[id];
        if (live && want !== undefined && live.phase === want) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 12 },
    }),
  );

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
        No hay proyectos con los filtros seleccionados.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => {
        setPhaseError(null);
        const p = e.active.data.current?.project;
        setActiveProj(typeof p?.id === "string" ? (p as ItProject) : null);
      }}
      onDragCancel={() => {
        setActiveProj(null);
      }}
      onDragEnd={(e: DragEndEvent) => {
        setActiveProj(null);
        const { active, over } = e;
        if (!draggingEnabled || !over?.id) return;

        const project = active.data.current?.project as ItProject | undefined;
        const nextPhase = dropPhaseFromOverId(over.id);

        if (!project?.id || !nextPhase || nextPhase === project.phase) {
          return;
        }

        const projectId = project.id;
        const latest = projectsRef.current.find((p) => p.id === projectId) ?? project;

        const displayedPhase =
          optimisticPhaseById[projectId] ?? latest.phase;
        if (nextPhase === displayedPhase) {
          return;
        }

        setOptimisticPhaseById((prev) => ({ ...prev, [projectId]: nextPhase }));

        void (async () => {
          try {
            if (isLikelyNotionPageId(latest.id)) {
              const body = buildNotionPatchBodyPhaseOnly(latest, nextPhase);
              const res = await fetch(`/api/notion/projects/${encodeURIComponent(latest.id)}`, {
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
                    : "No se pudo mover el proyecto en Notion.";
                setOptimisticPhaseById((prev) => {
                  const n = { ...prev };
                  delete n[projectId];
                  return n;
                });
                setPhaseError(msg);
                return;
              }

              const patched = notionPatchResponseToProject(payload);
              if (patched) {
                upsertNotionProjectInCache(patched);
              } else {
                invalidateNotionProjectsCache();
              }
              refetchNotionProjectsListBestEffort();
            } else {
              upsertUserProject({ ...latest, phase: nextPhase });
            }
          } catch {
            setOptimisticPhaseById((prev) => {
              const n = { ...prev };
              delete n[projectId];
              return n;
            });
            setPhaseError("Error de red al actualizar la fase.");
          }
        })();
      }}
    >
      <div className="space-y-3">
        {phaseError ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950"
          >
            {phaseError}{" "}
            <button
              type="button"
              className="ml-1 font-semibold text-amber-900 underline"
              onClick={() => setPhaseError(null)}
            >
              Cerrar
            </button>
          </div>
        ) : draggingEnabled ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Arrastra la tarjeta a otra columna: la fase cambia al soltar de inmediato; un clic sin arrastre sigue abriendo el
            proyecto.
          </p>
        ) : null}
      </div>

      <div
        className="mt-5 grid min-h-0 items-stretch gap-5"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))",
        }}
      >
        {columnPhases.map((phase) => (
          <KanbanColumn
            key={phase}
            phase={phase}
            projects={projectsForBoard}
            draggingEnabled={draggingEnabled}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeProj ? (
          <ItProjectCard project={activeProj} phaseBorderOnCard={false} renderMode="dragGhost" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
