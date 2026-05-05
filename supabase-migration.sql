-- Eliminar tablas relacionadas con workflows
DROP TABLE IF EXISTS workflow_tecnologias CASCADE;
DROP TABLE IF EXISTS workflow_plataformas CASCADE;
DROP TABLE IF EXISTS tecnologias CASCADE;
DROP TABLE IF EXISTS plataformas CASCADE;
DROP TABLE IF EXISTS responsables CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;

-- Crear tabla base para proyectos (Opcional, en caso de querer migrar o guardar datos de Notion aquí)
CREATE TABLE IF NOT EXISTS it_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    phase TEXT CHECK (phase IN ('estrategia', 'planificacion', 'ejecucion', 'cierre', 'archivado')) DEFAULT 'ejecucion',
    sponsor TEXT,
    pm_name TEXT,
    start_date DATE,
    target_end_date DATE,
    risk_level TEXT CHECK (risk_level IN ('bajo', 'medio', 'alto')) DEFAULT 'bajo',
    urgency_level TEXT CHECK (urgency_level IN ('baja', 'media', 'alta')) DEFAULT 'media',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policies básicas si se usa Row Level Security
ALTER TABLE it_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "it_projects_select_all" 
    ON it_projects FOR SELECT 
    USING (true);

CREATE POLICY "it_projects_insert_authenticated" 
    ON it_projects FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "it_projects_update_authenticated" 
    ON it_projects FOR UPDATE 
    USING (auth.role() = 'authenticated');
