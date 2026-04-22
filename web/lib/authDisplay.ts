import type { User } from "@supabase/supabase-js";

/** Texto y avatar a partir de Auth + user_metadata o email. */
export function getUserDisplayInfo(user: User | null): {
  name: string;
  title: string;
  initial: string;
} {
  if (!user) {
    return { name: "Invitado", title: "Sin sesión", initial: "?" };
  }
  const meta = user.user_metadata as Record<string, string | undefined> | undefined;
  const name =
    (typeof meta?.nombre === "string" && meta.nombre.trim()) ||
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    user.email?.split("@")[0] ||
    "Usuario";
  const title =
    (typeof meta?.rol === "string" && meta.rol.trim()) ||
    (typeof meta?.cargo === "string" && meta.cargo.trim()) ||
    (typeof meta?.puesto === "string" && meta.puesto.trim()) ||
    "Equipo ITAI";
  const initial = name.slice(0, 1).toUpperCase();
  return { name, title, initial };
}
