/**
 * Control de permisos de escritura.
 *
 * Solo los usuarios cuyo prefijo de email (parte antes del @) coincida con
 * uno de los valores de EDITOR_PREFIXES pueden crear y editar contenido.
 * Los demás usuarios solo tienen acceso de lectura.
 *
 * Para añadir o quitar editores basta con modificar esta lista.
 */
export const EDITOR_PREFIXES = ["itai", "evazquez", "gclglobal"] as const;

/**
 * Devuelve true si el email tiene permiso de edición.
 * La comparación es insensible a mayúsculas y opera sobre el prefijo local (antes del @).
 */
export function canEditByEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const prefix = email.split("@")[0].toLowerCase();
  return (EDITOR_PREFIXES as readonly string[]).includes(prefix);
}
