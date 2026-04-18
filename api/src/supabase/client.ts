import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase para la API (servidor). Usa la clave publishable/anon si no hay service role.
 * En producción conviene `SUPABASE_SERVICE_ROLE_KEY` (solo servidor) para evitar límites de RLS.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (cached) return cached;
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase no configurado: define SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y una clave (service role, anon o publishable).",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function resetSupabaseClientForTests(): void {
  cached = null;
}
