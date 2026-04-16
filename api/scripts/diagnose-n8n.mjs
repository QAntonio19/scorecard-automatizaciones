/**
 * Prueba la API de n8n con las mismas variables que usa el servidor.
 * Uso (desde la raíz del repo): npm run diagnose-n8n -w api
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath } from "node:url";

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(apiRoot, "..");

for (const p of [resolve(repoRoot, ".env"), resolve(cwd(), ".env"), resolve(apiRoot, ".env")]) {
  if (!existsSync(p)) continue;
  config({ path: p, override: true });
}

function norm(s) {
  let x = String(s).trim();
  if (x.charCodeAt(0) === 0xfeff) x = x.slice(1).trim();
  if ((x.startsWith('"') && x.endsWith('"')) || (x.startsWith("'") && x.endsWith("'"))) {
    x = x.slice(1, -1).trim();
  }
  return x;
}

const baseRaw = process.env.N8N_API_BASE_URL?.trim();
const keyRaw = process.env.N8N_API_KEY;
const key = keyRaw ? norm(keyRaw) : "";

if (!baseRaw || !key) {
  console.error("[diagnose-n8n] Faltan N8N_API_BASE_URL o N8N_API_KEY en .env");
  process.exit(1);
}

let base = baseRaw.replace(/\/$/, "");
if (!/^https?:\/\//i.test(base)) base = `https://${base}`;

const url = `${base}/api/v1/workflows?limit=1`;
console.log("[diagnose-n8n] URL:", url);
console.log("[diagnose-n8n] Longitud de la clave (caracteres):", key.length);

async function tryHeaders(name, headers) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  return { name, status: res.status, bodyPreview: text.slice(0, 400) };
}

const r1 = await tryHeaders("X-N8N-API-KEY", {
  "X-N8N-API-KEY": key,
  Accept: "application/json",
});
console.log("\n[1]", r1.name, "→ HTTP", r1.status);
if (r1.status !== 200) console.log("    Cuerpo:", r1.bodyPreview);

if (r1.status === 401) {
  const r2 = await tryHeaders("Authorization: Bearer", {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  });
  console.log("\n[2]", r2.name, "→ HTTP", r2.status);
  if (r2.status !== 200) console.log("    Cuerpo:", r2.bodyPreview);
}

if (r1.status === 200) {
  console.log("\n[OK] n8n respondió 200. La clave y la URL son válidas para este entorno.");
  process.exit(0);
}

console.log(
  "\n[AYUDA] Si ambos intentos dan 401: la instancia rechaza la clave (no es un tema de plan Pro en sí).",
);
console.log("  - Comprueba que no tengas otra línea N8N_API_KEY en otro .env que se cargue después.");
console.log("  - En Enterprise, la clave debe tener permiso de lectura de workflows.");
process.exit(1);
