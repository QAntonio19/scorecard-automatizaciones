import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-lg font-bold text-slate-900">No encontramos ese recurso</h1>
      <p className="mt-2 text-sm text-slate-600">Revisa la URL o vuelve al portafolio.</p>
      <Link
        href="/proyectos"
        className="mt-6 inline-flex rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
      >
        Ir a proyectos
      </Link>
    </div>
  );
}
