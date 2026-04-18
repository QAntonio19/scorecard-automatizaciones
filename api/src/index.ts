import {
  apiEnvLoaded,
  apiEnvPath,
  loadedEnvFilePaths,
  repoEnvLoaded,
  repoEnvPath,
} from "./loadEnv.js";
import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { getAutomationById, listAutomations } from "./services/automationService.js";
import {
  getExternalSyncStatus,
  isExternalSyncEnabled,
  normalizeSecret,
  syncExternalProjects,
} from "./services/externalSyncService.js";
import {
  clearProjectOwnerOverride,
  clearProjectPhaseOverride,
  getPortfolioSummary,
  getProjectByIdWithMeta,
  listProjects,
  patchProjectDetails,
  setProjectOwner,
  setProjectPhase,
} from "./services/projectService.js";
import { listAutomationsQuerySchema } from "./validation.js";
import {
  listProjectsQuerySchema,
  parseHealthFilter,
  parseOwnersFilter,
  parsePlatformFilter,
  patchProjectDetailsBodySchema,
  patchProjectOwnerBodySchema,
  patchProjectPhaseBodySchema,
} from "./projectValidation.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? true,
  }),
);
app.use(express.json());

/** Raíz: evita "Cannot GET /" al abrir la URL del servicio en el navegador. */
app.get("/", (_req, res) => {
  res.type("html").send(
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Scorecard API</title></head><body style="font-family:system-ui;padding:1.5rem">
    <h1>API Scorecard</h1>
    <p>Servidor Express activo. Prueba <a href="/health">/health</a> o los endpoints bajo <code>/api/*</code>.</p>
    </body></html>`,
  );
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" as const });
});

app.get("/api/automations", (req, res, next) => {
  try {
    const query = listAutomationsQuerySchema.parse({
      status: req.query.status,
      q: req.query.q,
    });
    const result = listAutomations(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get("/api/automations/:id", (req, res, next) => {
  try {
    const result = getAutomationById(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get("/api/projects/summary", async (_req, res, next) => {
  try {
    res.json(await getPortfolioSummary());
  } catch (err) {
    next(err);
  }
});

app.get("/api/projects", async (req, res, next) => {
  try {
    const query = listProjectsQuerySchema.parse({
      owners: req.query.owners,
      health: req.query.health,
      platform: req.query.platform,
      category: req.query.category,
      q: req.query.q,
    });
    const owners = parseOwnersFilter(query.owners);
    const health = parseHealthFilter(query.health);
    const platforms = parsePlatformFilter(query.platform);
    const result = await listProjects(query, owners, health, platforms);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post("/api/projects/sync", async (_req, res, next) => {
  try {
    const result = await syncExternalProjects();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get("/api/projects/sync/status", (_req, res) => {
  res.json({
    enabled: isExternalSyncEnabled(),
    latest: getExternalSyncStatus(),
  });
});

/** Diagnóstico: rutas de .env y si existen las claves (sin mostrar valores). */
app.get("/api/projects/sync/env", (_req, res) => {
  res.json({
    processPid: process.pid,
    envFiles: {
      repo: { path: repoEnvPath, loaded: repoEnvLoaded },
      api: { path: apiEnvPath, loaded: apiEnvLoaded },
    },
    loadedEnvFilePaths,
    keysPresent: {
      N8N_API_BASE_URL: Boolean(process.env.N8N_API_BASE_URL?.trim()),
      N8N_API_KEY: Boolean(process.env.N8N_API_KEY?.trim()),
      MAKE_API_BASE_URL: Boolean(process.env.MAKE_API_BASE_URL?.trim()),
      MAKE_API_TOKEN: Boolean(process.env.MAKE_API_TOKEN?.trim()),
      MAKE_ORGANIZATION_ID: Boolean(process.env.MAKE_ORGANIZATION_ID?.trim()),
    },
    n8nKeyMeta: process.env.N8N_API_KEY
      ? {
          lengthAfterNormalize: normalizeSecret(process.env.N8N_API_KEY).length,
          startsWithEyJ: process.env.N8N_API_KEY.trim().startsWith("eyJ"),
        }
      : null,
  });
});

app.patch("/api/projects/:id/owner", async (req, res, next) => {
  try {
    const body = patchProjectOwnerBodySchema.parse(req.body);
    const result = await setProjectOwner(req.params.id, body.ownerCode);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/projects/:id/owner", async (req, res, next) => {
  try {
    const result = await clearProjectOwnerOverride(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.patch("/api/projects/:id/phase", async (req, res, next) => {
  try {
    const body = patchProjectPhaseBodySchema.parse(req.body);
    const result = await setProjectPhase(req.params.id, body.phase);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/projects/:id/phase", async (req, res, next) => {
  try {
    const result = await clearProjectPhaseOverride(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.patch("/api/projects/:id", async (req, res, next) => {
  try {
    const body = patchProjectDetailsBodySchema.parse(req.body);
    const result = await patchProjectDetails(req.params.id, body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get("/api/projects/:id", async (req, res, next) => {
  try {
    const result = await getProjectByIdWithMeta(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
  if (isExternalSyncEnabled()) {
    const intervalMs = Number(process.env.EXTERNAL_SYNC_INTERVAL_MS) || 300_000;
    void syncExternalProjects().catch((err: unknown) => {
      console.error("Error en sincronización inicial externa:", err);
    });
    setInterval(() => {
      void syncExternalProjects().catch((err: unknown) => {
        console.error("Error en sincronización externa:", err);
      });
    }, intervalMs);
    console.log(`Sincronización externa habilitada cada ${intervalMs}ms.`);
  }
});
