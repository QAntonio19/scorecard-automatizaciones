import { redirect } from "next/navigation";

/** Cuando el middleware no aplica (sin variables Supabase), `/` debe llevar al panel. */
export default function Home() {
  redirect("/panel");
}
