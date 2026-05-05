-- =============================================================================
-- Supabase: proyectos + responsables + tecnologías
-- =============================================================================
-- • projects: modelo ItProject; FK opcional a responsables (responsable_id).
-- • tecnologias: catálogo; relación N:N con projects vía project_tecnologias.
-- • No toca public.usuarios ni auth.users.
--
-- ADVERTENCIA: al final se hace DROP de projects (y puente); respalda antes.
-- El catálogo tecnologias no se elimina en este script (CREATE IF NOT EXISTS).
-- Ejecución: Supabase → SQL Editor → Run.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Limpieza del modelo antiguo workflows (no borra public.tecnologias)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.project_tecnologias CASCADE;
DROP TABLE IF EXISTS public.workflow_tecnologias CASCADE;
DROP TABLE IF EXISTS public.workflow_plataformas CASCADE;
DROP TABLE IF EXISTS public.plataformas CASCADE;
DROP TABLE IF EXISTS public.workflows CASCADE;
DROP TABLE IF EXISTS public.it_projects CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;

-- -----------------------------------------------------------------------------
-- responsables (requerida como FK de projects)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.responsables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT,
    nombre TEXT
);

ALTER TABLE public.responsables ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE public.responsables ADD COLUMN IF NOT EXISTS nombre TEXT;

CREATE INDEX IF NOT EXISTS idx_responsables_codigo ON public.responsables (codigo);

COMMENT ON TABLE public.responsables IS
    'Personas/equipos responsables; projects.responsable_id apunta aquí; pm_name sigue siendo texto libre (p. ej. Notion).';

-- -----------------------------------------------------------------------------
-- tecnologias (catálogo)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tecnologias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL
);

ALTER TABLE public.tecnologias ADD COLUMN IF NOT EXISTS nombre TEXT;

CREATE INDEX IF NOT EXISTS idx_tecnologias_nombre ON public.tecnologias (nombre);

COMMENT ON TABLE public.tecnologias IS 'Catálogo de tecnologías vinculables a proyectos (N:N).';

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    phase TEXT NOT NULL DEFAULT 'sin_empezar'
        CHECK (
            phase IN (
                'backlog',
                'sin_empezar',
                'planificacion',
                'ejecucion',
                'cierre',
                'archivado'
            )
        ),
    sponsor TEXT NOT NULL DEFAULT '',
    pm_name TEXT NOT NULL DEFAULT '',
    responsable_id UUID
        REFERENCES public.responsables (id) ON DELETE SET NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_end_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    risk_level TEXT NOT NULL DEFAULT 'bajo'
        CHECK (risk_level IN ('bajo', 'medio', 'alto')),
    urgency_level TEXT NOT NULL DEFAULT 'media'
        CHECK (urgency_level IN ('baja', 'media', 'alta')),
    milestones JSONB NOT NULL DEFAULT '[]'::JSONB
        CHECK (JSONB_TYPEOF(milestones) = 'array'),
    notion_page_id TEXT UNIQUE,
    legacy_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_phase ON public.projects (phase);
CREATE INDEX idx_projects_pm_name ON public.projects (pm_name);
CREATE INDEX idx_projects_responsable_id ON public.projects (responsable_id)
    WHERE responsable_id IS NOT NULL;
CREATE INDEX idx_projects_legacy_id ON public.projects (legacy_id)
    WHERE legacy_id IS NOT NULL;

COMMENT ON TABLE public.projects IS
    'Portafolio IT: ItProject + responsable_id → responsables.';
COMMENT ON COLUMN public.projects.responsable_id IS 'Responsable canónico en BD; pm_name puede duplicar etiqueta visible.';
COMMENT ON COLUMN public.projects.notion_page_id IS 'Id de página Notion si sincronizas; opcional.';
COMMENT ON COLUMN public.projects.legacy_id IS 'Id previo para trazabilidad.';
COMMENT ON COLUMN public.projects.milestones IS
    'JSON [{ "id", "title", "dueDate", "done" }].';

-- -----------------------------------------------------------------------------
-- N:N projects ↔ tecnologias
-- -----------------------------------------------------------------------------
CREATE TABLE public.project_tecnologias (
    project_id UUID NOT NULL
        REFERENCES public.projects (id) ON DELETE CASCADE,
    tecnologia_id UUID NOT NULL
        REFERENCES public.tecnologias (id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, tecnologia_id)
);

CREATE INDEX idx_project_tecnologias_tecnologia ON public.project_tecnologias (tecnologia_id);

COMMENT ON TABLE public.project_tecnologias IS 'Relación muchos a muchos proyecto ↔ tecnología.';

-- -----------------------------------------------------------------------------
-- updated_at en projects
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_projects_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
            NEW.updated_at := NOW();
            RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_projects_updated_at();

-- Si falla: EXECUTE PROCEDURE public.touch_projects_updated_at();

-- -----------------------------------------------------------------------------
-- RLS (sin tocar usuarios)
-- -----------------------------------------------------------------------------
ALTER TABLE public.responsables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnologias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tecnologias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS responsables_authenticated_all ON public.responsables;
CREATE POLICY responsables_authenticated_all ON public.responsables
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tecnologias_authenticated_all ON public.tecnologias;
CREATE POLICY tecnologias_authenticated_all ON public.tecnologias
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS projects_authenticated_all ON public.projects;
CREATE POLICY projects_authenticated_all ON public.projects
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS project_tecnologias_authenticated_all ON public.project_tecnologias;
CREATE POLICY project_tecnologias_authenticated_all ON public.project_tecnologias
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- Fin
-- =============================================================================
-- Migración incremental (ya tienes projects en producción y no quieres DROP):
--   ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS responsable_id UUID
--     REFERENCES public.responsables(id) ON DELETE SET NULL;
--   CREATE INDEX IF NOT EXISTS idx_projects_responsable_id ON public.projects(responsable_id)
--     WHERE responsable_id IS NOT NULL;
-- =============================================================================
