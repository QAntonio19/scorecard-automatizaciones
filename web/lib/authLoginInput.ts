import { z } from "zod";

/**
 * Credenciales de login: el envío es vía `signInWithPassword` (API HTTPS de Supabase Auth),
 * no hay SQL en esta app. Esta capa aplica límites, formato estricto y rechazo de
 * entradas anómalas (defensa en profundidad; mitiga abusos o payloads extraños).
 */
const badChars = (s: string) => s.includes("\0") || /[\r\n]/.test(s);

export const loginCredentialsSchema = z.object({
  email: z
    .string()
    .max(256, "El correo excede el límite permitido")
    .trim()
    .refine((s) => s.length > 0, "Ingresa un correo")
    .refine((s) => !badChars(s), "El correo contiene caracteres no permitidos")
    .pipe(z.string().email("Formato de correo no válido")),
  password: z
    .string()
    .min(1, "Ingresa la contraseña")
    .max(4096, "La contraseña excede el límite permitido")
    .refine((s) => !badChars(s), "La contraseña contiene caracteres no permitidos"),
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;

export function safeParseLoginCredentials(
  email: string,
  password: string,
): { ok: true; data: LoginCredentials } | { ok: false; errorMessage: string } {
  const r = loginCredentialsSchema.safeParse({ email, password });
  if (r.success) return { ok: true, data: r.data };
  const first = r.error.issues[0];
  return { ok: false, errorMessage: first?.message ?? "Datos no válidos" };
}
