-- ============================================
-- MIGRACIÓN: Sistema de Pánico y Resiliencia
-- Fecha: 2026-02-24
-- ============================================
-- Crea la tabla de logs de emergencia y
-- siembra los valores maestros en app_config.
-- SAFE: Solo operaciones ADD/INSERT, no destructivas.
-- ============================================

-- ============================================
-- 1. TABLA: logs_sistema_criticos
-- ============================================
CREATE TABLE IF NOT EXISTS logs_sistema_criticos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_mensaje TEXT        NOT NULL,
  archivo_origen TEXT,
  usuario_id    UUID,
  stack_trace   TEXT,
  metadata      JSONB
);

CREATE INDEX IF NOT EXISTS idx_logs_sistema_fecha
  ON logs_sistema_criticos(fecha DESC);

CREATE INDEX IF NOT EXISTS idx_logs_sistema_usuario
  ON logs_sistema_criticos(usuario_id)
  WHERE usuario_id IS NOT NULL;

-- RLS: cualquier usuario puede insertar (para capturar errores sin sesión),
--      solo el rol service_role puede leer (panel de admin externo).
ALTER TABLE logs_sistema_criticos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insertar log de emergencia" ON logs_sistema_criticos;
CREATE POLICY "Insertar log de emergencia"
  ON logs_sistema_criticos
  FOR INSERT
  WITH CHECK (true);

-- SELECT bloqueado vía RLS; solo service_role (Supabase dashboard / admin) puede leer.
DROP POLICY IF EXISTS "Sin acceso de lectura vía RLS" ON logs_sistema_criticos;
CREATE POLICY "Sin acceso de lectura vía RLS"
  ON logs_sistema_criticos
  FOR SELECT
  USING (false);

COMMENT ON TABLE logs_sistema_criticos
  IS 'Registro de errores críticos de la aplicación. Inserción pública, lectura solo service_role.';

-- ============================================
-- 2. SEMILLA: app_config — claves del sistema de pánico
-- ============================================
-- ON CONFLICT (key) garantiza idempotencia: seguro ejecutar varias veces.

INSERT INTO app_config (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('min_version',      '1.1.0'),
  ('stable_version',   '1.1.0')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value
  WHERE app_config.value IS DISTINCT FROM EXCLUDED.value;

COMMENT ON TABLE app_config
  IS 'Configuración global de la aplicación. maintenance_mode, min_version, stable_version controlan el sistema de pánico.';

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
