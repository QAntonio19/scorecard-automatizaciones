"use client";

import { useEffect, useState } from "react";
import { IconMenu } from "@/components/icons/NavIcons";
import { Sidebar } from "@/components/layout/Sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      if (mq.matches) setMobileOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /** Despierta el API Express en cuanto el layout monta (evita cold-start al cargar el panel). */
  useEffect(() => {
    void fetch("/api/warmup", { method: "GET", cache: "no-store" }).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-40 flex max-h-[100dvh] lg:static lg:z-0 lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:shrink-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } transition-transform duration-200`}
      >
        <Sidebar collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(true)}
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 lg:inline-flex"
            aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
            onClick={() => setCollapsed((v) => !v)}
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
