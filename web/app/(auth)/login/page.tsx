import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center text-slate-500 shadow-lg ring-1 ring-slate-200">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
