"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconFolder, IconPanel, IconRocket } from "@/components/icons/NavIcons";

const nav = [
  { href: "/panel", label: "Panel", Icon: IconPanel },
  { href: "/proyectos", label: "Proyectos", Icon: IconFolder },
  { href: "/dev-framework", label: "Dev Framework", Icon: IconRocket },
] as const;

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
  const active = pathname === href || (href !== "/panel" && pathname.startsWith(href));
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
  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${
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

      <div className="flex-1 overflow-y-auto px-3 py-4">
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

      <div className={`mt-auto space-y-3 border-t border-slate-100 p-3 ${collapsed ? "px-2" : ""}`}>
        <div
          className={`flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100 ${
            collapsed ? "justify-center p-2" : ""
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-sm font-bold text-white ring-2 ring-sky-100">
            E
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">Edgar</p>
              <p className="truncate text-xs text-slate-500">Líder del Equipo ITAI</p>
            </div>
          ) : null}
        </div>
        <div className={collapsed ? "flex justify-center" : ""}>
          <span className="inline-flex rounded-lg bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 ring-1 ring-sky-100">
            v1.5
          </span>
        </div>
      </div>
    </aside>
  );
}
