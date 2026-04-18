/**
 * Importa a Supabase todos los proyectos que la app lee desde JSON fusionado
 * (projects.json + external-projects.json + overrides en projectStore).
 *
 * Uso: cd api && npx tsx scripts/import-workflows-to-supabase.ts
 *
 * Por defecto borra workflows + tablas puente y vuelve a insertar.
 * Añade `--append` para intentar solo upsert sin borrar (avanzado).
 */
import "../src/loadEnv.js";
import { deriveAutomationPlatform } from "../src/automationPlatform.js";
import type { ProjectRecord } from "../src/projectTypes.js";
import { readMergedProjectsFromJson } from "../src/projectStore.js";
import { getSupabaseServerClient } from "../src/supabase/client.js";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

async function loadPlataformaIds(
  sb: ReturnType<typeof getSupabaseServerClient>,
): Promise<Map<string, string>> {
  const { data, error } = await sb.from("plataformas").select("id, nombre");
  if (error) throw new Error("plataformas: " + error.message);
  const m = new Map<string, string>();
  for (const row of data ?? []) {
    const n = String((row as { nombre: string }).nombre).toLowerCase().trim();
    m.set(n, (row as { id: string }).id);
  }
  return m;
}

async function loadResponsableIds(
  sb: ReturnType<typeof getSupabaseServerClient>,
): Promise<Map<string, string>> {
  const { data, error } = await sb.from("responsables").select("id, codigo");
  if (error) throw new Error("responsables: " + error.message);
  const m = new Map<string, string>();
  for (const row of data ?? []) {
    m.set((row as { codigo: string }).codigo, (row as { id: string }).id);
  }
  return m;
}

async function ensureTecnologiaIds(
  sb: ReturnType<typeof getSupabaseServerClient>,
  names: Iterable<string>,
): Promise<Map<string, string>> {
  const unique = [...new Set([...names].map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const map = new Map<string, string>();
  for (const nombre of unique) {
    const { data: found } = await sb.from("tecnologias").select("id").eq("nombre", nombre).maybeSingle();
    if (found?.id) {
      map.set(nombre, found.id);
      continue;
    }
    const { data: ins, error } = await sb.from("tecnologias").insert({ nombre }).select("id").single();
    if (error) {
      const { data: again } = await sb.from("tecnologias").select("id").eq("nombre", nombre).maybeSingle();
      if (again?.id) {
        map.set(nombre, again.id);
        continue;
      }
      throw new Error(`tecnologias insert "${nombre}": ${error.message}`);
    }
    map.set(nombre, ins.id as string);
  }
  return map;
}

function projectToWorkflowRow(
  p: ProjectRecord,
  responsableId: string,
): Record<string, unknown> {
  return {
    legacy_id: p.id,
    nombre: p.name,
    descripcion: p.description,
    valor: p.businessValue,
    responsable_id: responsableId,
    estatus: p.health,
    categoria: p.category ?? "",
    fase: p.phase,
    complejidad: p.complexity,
    pasos: p.steps,
    cronograma: p.schedule ?? "",
    progreso: p.progress,
    tasa_fallo: p.failureRate,
    nota_riesgo: p.riskNote,
    etiqueta_salud: p.healthLabel,
    owner_override_id: null,
    fase_override: null,
  };
}

async function wipeWorkflowData(sb: ReturnType<typeof getSupabaseServerClient>): Promise<void> {
  const { error: e1 } = await sb
    .from("workflow_plataformas")
    .delete()
    .neq("workflow_id", ZERO_UUID);
  if (e1) throw new Error("delete workflow_plataformas: " + e1.message);
  const { error: e2 } = await sb
    .from("workflow_tecnologias")
    .delete()
    .neq("workflow_id", ZERO_UUID);
  if (e2) throw new Error("delete workflow_tecnologias: " + e2.message);
  const { error: e3 } = await sb.from("workflows").delete().neq("id", ZERO_UUID);
  if (e3) throw new Error("delete workflows: " + e3.message);
}

async function main(): Promise<void> {
  const projects = readMergedProjectsFromJson();
  console.log(`Proyectos en JSON (fusionados): ${projects.length}`);

  const sb = getSupabaseServerClient();
  const plataformaByNombre = await loadPlataformaIds(sb);
  const responsableByCodigo = await loadResponsableIds(sb);

  const ja = responsableByCodigo.get("JA");
  const ev = responsableByCodigo.get("EV");
  if (!ja || !ev) {
    throw new Error("Faltan filas en responsables (JA y EV). Ejecuta la migración SQL en Supabase.");
  }

  const allTechNames = new Set<string>();
  for (const p of projects) {
    for (const t of p.technologies ?? []) {
      const x = t.trim();
      if (x) allTechNames.add(x);
    }
  }
  const techIdByNombre = await ensureTecnologiaIds(sb, allTechNames);
  console.log(`Tecnologías referenciadas (catálogo): ${techIdByNombre.size}`);

  const append = process.argv.includes("--append");
  if (!append) {
    console.log("Limpiando workflows y tablas puente…");
    await wipeWorkflowData(sb);
  }

  const WORK_BATCH = 100;
  let insertedTotal = 0;

  for (let i = 0; i < projects.length; i += WORK_BATCH) {
    const chunk = projects.slice(i, i + WORK_BATCH);
    const rows = chunk.map((p) => projectToWorkflowRow(p, p.ownerCode === "JA" ? ja : ev));

    const { data: inserted, error } = await sb.from("workflows").insert(rows).select("id, legacy_id");
    if (error) {
      let hint =
        "Si falla enum `estatus`, ejecuta supabase/migrations/20260418120000_workflows_estatus_text.sql\n";
      if (String(error.message).includes("workflows_responsable_id_fkey")) {
        hint =
          "La FK `responsable_id` apunta a otra tabla, no a `public.responsables`. " +
          "Ejecuta en Supabase SQL Editor: supabase/migrations/20260418130000_workflows_responsable_fk.sql\n";
      }
      throw new Error(`insert workflows (lote ${i}-${i + chunk.length}): ${error.message}\n${hint}`);
    }

    const byLegacy = new Map(
      (inserted ?? []).map((r) => [(r as { legacy_id: string | null }).legacy_id, (r as { id: string }).id]),
    );

    const wpRows: { workflow_id: string; plataforma_id: string }[] = [];
    const wtRows: { workflow_id: string; tecnologia_id: string }[] = [];
    const seenWp = new Set<string>();

    for (const p of chunk) {
      const wid = byLegacy.get(p.id);
      if (!wid) {
        console.warn("No se obtuvo id para legacy_id=", p.id);
        continue;
      }
      const platKey = deriveAutomationPlatform(p);
      const platId = plataformaByNombre.get(platKey.toLowerCase());
      if (platId) {
        const k = `${wid}:${platId}`;
        if (!seenWp.has(k)) {
          seenWp.add(k);
          wpRows.push({ workflow_id: wid, plataforma_id: platId });
        }
      } else {
        console.warn("Plataforma no en catálogo:", platKey, "proyecto", p.id);
      }
      const techSeen = new Set<string>();
      for (const tn of p.technologies ?? []) {
        const key = tn.trim();
        if (!key) continue;
        const tid = techIdByNombre.get(key);
        if (!tid) continue;
        const pair = `${wid}:${tid}`;
        if (techSeen.has(pair)) continue;
        techSeen.add(pair);
        wtRows.push({ workflow_id: wid, tecnologia_id: tid });
      }
    }

    const chunkInsert = async (table: string, rows: { workflow_id: string; plataforma_id?: string; tecnologia_id?: string }[], size: number) => {
      for (let j = 0; j < rows.length; j += size) {
        const slice = rows.slice(j, j + size);
        const { error: e } = await sb.from(table).insert(slice);
        if (e) throw new Error(`${table}: ${e.message}`);
      }
    };

    if (wpRows.length) await chunkInsert("workflow_plataformas", wpRows, 500);
    if (wtRows.length) await chunkInsert("workflow_tecnologias", wtRows, 500);

    insertedTotal += inserted?.length ?? 0;
    console.log(`  Insertados ${insertedTotal} / ${projects.length}…`);
  }

  const { count } = await sb.from("workflows").select("*", { count: "exact", head: true });
  console.log(`Hecho. Total filas en workflows: ${count ?? insertedTotal}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
