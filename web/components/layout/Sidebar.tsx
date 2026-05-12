"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconBriefcase, IconPanel, IconUsers } from "@/components/icons/NavIcons";
import { DeploymentChangelogModal } from "@/components/layout/DeploymentChangelogModal";
import { SidebarUserBlock } from "@/components/layout/SidebarUserBlock";
import { getCurrentVersion } from "@/lib/deploymentChangelog";

const nav = [
  { href: "/panel", label: "Panel", Icon: IconPanel },
  { href: "/proyectos", label: "Proyectos", Icon: IconBriefcase },
  { href: "/proyectos/responsables", label: "Responsables", Icon: IconUsers },
] as const;

function sidebarNavActive(href: string, pathname: string): boolean {
  if (pathname === href) return true;
  if (href === "/proyectos/responsables") return false;
  if (href === "/proyectos") {
    if (!pathname.startsWith("/proyectos/")) return false;
    return !pathname.startsWith("/proyectos/responsables");
  }
  if (href === "/panel") return false;
  return pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  Icon,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.JSX.Element;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = sidebarNavActive(href, pathname);
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={() => onNavigate?.()}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-sky-50 text-sky-800 ring-1 ring-sky-100"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      } ${collapsed ? "justify-center px-2" : ""}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
          active ? "bg-white text-sky-700 shadow-sm" : "bg-slate-100 text-slate-500"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  );
}

export function Sidebar({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const [changelogOpen, setChangelogOpen] = useState(false);
  const currentVersion = getCurrentVersion();

  return (
    <aside
      className={`flex h-full min-h-0 max-h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      <div className={`flex items-center gap-3 border-b border-slate-100 p-4 ${collapsed ? "justify-center px-2" : ""}`}>
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-indigo-600 to-sky-500 shadow-sm ring-2 ring-white">
          <span className="flex h-full w-full items-center justify-center text-sm font-bold tracking-tight text-white">
            E1
          </span>
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">ExpertizITAI</p>
            <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
              Proyectos ITAI
            </p>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <p
          className={`mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 ${
            collapsed ? "sr-only" : ""
          }`}
        >
          Navegación
        </p>
        <nav className="space-y-1">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>

      <div
        className={`mt-auto shrink-0 space-y-3 border-t border-slate-100 p-3 pb-4 ${collapsed ? "px-2" : ""}`}
      >
        <SidebarUserBlock collapsed={collapsed} />
        <div className={collapsed ? "flex justify-center" : ""}>
          <button
            type="button"
            title="Historial de versiones y despliegues"
            onClick={() => setChangelogOpen(true)}
            className="inline-flex rounded-lg bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 ring-1 ring-sky-100 transition hover:bg-sky-100 hover:ring-sky-200"
          >
            v{currentVersion}
          </button>
        </div>
      </div>

      <DeploymentChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </aside>
  );
}
