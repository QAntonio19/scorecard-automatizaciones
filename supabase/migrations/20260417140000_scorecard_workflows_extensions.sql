-- Extensiones para alinear `workflows` con el scorecard (API Express / front).
-- Ejecuta en Supabase → SQL Editor si no usas CLI de migraciones.
-- Ajusta el FK de responsables si tu tabla `workflows` ya apunta a otro esquema.

CREATE TABLE IF NOT EXISTS public.responsables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE CHECK (codigo IN ('JA', 'EV')),
  nombre text NOT NULL
);

INSERT INTO public.responsables (codigo, nombre) VALUES
  ('JA', 'Juan Antonio'),
  ('EV', 'Evelyn')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS legacy_id text,
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fase text NOT NULL DEFAULT 'por_iniciar',
  ADD COLUMN IF NOT EXISTS complejidad integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS pasos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cronograma text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS progreso integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasa_fallo numeric,
  ADD COLUMN IF NOT EXISTS nota_riesgo text,
  ADD COLUMN IF NOT EXISTS etiqueta_salud text,
  ADD COLUMN IF NOT EXISTS owner_override_id uuid REFERENCES public.responsables (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fase_override text;

CREATE UNIQUE INDEX IF NOT EXISTS workflows_legacy_id_key ON public.workflows (legacy_id)
WHERE legacy_id IS NOT NULL;

COMMENT ON COLUMN public.workflows.legacy_id IS 'Id estable del scorecard (p.ej. n8n-xxx o proj-008); si falta, se usa workflows.id::text';
COMMENT ON COLUMN public.workflows.owner_override_id IS 'Responsable manual; si NULL, aplica responsable_id';
COMMENT ON COLUMN public.workflows.fase_override IS 'Fase manual; si NULL, aplica fase';
