import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(apiDir, "..");
const example = join(apiDir, ".env.example");
const target = join(apiDir, ".env");
const rootEnv = join(repoRoot, ".env");

if (existsSync(target)) {
  console.log("[setup-env] Ya existe:", target);
  process.exit(0);
}
if (existsSync(rootEnv)) {
  console.log(
    "[setup-env] Ya tienes .env en la raíz del repo; no se creó api/.env para no duplicar.\n  Raíz:",
    rootEnv,
  );
  process.exit(0);
}
if (!existsSync(example)) {
  console.error("[setup-env] Falta:", example);
  process.exit(1);
}
copyFileSync(example, target);
console.log("[setup-env] Creado", target, "— edita las claves y reinicia la API.");
