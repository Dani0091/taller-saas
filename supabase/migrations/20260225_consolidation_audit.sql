-- ============================================================
-- SCRIPT DE CONSOLIDACIÓN — Auditoría comparativa 2026-02-25
-- Ejecutar en Supabase SQL Editor
-- IDEMPOTENTE: seguro de reejecutar (IF NOT EXISTS / OR REPLACE)
-- ============================================================
--
-- RESUMEN DE HALLAZGOS:
--
-- BUG CRÍTICO #1: trigger_auditoria_factura inserta en columnas que no
--   existen en auditoria_facturas (evento, estado_anterior, estado_nuevo,
--   cambios, motivo, created_by). El trigger falla silenciosamente en cada
--   INSERT/UPDATE de facturas. → FIX: añadir las columnas.
--
-- BUG CRÍTICO #2: check_factura_inmutable() referencia OLD.tipo,
--   OLD.porcentaje_retencion, OLD.estado_verifactu, OLD.verifactu_numero,
--   OLD.verifactu_url — ninguna existe. Provoca error en runtime al
--   intentar actualizar facturas ya emitidas/pagadas. → FIX: reescribir.
--
-- SEGURIDAD: 6 tablas sin RLS: series_factura, notificaciones,
--   uso_mensual, historial_cambios, documentos_procesados,
--   configuracion_taller.
--
-- ÍNDICES: faltan índices de rendimiento en clientes, ordenes y facturas
--   para las consultas más frecuentes de la app.
--
-- TIPO: taller_config.created_at / updated_at usan TIMESTAMP (sin TZ)
--   en vez de TIMESTAMPTZ como el resto de tablas.
-- ============================================================


-- ============================================================
-- PARTE 1 — FIX CRÍTICO: auditoria_facturas — columnas faltantes
-- El trigger trigger_auditoria_factura usa estos campos pero no existen.
-- ============================================================

ALTER TABLE auditoria_facturas
  ADD COLUMN IF NOT EXISTS evento          TEXT,
  ADD COLUMN IF NOT EXISTS estado_anterior TEXT,
  ADD COLUMN IF NOT EXISTS estado_nuevo    TEXT,
  ADD COLUMN IF NOT EXISTS cambios         JSONB,
  ADD COLUMN IF NOT EXISTS motivo          TEXT,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN auditoria_facturas.evento IS
  'Tipo de evento: creada | emitida | pagada | anulada | modificada';
COMMENT ON COLUMN auditoria_facturas.estado_anterior IS
  'Estado de la factura antes del cambio';
COMMENT ON COLUMN auditoria_facturas.estado_nuevo IS
  'Estado de la factura después del cambio';
COMMENT ON COLUMN auditoria_facturas.cambios IS
  'JSONB con {old: <fila_anterior>, new: <fila_nueva>}';
COMMENT ON COLUMN auditoria_facturas.motivo IS
  'Motivo de anulación u observaciones del cambio';
COMMENT ON COLUMN auditoria_facturas.created_by IS
  'Usuario que realizó el cambio (NULL = proceso automático)';


-- ============================================================
-- PARTE 2 — FIX CRÍTICO: check_factura_inmutable()
-- Reescritura eliminando referencias a columnas inexistentes:
--   OLD.tipo, OLD.porcentaje_retencion, OLD.estado_verifactu,
--   OLD.verifactu_numero, OLD.verifactu_url
-- Solo bloquea cambios en los 6 campos fiscales obligatorios.
-- ============================================================

CREATE OR REPLACE FUNCTION check_factura_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Solo aplica a facturas ya emitidas, pagadas o anuladas
  IF OLD.estado NOT IN ('emitida', 'pagada', 'anulada') THEN
    RETURN NEW;
  END IF;

  -- Transición permitida: emitida → pagada
  IF OLD.estado = 'emitida' AND NEW.estado = 'pagada' THEN
    RETURN NEW;
  END IF;

  -- Transición permitida: emitida → anulada (requiere motivo)
  IF OLD.estado = 'emitida'
     AND NEW.estado = 'anulada'
     AND NEW.motivo_anulacion IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Bloquear cambios en los campos fiscales inmutables
  IF (
    OLD.numero_factura IS DISTINCT FROM NEW.numero_factura OR
    OLD.cliente_id     IS DISTINCT FROM NEW.cliente_id     OR
    OLD.fecha_emision  IS DISTINCT FROM NEW.fecha_emision  OR
    OLD.base_imponible IS DISTINCT FROM NEW.base_imponible OR
    OLD.iva            IS DISTINCT FROM NEW.iva            OR
    OLD.total          IS DISTINCT FROM NEW.total
  ) THEN
    RAISE EXCEPTION 'No se puede modificar una factura emitida (normativa fiscal)'
      USING HINT    = 'Crea una factura rectificativa en su lugar',
            ERRCODE = '23P01';
  END IF;

  -- Resto de campos (VeriFACTU, huella_hash, updated_at, notas, etc.) → permitido
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_factura_inmutable() IS
  'Previene modificaciones fiscales en facturas emitidas. '
  'Fix 2026-02-25: eliminadas referencias a columnas inexistentes.';


-- ============================================================
-- PARTE 3 — RLS: series_factura
-- Tabla operacional usada por asignar_numero_factura_v2 (SECURITY
-- DEFINER → bypassa RLS) y por las rutas /api/series/*.
-- Sin RLS, una consulta directa cruzaría talleres.
-- ============================================================

ALTER TABLE series_factura ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven series de su taller" ON series_factura;
CREATE POLICY "Usuarios ven series de su taller"
  ON series_factura FOR SELECT
  USING (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Usuarios gestionan series de su taller" ON series_factura;
CREATE POLICY "Usuarios gestionan series de su taller"
  ON series_factura FOR ALL
  USING (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));

-- asignar_numero_factura_v2 es SECURITY DEFINER, no necesita este GRANT,
-- pero las rutas REST sí usan el cliente authenticated directamente:
GRANT SELECT, INSERT, UPDATE ON series_factura TO authenticated;


-- ============================================================
-- PARTE 4 — RLS: notificaciones
-- ============================================================

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus notificaciones" ON notificaciones;
CREATE POLICY "Usuarios ven sus notificaciones"
  ON notificaciones FOR SELECT
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid())
    OR
    taller_id  IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "Sistema gestiona notificaciones del taller" ON notificaciones;
CREATE POLICY "Sistema gestiona notificaciones del taller"
  ON notificaciones FOR ALL
  USING (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));


-- ============================================================
-- PARTE 5 — RLS: uso_mensual
-- ============================================================

ALTER TABLE uso_mensual ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven uso de su taller" ON uso_mensual;
CREATE POLICY "Usuarios ven uso de su taller"
  ON uso_mensual FOR SELECT
  USING (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Sistema gestiona uso mensual" ON uso_mensual;
CREATE POLICY "Sistema gestiona uso mensual"
  ON uso_mensual FOR ALL
  USING (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));


-- ============================================================
-- PARTE 6 — RLS: historial_cambios
-- Solo lectura para usuarios; solo INSERT por el sistema (no UPDATE/DELETE).
-- ============================================================

ALTER TABLE historial_cambios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven historial de su taller" ON historial_cambios;
CREATE POLICY "Usuarios ven historial de su taller"
  ON historial_cambios FOR SELECT
  USING (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Sistema registra historial del taller" ON historial_cambios;
CREATE POLICY "Sistema registra historial del taller"
  ON historial_cambios FOR INSERT
  WITH CHECK (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));
-- historial es append-only: no se crean políticas UPDATE ni DELETE


-- ============================================================
-- PARTE 7 — RLS: documentos_procesados
-- ============================================================

ALTER TABLE documentos_procesados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven documentos de su taller" ON documentos_procesados;
CREATE POLICY "Usuarios ven documentos de su taller"
  ON documentos_procesados FOR SELECT
  USING (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Usuarios gestionan documentos de su taller" ON documentos_procesados;
CREATE POLICY "Usuarios gestionan documentos de su taller"
  ON documentos_procesados FOR ALL
  USING (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));


-- ============================================================
-- PARTE 8 — RLS: configuracion_taller (tabla legacy pre-taller_config)
-- ============================================================

ALTER TABLE configuracion_taller ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven configuracion_taller de su taller" ON configuracion_taller;
CREATE POLICY "Usuarios ven configuracion_taller de su taller"
  ON configuracion_taller FOR SELECT
  USING (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Usuarios gestionan configuracion_taller de su taller" ON configuracion_taller;
CREATE POLICY "Usuarios gestionan configuracion_taller de su taller"
  ON configuracion_taller FOR ALL
  USING (taller_id IN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()
  ));


-- ============================================================
-- PARTE 9 — ÍNDICES DE RENDIMIENTO adicionales
-- ============================================================

-- Búsqueda de clientes en combobox (OrdenInfoTab): filtra por taller + nombre/apellido/NIF
CREATE INDEX IF NOT EXISTS idx_clientes_taller_nombre
  ON clientes(taller_id, nombre);

CREATE INDEX IF NOT EXISTS idx_clientes_taller_nif
  ON clientes(taller_id, nif)
  WHERE nif IS NOT NULL;

-- Listado principal de órdenes (más frecuente = por taller + fecha)
CREATE INDEX IF NOT EXISTS idx_ordenes_taller_fecha
  ON ordenes_reparacion(taller_id, fecha_entrada DESC)
  WHERE deleted_at IS NULL;

-- Badge de notificaciones no leídas
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_no_leidas
  ON notificaciones(usuario_id, created_at DESC)
  WHERE leida = FALSE;

-- Lookup de series por API /api/series/*
CREATE INDEX IF NOT EXISTS idx_series_factura_taller_prefijo
  ON series_factura(taller_id, prefijo);

-- Vehículos por cliente (selector secundario de vehículos en OrdenInfoTab)
CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente_id
  ON vehiculos(cliente_id)
  WHERE cliente_id IS NOT NULL;

-- Listado de facturas por taller y fecha (dashboard facturación)
CREATE INDEX IF NOT EXISTS idx_facturas_taller_fecha_emision
  ON facturas(taller_id, fecha_emision DESC)
  WHERE deleted_at IS NULL;

-- Citas por rango de fechas (calendario)
CREATE INDEX IF NOT EXISTS idx_citas_taller_fecha_rango
  ON citas(taller_id, fecha_inicio, fecha_fin);


-- ============================================================
-- PARTE 10 — FIX TIPO: taller_config.created_at / updated_at
-- Son TIMESTAMP (sin zona horaria), el resto de la app usa TIMESTAMPTZ.
-- Conversión segura asumiendo UTC (Supabase usa UTC por defecto).
-- ============================================================

ALTER TABLE taller_config
  ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ
    USING updated_at AT TIME ZONE 'UTC';

COMMENT ON COLUMN taller_config.created_at IS
  'Convertido a TIMESTAMPTZ (era TIMESTAMP) — 2026-02-25';


-- ============================================================
-- PARTE 11 — Función helper: get_my_taller_id() unificada
-- La versión en rls_ordenes_seguridad_multi_tenant.sql buscaba
-- usuarios por id = auth.uid() (incorrecto).
-- La versión correcta busca por auth_id = auth.uid().
-- Ambas versiones (auth.* y public.*) se unifican aquí.
-- ============================================================

-- Versión en schema public (usada en políticas de 003_security)
CREATE OR REPLACE FUNCTION public.get_my_taller_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid() LIMIT 1
  );
END;
$$;

-- Versión en schema auth (usada en políticas de rls_ordenes y rls_facturas)
CREATE OR REPLACE FUNCTION auth.get_user_taller_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT taller_id FROM usuarios WHERE auth_id = auth.uid() LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_taller_id()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_taller_id()    TO service_role;
GRANT EXECUTE ON FUNCTION auth.get_user_taller_id()    TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_user_taller_id()    TO service_role;


-- ============================================================
-- PARTE 12 — Registrar versión en app_config
-- ============================================================

INSERT INTO app_config (key, value)
VALUES ('db_consolidation_date', '2026-02-25')
ON CONFLICT (key) DO UPDATE
  SET value = '2026-02-25';

INSERT INTO app_config (key, value)
VALUES ('db_audit_version', '1.2.0')
ON CONFLICT (key) DO UPDATE
  SET value = '1.2.0';


-- ============================================================
-- FIN DEL SCRIPT — Resumen de lo ejecutado:
--
-- ✅ auditoria_facturas: +6 columnas (evento, estado_anterior,
--    estado_nuevo, cambios, motivo, created_by)
-- ✅ check_factura_inmutable(): reescrita sin columnas inexistentes
-- ✅ RLS activado en: series_factura, notificaciones, uso_mensual,
--    historial_cambios, documentos_procesados, configuracion_taller
-- ✅ 8 índices de rendimiento nuevos
-- ✅ taller_config timestamps corregidos a TIMESTAMPTZ
-- ✅ get_my_taller_id() / get_user_taller_id() unificadas con auth_id
-- ============================================================
