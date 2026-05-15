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
      className={`flex min-h-0 max-h-[min(75vh,calc(100dvh-13rem))] flex-col rounded-2xl border border-slate-100 bg-slate-50/50 shadow-sm ${itPhaseTopBorderClass(
        phase,
      )} border-t-4 overflow-hidden`}
    >
      <header className="shrink-0 border-b border-slate-200/50 px-5 py-4 bg-white/40">
        <h2 className="text-sm font-black tracking-tight text-slate-800 flex items-center justify-between">
          <span>{phaseLabel(phase)}</span>
          <span className="inline-flex items-center justify-center rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200/60">
            {colProjects.length}
          </span>
        </h2>
        {suffix ? <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mt-1.5">{suffix.replace(' — ', '')}</p> : null}
      </header>
      <div
        ref={setNodeRef}
        className={`flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch] transition-colors ${
          isOver ? "bg-sky-50/80 ring-2 ring-inset ring-sky-300/60" : ""
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
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center text-sm text-slate-500 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
           <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        </div>
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
