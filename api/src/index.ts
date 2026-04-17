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
  setProjectOwner,
  setProjectPhase,
} from "./services/projectService.js";
import { listAutomationsQuerySchema } from "./validation.js";
import {
  listProjectsQuerySchema,
  parseHealthFilter,
  parseOwnersFilter,
  parsePlatformFilter,
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

app.get("/api/projects/summary", (_req, res, next) => {
  try {
    res.json(getPortfolioSummary());
  } catch (err) {
    next(err);
  }
});

app.get("/api/projects", (req, res, next) => {
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
    const result = listProjects(query, owners, health, platforms);
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

app.patch("/api/projects/:id/owner", (req, res, next) => {
  try {
    const body = patchProjectOwnerBodySchema.parse(req.body);
    const result = setProjectOwner(req.params.id, body.ownerCode);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/projects/:id/owner", (req, res, next) => {
  try {
    const result = clearProjectOwnerOverride(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.patch("/api/projects/:id/phase", (req, res, next) => {
  try {
    const body = patchProjectPhaseBodySchema.parse(req.body);
    const result = setProjectPhase(req.params.id, body.phase);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/projects/:id/phase", (req, res, next) => {
  try {
    const result = clearProjectPhaseOverride(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get("/api/projects/:id", (req, res, next) => {
  try {
    const result = getProjectByIdWithMeta(req.params.id);
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
