-- Convierte `workflows.estatus` de enum a text para aceptar activo / pausado / en_riesgo
-- (misma semántica que la app). Ejecuta en Supabase → SQL Editor antes de `npm run import:supabase`.
ALTER TABLE public.workflows
  ALTER COLUMN estatus TYPE text
  USING (estatus::text);
