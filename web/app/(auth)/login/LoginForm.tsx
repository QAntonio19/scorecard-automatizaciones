"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { safeParseLoginCredentials } from "@/lib/authLoginInput";
import { createBrowserSupabaseClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";

const DEFAULT_NEXT = "/proyectos";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = (() => {
    const n = searchParams.get("next");
    if (n && n.startsWith("/")) return n;
    return DEFAULT_NEXT;
  })();

  const urlError = searchParams.get("error");
  const errorHint =
    urlError === "config"
      ? "Falta configurar Supabase (variables NEXT_PUBLIC) en el entorno del frontend."
      : urlError === "auth"
        ? "No se pudo completar el inicio de sesión. Revisa el enlace o vuelve a intentarlo."
        : null;

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!isSupabaseAuthConfigured()) {
        setError("Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        return;
      }
      const parsed = safeParseLoginCredentials(email, password);
      if (!parsed.ok) {
        setError(parsed.errorMessage);
        return;
      }
      setSubmitting(true);
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error: signError } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (signError) {
          setError(signError.message);
          return;
        }
        if (data.session) {
          await router.replace(nextPath);
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al iniciar sesión");
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, nextPath, router],
  );

  if (!isSupabaseAuthConfigured()) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">
          Añade en <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">web/.env.local</code> las
          variables <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (panel de
          Supabase → Settings → API). Reinicia el servidor de desarrollo después de guardar.
        </p>
        {errorHint ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-100">
            {errorHint}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
      <h1 className="text-center text-2xl font-bold text-slate-900">ExpertizITAI</h1>
      <p className="mt-1 text-center text-sm text-slate-500">Acceso a Workflows ITAI</p>

      {errorHint ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-100">
          {errorHint}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={256}
            required
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 ring-sky-200 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={4096}
            required
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 ring-sky-200 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
