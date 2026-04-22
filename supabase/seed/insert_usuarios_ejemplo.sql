-- Inserta 3 usuarios de ejemplo (idempotente).
-- Requiere haber aplicado: migrations/20260421120000_create_usuarios.sql
-- Ejecuta en Supabase → SQL Editor (rol postgres / sin RLS en editor).

INSERT INTO public.usuarios (correo, nombre, rol, activo) VALUES
  ('evazquez@expertizdigital.com', 'Edgar (Líder ITAI)', 'admin', true),
  ('itai@expertizdigital.com', 'Equipo ITAI)', 'admin', true),
  ('gcruz@gcl-global.com', 'Evelyn (PM)', 'editor', true),
  ('jlabrada@expertizdigital.com', 'Operaciones scorecard', 'lector', true)
ON CONFLICT (correo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo,
  actualizado_en = now();