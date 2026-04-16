import { existsSync } from "node:fs";
import { config } from "dotenv";
import { cwd } from "node:process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Carpeta `api/` (donde vive este paquete). */
const apiRootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Raíz del monorepo (padre de `api/`). */
const repoRootDir = resolve(apiRootDir, "..");

const repoEnvPath = join(repoRootDir, ".env");
const apiEnvPath = join(apiRootDir, ".env");
const repoEnvResolved = resolve(repoEnvPath);
const apiEnvResolved = resolve(apiEnvPath);

export let repoEnvLoaded = false;
export let apiEnvLoaded = false;
/** Archivos .env realmente cargados (rutas absolutas). */
export const loadedEnvFilePaths: string[] = [];

/**
 * Carga en orden: raíz del repo → cwd/.env → api/.env (este último gana en claves repetidas).
 * Así la clave nueva en `api/.env` no la pisa un `N8N_API_KEY` viejo en la raíz.
 *
 * Usamos `override: true` en cada archivo para que los `.env` **sí** reemplacen variables
 * ya presentes en `process.env` (p. ej. `N8N_API_KEY` heredada de Windows o del IDE).
 * Sin esto, la primera carga con `override: false` no aplicaba el `.env` si el sistema
 * ya definía la misma clave — el sync fallaba con 401 y `diagnose-n8n` parecía “funcionar”.
 */
function collectEnvPaths(): string[] {
  const candidates = [
    resolve(repoEnvPath),
    resolve(join(cwd(), ".env")),
    resolve(apiEnvPath),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of candidates) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

let anyLoaded = false;
for (const absPath of collectEnvPaths()) {
  if (!existsSync(absPath)) continue;
  config({ path: absPath, override: true });
  anyLoaded = true;
  loadedEnvFilePaths.push(absPath);
  const r = resolve(absPath);
  if (r === repoEnvResolved) repoEnvLoaded = true;
  if (r === apiEnvResolved) apiEnvLoaded = true;
}

if (!anyLoaded) {
  console.warn(
    `[env] No se encontró ningún .env. Crea el archivo en:\n  - ${apiEnvPath}\n  - ${repoEnvPath}`,
  );
} else {
  console.log(`[env] Archivos .env cargados (${loadedEnvFilePaths.length}):\n  ${loadedEnvFilePaths.join("\n  ")}`);
}

/**
 * Vuelve a leer los mismos `.env` en orden (repo → cwd → api).
 * Útil si editaste `api/.env` y no quieres reiniciar el proceso; el sync lo llama antes de n8n/Make.
 */
export function refreshEnvFromDisk(): void {
  for (const absPath of collectEnvPaths()) {
    if (!existsSync(absPath)) continue;
    config({ path: absPath, override: true });
  }
}

export { apiEnvPath, repoEnvPath };
