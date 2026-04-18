-- Repunta `workflows.responsable_id` hacia `public.responsables` (filas JA / EV).
-- Si la FK apuntaba a otra tabla (p. ej. auth.users), los UUID de responsables no coincidían y fallaba la importación.
ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_responsable_id_fkey;

ALTER TABLE public.workflows
  ADD CONSTRAINT workflows_responsable_id_fkey
  FOREIGN KEY (responsable_id) REFERENCES public.responsables (id) ON DELETE SET NULL;
