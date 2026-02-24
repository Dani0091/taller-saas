-- ============================================
-- MIGRACIÓN: RPC Atómico de Numeración v2
-- Fecha: 2026-02-24
-- ============================================
-- Crea la función asignar_numero_factura_v2 que opera sobre la tabla
-- operacional series_factura (la que usa el código TypeScript).
--
-- DIFERENCIAS con la v1 (asignar_numero_factura / series_facturacion):
--   v1 → tabla series_facturacion, formato SERIE-YYYY-000001 (stand-by)
--   v2 → tabla series_factura,     formato RS-007 / RS-1000 (producción)
--
-- GARANTÍAS:
--   - FOR UPDATE: bloqueo de fila, cero duplicados aunque haya emisiones
--     simultáneas de múltiples usuarios del mismo taller.
--   - LPAD(3): RS-001, RS-007, RS-099; a partir de 1000 crece naturalmente
--     a RS-1000 sin romper formato (LPAD no trunca).
--   - Auto-create: si la serie no existe la crea con primer número = 1.
-- ============================================

CREATE OR REPLACE FUNCTION asignar_numero_factura_v2(
  p_taller_id UUID,
  p_prefijo   TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_serie_id         UUID;
  v_ultimo_numero    INTEGER;
  v_siguiente_numero INTEGER;
BEGIN
  -- ── Validaciones ────────────────────────────────────────────────────────
  IF p_taller_id IS NULL THEN
    RAISE EXCEPTION 'taller_id no puede ser NULL';
  END IF;

  IF p_prefijo IS NULL OR TRIM(p_prefijo) = '' THEN
    RAISE EXCEPTION 'prefijo no puede ser NULL o vacío';
  END IF;

  -- ── Bloquear fila de la serie (FOR UPDATE) ───────────────────────────────
  -- Si hay dos transacciones simultáneas, la segunda esperará a que la primera
  -- haga COMMIT antes de continuar. Esto garantiza secuencia sin huecos.
  SELECT id, ultimo_numero
    INTO v_serie_id, v_ultimo_numero
    FROM series_factura
   WHERE taller_id = p_taller_id
     AND prefijo   = p_prefijo
   FOR UPDATE;

  -- ── Auto-create si la serie no existe ────────────────────────────────────
  IF v_serie_id IS NULL THEN
    INSERT INTO series_factura (
      taller_id,
      nombre,
      prefijo,
      año,
      ultimo_numero
    )
    VALUES (
      p_taller_id,
      'Serie ' || p_prefijo,
      p_prefijo,
      EXTRACT(YEAR FROM NOW())::INTEGER,
      1  -- Primer número reservado
    )
    RETURNING id, ultimo_numero
      INTO v_serie_id, v_siguiente_numero;

  ELSE
    -- ── Incrementar atómicamente ──────────────────────────────────────────
    v_siguiente_numero := COALESCE(v_ultimo_numero, 0) + 1;

    UPDATE series_factura
       SET ultimo_numero = v_siguiente_numero
     WHERE id = v_serie_id;
  END IF;

  -- ── Retornar resultado ────────────────────────────────────────────────────
  -- Formato: RS-007 (mínimo 3 dígitos). A partir de 1000 crece naturalmente.
  RETURN json_build_object(
    'prefijo',          p_prefijo,
    'numero',           v_siguiente_numero,
    'numero_completo',  p_prefijo || '-' || LPAD(v_siguiente_numero::TEXT, 3, '0')
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'asignar_numero_factura_v2 error: % (SQLSTATE: %)',
      SQLERRM, SQLSTATE;
END;
$$;

COMMENT ON FUNCTION asignar_numero_factura_v2(UUID, TEXT) IS
'Asigna el siguiente número de factura de forma atómica (FOR UPDATE) sobre
la tabla operacional series_factura. Formato: PREFIJO-NNN con mínimo 3
dígitos (LPAD). Crece naturalmente a partir de 1000.
Ejemplo: FA-001, FA-099, FA-100, ..., FA-999, FA-1000.';

-- ============================================
-- app_config: registrar versión estable 1.1.0
-- ============================================
INSERT INTO app_config (key, value)
VALUES ('app_version', '1.1.0')
ON CONFLICT (key) DO UPDATE
  SET value = '1.1.0'
  WHERE app_config.value IS DISTINCT FROM '1.1.0';

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
