#!/usr/bin/env node
/**
 * Comprueba variables y conectividad con Supabase (sin imprimir secretos).
 * Uso: desde la carpeta `api/`: npm run check:supabase
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");
const repoRoot = resolve(apiRoot, "..");

const paths = [
  join(repoRoot, ".env"),
  join(process.cwd(), ".env"),
  join(apiRoot, ".env"),
  join(apiRoot, ".env.local"),
  join(repoRoot, ".env.local"),
];
const seen = new Set();
for (const p of paths) {
  const abs = resolve(p);
  if (seen.has(abs)) continue;
  seen.add(abs);
  if (existsSync(abs)) {
    config({ path: abs, override: true });
  }
}

const url =
  process.env.SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

console.log("--- Comprobación Supabase (scorecard API) ---\n");

if (process.env.PROJECTS_DATA_MODE?.trim().toLowerCase() !== "supabase") {
  console.warn(
    "⚠️  PROJECTS_DATA_MODE no es 'supabase'. Añade en api/.env:\n   PROJECTS_DATA_MODE=supabase\n",
  );
} else {
  console.log("✓ PROJECTS_DATA_MODE=supabase\n");
}

if (!url) {
  console.error("✗ Falta la URL del proyecto Supabase.\n");
  const hint = [
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  ];
  console.log("Variables buscadas (debe existir al menos la URL):");
  for (const k of [...hint, "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
    const ok = Boolean(process.env[k]?.trim());
    console.log("  " + k + ": " + (ok ? "definida" : "(vacía)"));
  }
  console.log(
    "\nAsegúrate de que api/.env o la raíz del repo tengan NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n",
  );
  process.exit(1);
}
console.log("✓ URL de Supabase definida (" + new URL(url).host + ")\n");

if (!key) {
  console.error(
    "✗ Falta una clave (p. ej. SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)\n",
  );
  process.exit(1);
}
console.log("✓ Clave API definida (longitud: " + key.length + " caracteres)\n");

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function tableCount(name) {
  const { count, error } = await sb.from(name).select("*", { count: "exact", head: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: count ?? 0 };
}

const tables = [
  "responsables",
  "workflows",
  "plataformas",
  "tecnologias",
  "workflow_plataformas",
  "workflow_tecnologias",
];

console.log("Filas por tabla:");
let failed = false;
for (const t of tables) {
  const r = await tableCount(t);
  if (!r.ok) {
    console.log("  " + t + ": ERROR — " + r.error);
    failed = true;
  } else {
    console.log("  " + t + ": " + r.count);
  }
}

if (failed) {
  console.log(
    "\nSi ves errores de permiso (RLS), usa SUPABASE_SERVICE_ROLE_KEY en el servidor.",
  );
  console.log(
    "Si falta una tabla, crea el esquema en Supabase (SQL Editor) con el archivo:\n  supabase/migrations/20260417140000_scorecard_workflows_extensions.sql\n",
  );
  process.exit(1);
}

console.log("\n✓ Conexión y lectura básicas OK.");
console.log(
  "Siguiente: arranca la API (npm run dev -w api) y prueba GET /api/projects\n",
);
process.exit(0);
