import Link from "next/link";
import { CreateItProjectForm } from "@/components/it-projects/CreateItProjectForm";

export default function NuevoProyectoPage() {
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/proyectos"
          className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm font-medium text-sky-800 transition hover:bg-sky-50 hover:text-sky-950"
        >
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
          Volver a proyectos
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Nuevo proyecto</h1>
        <p className="mt-2 text-sm text-slate-600">
          Registra una iniciativa para verla en el tablero Kanban y en el listado filtrable.
        </p>
      </div>

      <CreateItProjectForm />
    </div>
  );
}
