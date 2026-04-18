import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">No encontramos esa página</h1>
        <p className="mt-2 text-sm text-slate-600">
          El recurso pudo moverse o el enlace es incorrecto.
        </p>
        <Link
          href="/workflows"
          className="mt-6 inline-flex rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Ir a workflows
        </Link>
      </div>
    </div>
  );
}
