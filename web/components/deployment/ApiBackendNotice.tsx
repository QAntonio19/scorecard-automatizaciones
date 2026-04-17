"use client";

/**
 * Mensajes cuando la API no está configurada o no responde (p. ej. Vercel sin env o API caída).
 */
export function ApiBackendMissingEnv() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-amber-950 shadow-sm">
      <h1 className="text-xl font-bold tracking-tight">Falta la URL de la API</h1>
      <p className="mt-2 text-sm font-medium text-amber-950/80">
        El frontend en Vercel ya está desplegado; esto es normal hasta que indiques dónde está el backend (Express en
        Render u otro host).
      </p>
      <p className="mt-3 text-sm leading-relaxed text-amber-900/90">
        En producción el servidor no puede usar <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">localhost</code>.
        En Vercel:{" "}
        <strong className="font-semibold">Project → Settings → Environment Variables</strong> y elige una opción:
      </p>
      <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-amber-900/90">
        <li>
          <strong className="font-semibold">Recomendado (proxy):</strong>{" "}
          <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">SCORECARD_API_ORIGIN</code> = URL de tu API
          Express (sin barra final), p. ej. <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">https://tu-api.onrender.com</code>.
          No hace falta <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_*</code>.
        </li>
        <li>
          <strong className="font-semibold">Directo al backend:</strong>{" "}
          <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_API_URL</code> con la misma URL
          (y CORS abierto en la API hacia tu dominio Vercel).
        </li>
      </ul>
      <p className="mt-3 text-sm text-amber-900/90">Guarda variables y vuelve a desplegar.</p>
    </div>
  );
}

export function ApiBackendUnreachable() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-rose-200 bg-rose-50 px-6 py-8 text-rose-950 shadow-sm">
      <h1 className="text-xl font-bold tracking-tight">No se pudo conectar con la API</h1>
      <p className="mt-3 text-sm leading-relaxed text-rose-900/90">
        Comprueba <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">SCORECARD_API_ORIGIN</code> o{" "}
        <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_API_URL</code>, que la API responda por
        HTTPS y que el servicio (p. ej. Render) esté activo.
      </p>
    </div>
  );
}
