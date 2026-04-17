"use client";

import dynamic from "next/dynamic";
import type { ProjectRecord } from "@/lib/projectTypes";

const KanbanBoard = dynamic(
  () => import("@/components/proyectos/KanbanBoard").then((mod) => ({ default: mod.KanbanBoard })),
  {
    ssr: false,
    loading: () => (
      <div
        className="grid min-h-[min(420px,70vh)] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        aria-hidden
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    ),
  },
);

export function KanbanBoardDynamic({ projects }: { projects: ProjectRecord[] }) {
  return <KanbanBoard projects={projects} />;
}
