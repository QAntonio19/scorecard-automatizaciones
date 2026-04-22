-- Tabla de usuarios de aplicación (perfiles operativos).
-- Opcionalmente enlazada a auth.users cuando el usuario exista en Supabase Auth.
-- Ejecuta en Supabase → SQL Editor o: supabase db push (si usas CLI).

CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correo text NOT NULL,
  nombre text NOT NULL,
  rol text NOT NULL DEFAULT 'lector' CHECK (rol IN ('admin', 'editor', 'lector')),
  activo boolean NOT NULL DEFAULT true,
  auth_user_id uuid UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_correo_key UNIQUE (correo)
);

COMMENT ON TABLE public.usuarios IS 'Usuarios de la app (ITAI / scorecard); correo único; auth_user_id opcional.';

COMMENT ON COLUMN public.usuarios.auth_user_id IS 'Enlace a auth.users cuando el usuario use Supabase Auth.';

CREATE OR REPLACE FUNCTION public.usuarios_touch_actualizado_en()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS usuarios_set_actualizado_en ON public.usuarios;
CREATE TRIGGER usuarios_set_actualizado_en
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE PROCEDURE public.usuarios_touch_actualizado_en();

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_select_authenticated"
  ON public.usuarios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "usuarios_insert_service"
  ON public.usuarios
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "usuarios_update_service"
  ON public.usuarios
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
