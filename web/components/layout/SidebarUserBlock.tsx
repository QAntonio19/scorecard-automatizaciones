"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getUserDisplayInfo } from "@/lib/authDisplay";
import { createBrowserSupabaseClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";

type Display = { name: string; title: string; initial: string };

const FALLBACK: Display = {
  name: "Invitado",
  title: "Configura Supabase o inicia sesión",
  initial: "?",
};

export function SidebarUserBlock({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const [info, setInfo] = useState<Display | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseAuthConfigured()) {
      setInfo(FALLBACK);
      setSignedIn(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const sync = (user: Parameters<typeof getUserDisplayInfo>[0]) => {
      if (!user) {
        setInfo(FALLBACK);
        setSignedIn(false);
        return;
      }
      setInfo(getUserDisplayInfo(user));
      setSignedIn(true);
    };

    void supabase.auth.getUser().then(({ data: { user } }) => {
      sync(user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      sync(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSignOut = useCallback(async () => {
    if (!isSupabaseAuthConfigured()) return;
    setSigningOut(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      setInfo(FALLBACK);
      setSignedIn(false);
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [router]);

  const display = info ?? { name: "…", title: "Cargando", initial: "…" };

  return (
    <div
      className={`flex flex-col gap-2 ${collapsed ? "items-center" : ""} rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100`}
    >
      <div className={`flex items-center gap-3 ${collapsed ? "justify-center p-0" : ""}`}>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-bold text-white ring-2 ring-sky-100"
          aria-hidden
        >
          {display.initial}
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{display.name}</p>
            <p className="truncate text-xs text-slate-500">{display.title}</p>
          </div>
        ) : null}
      </div>
      {!collapsed && isSupabaseAuthConfigured() && signedIn ? (
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          {signingOut ? "Cerrando…" : "Cerrar sesión"}
        </button>
      ) : null}
    </div>
  );
}
