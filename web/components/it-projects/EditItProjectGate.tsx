"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useResolvedItProject } from "@/hooks/useResolvedItProject";
import { EditItProjectForm } from "@/components/it-projects/EditItProjectForm";

function EditSkeleton() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mx-auto max-w-2xl h-[32rem] animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
    </div>
  );
}

/** Página cliente: espera proyecto y monta formulario para id ruta `[id]/edit`. */
export function EditItProjectGate({ id }: { id: string }) {
  const { loading, project } = useResolvedItProject(id);

  if (loading) {
    return <EditSkeleton />;
  }
  if (!project) {
    notFound();
  }

  const backHref = `/proyectos/${encodeURIComponent(id)}`;

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm font-medium text-sky-800 transition hover:bg-sky-50 hover:text-sky-950"
        >
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
          Volver al proyecto
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Editar proyecto</h1>
        <p className="mt-2 text-sm text-slate-600">
          Actualiza datos del proyecto. Los proyectos enlazados a Notion se sincronizan al guardar.
        </p>
      </div>
      <EditItProjectForm initialProject={project} key={project.id} />
    </div>
  );
}
