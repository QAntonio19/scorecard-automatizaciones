"use client";

import { useEffect, useState } from "react";
import { canEditByEmail } from "@/lib/permissions";
import { createBrowserSupabaseClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";

/**
 * Hook que devuelve si el usuario actual tiene permiso de edición.
 *
 * - Sin Supabase configurado (desarrollo local): devuelve `true`.
 * - Con Supabase: devuelve `true` solo si el email del usuario está en EDITOR_PREFIXES.
 * - Mientras resuelve la sesión: devuelve `null` (indeterminate) para evitar
 *   flashes de UI. Los componentes deben ocultar controles de edición mientras sea null.
 */
export function useCanEdit(): boolean | null {
  const [canEdit, setCanEdit] = useState<boolean | null>(() =>
    isSupabaseAuthConfigured() ? null : true,
  );

  useEffect(() => {
    if (!isSupabaseAuthConfigured()) {
      setCanEdit(true);
      return;
    }

    const supabase = createBrowserSupabaseClient();

    void supabase.auth.getUser().then(({ data: { user } }) => {
      setCanEdit(canEditByEmail(user?.email));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCanEdit(canEditByEmail(session?.user?.email ?? null));
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return canEdit;
}
