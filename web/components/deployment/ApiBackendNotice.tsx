"use client";

/**
 * Mensajes cuando la API no está configurada o no responde (p. ej. Vercel sin env o API caída).
 */
export function ApiBackendMissingEnv() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-amber-950 shadow-sm">
      <h1 className="text-xl font-bold tracking-tight">Falta la URL de la API</h1>
      <p className="mt-3 text-sm leading-relaxed text-amber-900/90">
        En producción el servidor no puede usar <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">localhost</code>.
        En Vercel:{" "}
        <strong className="font-semibold">Project → Settings → Environment Variables</strong>, añade{" "}
        <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_API_URL</code> con la URL
        pública de tu API (sin barra final), por ejemplo{" "}
        <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">https://tu-api.onrender.com</code>.
        Guarda y vuelve a desplegar.
      </p>
    </div>
  );
}

export function ApiBackendUnreachable() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-rose-200 bg-rose-50 px-6 py-8 text-rose-950 shadow-sm">
      <h1 className="text-xl font-bold tracking-tight">No se pudo conectar con la API</h1>
      <p className="mt-3 text-sm leading-relaxed text-rose-900/90">
        Comprueba que <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_API_URL</code> apunte a
        un servicio accesible desde internet (HTTPS), que el despliegue de la API esté activo y que no haya firewall
        bloqueando a Vercel.
      </p>
    </div>
  );
}
