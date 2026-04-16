/**
 * Prueba la API de Make (Integromat) con las mismas variables que usa el servidor.
 * Uso (desde la raíz del repo): npm run diagnose-make -w api
 *
 * Token: perfil Make → API → crear token. La URL base (eu1, eu2, …) debe ser la de tu cuenta.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
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

const baseRaw =
  process.env.MAKE_API_BASE_URL?.trim() || "https://eu1.make.com/api/v2";
const tokenRaw = process.env.MAKE_API_TOKEN;
const orgRaw = process.env.MAKE_ORGANIZATION_ID?.trim();

const token = tokenRaw ? norm(tokenRaw) : "";

if (!token || /^replace_with_make_token$/i.test(token)) {
  console.error(
    "[diagnose-make] Configura MAKE_API_TOKEN en api/.env (Make → perfil → API → crear token).",
  );
  process.exit(1);
}

let base = baseRaw.replace(/\/$/, "");
if (!/^https?:\/\//i.test(base)) base = `https://${base}`;

const headers = {
  Authorization: `Token ${token}`,
  Accept: "application/json",
};

async function getJson(url) {
  const res = await fetch(url, { headers, redirect: "follow" });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, url: res.url };
}

console.log("[diagnose-make] Base:", base);

const orgsUrl = `${base}/organizations`;
const r1 = await getJson(orgsUrl);
console.log("\n[1] GET /organizations → HTTP", r1.status);
if (r1.status !== 200) {
  console.log("    Cuerpo:", typeof r1.body === "string" ? r1.body.slice(0, 500) : JSON.stringify(r1.body).slice(0, 500));
  console.log(
    "\n[AYUDA] 401: token inválido o región incorrecta (eu1 vs eu2 vs us1…). Debe coincidir con la URL al iniciar sesión en Make.",
  );
  process.exit(1);
}

const orgs = r1.body?.organizations ?? r1.body;
const list = Array.isArray(orgs) ? orgs : [];
const firstId = list[0]?.id ?? list[0]?.organizationId;
const orgId = orgRaw ? Number(orgRaw) : firstId != null ? Number(firstId) : NaN;

if (!Number.isFinite(orgId)) {
  console.error("[diagnose-make] No se pudo obtener organizationId. Define MAKE_ORGANIZATION_ID en .env.");
  process.exit(1);
}

const params = new URLSearchParams();
params.set("organizationId", String(orgId));
params.set("pg[limit]", "1");
params.set("pg[offset]", "0");
const scenUrl = `${base}/scenarios?${params.toString()}`;
const r2 = await getJson(scenUrl);
console.log("[diagnose-make] organizationId usado:", orgId);
console.log("\n[2] GET /scenarios (limit=1) → HTTP", r2.status);
if (r2.status !== 200) {
  console.log("    Cuerpo:", typeof r2.body === "string" ? r2.body.slice(0, 500) : JSON.stringify(r2.body).slice(0, 500));
  process.exit(1);
}

const count =
  Array.isArray(r2.body?.scenarios) ? r2.body.scenarios.length : Array.isArray(r2.body) ? r2.body.length : "?";
console.log("\n[OK] Make respondió correctamente. Escenarios en esta página:", count);
process.exit(0);
