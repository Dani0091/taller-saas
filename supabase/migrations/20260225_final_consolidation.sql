-- ============================================================
-- MIGRACIÓN FINAL: Intervención Quirúrgica R&S Automoción
-- Fecha: 2026-02-25
-- Idempotente: segura para re-ejecutar
-- ============================================================
--
-- PARTES:
--   1. Eliminación física de FAC-2024--001 y sus líneas
--   2. Limpieza de NIFs que contienen matrículas
--   3. Configurar series para formato anual (RS-2026-XXX)
--   4. RPC v3: asignar_numero_factura_v3 (PREFIJO-YYYY-NNN)
--   5. Blindaje multi-tenant: asignar taller_id a registros NULL
--   6. Columna vehiculo_id en facturas (si falta)
--   7. Verificación final
-- ============================================================


-- ============================================================
-- PARTE 1: Eliminar físicamente FAC-2024--001 y sus líneas
-- ============================================================
-- Nota: las facturas con doble guión son datos corruptos de staging.
-- La única factura afectada es la que empieza con 'FAC-2024--' (doble guión).
-- PRIMERO eliminamos líneas (FK), LUEGO la cabecera.

-- Tabla detalles_factura (nombre real en código TypeScript)
DELETE FROM detalles_factura
WHERE factura_id IN (
  SELECT id FROM facturas WHERE numero_factura LIKE '%-%-%'  -- doble guión
);

-- Tabla lineas_factura (por si el nombre difiere según migración)
DELETE FROM lineas_factura
WHERE factura_id IN (
  SELECT id FROM facturas WHERE numero_factura LIKE '%-%-%'
);

-- Eliminar la cabecera
DELETE FROM facturas WHERE numero_factura LIKE '%-%-%';


-- ============================================================
-- PARTE 2: Limpieza de NIFs que contienen matrículas
-- ============================================================
-- Las matrículas españolas modernas tienen el patrón: 4 dígitos + 3 letras (sin I,O,Ñ,Q,U)
-- Ejemplo: 1234BCD, 9876XYZ
-- Los NIFs/CIFs legítimos tienen letras al inicio o final, nunca 4 dígitos seguidos de 3 letras.

DO $$
DECLARE
  r RECORD;
  v_matricula_normalizada TEXT;
BEGIN
  FOR r IN
    SELECT id, nif, nombre
    FROM clientes
    WHERE nif IS NOT NULL
      AND nif ~ '^[0-9]{4}[BCDFGHJKLMNPRSTUVWXYZ]{3}$'  -- patrón matrícula moderna
  LOOP
    v_matricula_normalizada := UPPER(TRIM(r.nif));

    RAISE NOTICE 'Cliente % (%) tiene matrícula en NIF: %', r.nombre, r.id, v_matricula_normalizada;

    -- Limpiar el campo NIF del cliente
    UPDATE clientes
    SET nif = NULL,
        updated_at = NOW()
    WHERE id = r.id;

    RAISE NOTICE '  → NIF limpiado para cliente %', r.nombre;
  END LOOP;

  RAISE NOTICE 'Limpieza de NIFs con matrículas completada.';
END;
$$;


-- ============================================================
-- PARTE 3: Añadir columna vehiculo_id a facturas (si falta)
-- ============================================================
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_vehiculo_id
  ON facturas(vehiculo_id)
  WHERE vehiculo_id IS NOT NULL;

COMMENT ON COLUMN facturas.vehiculo_id IS
  'Vehículo al que se refiere la factura. Requisito de trazabilidad legal ES.';


-- ============================================================
-- PARTE 4: Configurar series para formato anual (RS-2026-XXX)
-- ============================================================
-- La serie RS tiene ultimo_numero = 7 (la siguiente será RS-2026-008).
-- Si las series no existen, se crean con los valores correctos.
-- Si existen, se actualizan para garantizar año=2026 (sin bajar ultimo_numero).

DO $$
DECLARE
  v_taller_id UUID;
BEGIN
  -- Obtener el taller de R&S Automoción
  SELECT id INTO v_taller_id
  FROM talleres
  WHERE nombre ILIKE '%r%s%auto%'
     OR nombre ILIKE '%rys%'
     OR nombre ILIKE '%r&s%'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_taller_id IS NULL THEN
    RAISE NOTICE 'Taller no encontrado por nombre — usando primer taller disponible';
    SELECT id INTO v_taller_id FROM talleres ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_taller_id IS NULL THEN
    RAISE EXCEPTION 'No hay ningún taller en la base de datos. Abortar.';
  END IF;

  RAISE NOTICE 'Taller identificado: %', v_taller_id;

  -- Serie RS: ultimo_numero=7 → próxima será RS-2026-008
  INSERT INTO series_factura (taller_id, nombre, prefijo, año, ultimo_numero)
  VALUES (v_taller_id, 'Serie RS', 'RS', 2026, 7)
  ON CONFLICT (taller_id, prefijo) DO UPDATE
    SET año           = 2026,
        ultimo_numero = GREATEST(series_factura.ultimo_numero, EXCLUDED.ultimo_numero),
        updated_at    = NOW()
  WHERE series_factura.taller_id = v_taller_id;

  RAISE NOTICE 'Serie RS configurada (ultimo_numero >= 7, año=2026).';

  -- Serie SCR: crear si no existe (próxima será SCR-2026-001)
  INSERT INTO series_factura (taller_id, nombre, prefijo, año, ultimo_numero)
  VALUES (v_taller_id, 'Serie SCR', 'SCR', 2026, 0)
  ON CONFLICT (taller_id, prefijo) DO UPDATE
    SET año        = 2026,
        updated_at = NOW()
  WHERE series_factura.taller_id = v_taller_id;

  RAISE NOTICE 'Serie SCR configurada.';

  -- Serie ALP: crear si no existe (próxima será ALP-2026-001)
  INSERT INTO series_factura (taller_id, nombre, prefijo, año, ultimo_numero)
  VALUES (v_taller_id, 'Serie ALP', 'ALP', 2026, 0)
  ON CONFLICT (taller_id, prefijo) DO UPDATE
    SET año        = 2026,
        updated_at = NOW()
  WHERE series_factura.taller_id = v_taller_id;

  RAISE NOTICE 'Serie ALP configurada.';
END;
$$;


-- ============================================================
-- PARTE 5: RPC v3 — Numeración anual PREFIJO-YYYY-NNN
-- ============================================================
-- Diferencias vs v2:
--   v2 → formato RS-007  (sin año)
--   v3 → formato RS-2026-008  (con año del campo series_factura.año)
--
-- Garantías heredadas de v2:
--   - FOR UPDATE: cero duplicados en emisiones simultáneas
--   - Auto-create: crea la serie si no existe
--   - LPAD(3): RS-2026-001 ... RS-2026-999; crece a RS-2026-1000 sin truncar

CREATE OR REPLACE FUNCTION asignar_numero_factura_v3(
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
  v_año              INTEGER;
BEGIN
  -- ── Validaciones ────────────────────────────────────────────────────────
  IF p_taller_id IS NULL THEN
    RAISE EXCEPTION 'taller_id no puede ser NULL';
  END IF;

  IF p_prefijo IS NULL OR TRIM(p_prefijo) = '' THEN
    RAISE EXCEPTION 'prefijo no puede ser NULL o vacío';
  END IF;

  -- ── Bloquear fila de la serie (FOR UPDATE) ───────────────────────────────
  SELECT id, ultimo_numero, COALESCE(año, EXTRACT(YEAR FROM NOW())::INTEGER)
    INTO v_serie_id, v_ultimo_numero, v_año
    FROM series_factura
   WHERE taller_id = p_taller_id
     AND prefijo   = p_prefijo
   FOR UPDATE;

  -- ── Auto-create si la serie no existe ────────────────────────────────────
  IF v_serie_id IS NULL THEN
    v_año := EXTRACT(YEAR FROM NOW())::INTEGER;

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
      v_año,
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
  -- Formato: RS-2026-008 (mínimo 3 dígitos). A partir de 1000 crece naturalmente.
  RETURN json_build_object(
    'prefijo',          p_prefijo,
    'año',              v_año,
    'numero',           v_siguiente_numero,
    'numero_completo',  p_prefijo || '-' || v_año::TEXT || '-' || LPAD(v_siguiente_numero::TEXT, 3, '0')
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'asignar_numero_factura_v3 error: % (SQLSTATE: %)',
      SQLERRM, SQLSTATE;
END;
$$;

COMMENT ON FUNCTION asignar_numero_factura_v3(UUID, TEXT) IS
'Asigna el siguiente número de factura con formato anual PREFIJO-YYYY-NNN.
Operación atómica (FOR UPDATE) sobre series_factura. El año se lee del campo
series_factura.año (por defecto el año en curso). Crece naturalmente a partir
de 1000 sin truncar.
Ejemplo: RS-2026-001, RS-2026-099, RS-2026-1000.';

GRANT EXECUTE ON FUNCTION asignar_numero_factura_v3(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION asignar_numero_factura_v3(UUID, TEXT) TO service_role;


-- ============================================================
-- PARTE 6: Blindaje multi-tenant — asignar taller_id a NULLs
-- ============================================================
-- Asigna el taller_id de R&S Automoción a todos los registros
-- que tengan taller_id = NULL en las tablas operacionales.
-- PRECAUCIÓN: solo se ejecuta si hay exactamente 1 taller en producción.

DO $$
DECLARE
  v_taller_id   UUID;
  v_num_talleres INTEGER;
  v_afectados   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_num_talleres FROM talleres;

  IF v_num_talleres > 1 THEN
    RAISE WARNING
      'Hay % talleres en la base de datos. Saltando asignación automática de taller_id para evitar errores.',
      v_num_talleres;
    RETURN;
  END IF;

  SELECT id INTO v_taller_id FROM talleres LIMIT 1;

  IF v_taller_id IS NULL THEN
    RAISE EXCEPTION 'No hay talleres registrados. Imposible asignar taller_id.';
  END IF;

  RAISE NOTICE 'Asignando taller_id = % a registros huérfanos...', v_taller_id;

  -- clientes
  UPDATE clientes SET taller_id = v_taller_id, updated_at = NOW()
  WHERE taller_id IS NULL;
  GET DIAGNOSTICS v_afectados = ROW_COUNT;
  RAISE NOTICE '  clientes: % registros actualizados', v_afectados;

  -- vehiculos
  UPDATE vehiculos SET taller_id = v_taller_id, updated_at = NOW()
  WHERE taller_id IS NULL;
  GET DIAGNOSTICS v_afectados = ROW_COUNT;
  RAISE NOTICE '  vehiculos: % registros actualizados', v_afectados;

  -- ordenes_reparacion
  UPDATE ordenes_reparacion SET taller_id = v_taller_id, updated_at = NOW()
  WHERE taller_id IS NULL;
  GET DIAGNOSTICS v_afectados = ROW_COUNT;
  RAISE NOTICE '  ordenes_reparacion: % registros actualizados', v_afectados;

  -- facturas
  UPDATE facturas SET taller_id = v_taller_id, updated_at = NOW()
  WHERE taller_id IS NULL;
  GET DIAGNOSTICS v_afectados = ROW_COUNT;
  RAISE NOTICE '  facturas: % registros actualizados', v_afectados;

  -- series_factura
  UPDATE series_factura SET taller_id = v_taller_id
  WHERE taller_id IS NULL;
  GET DIAGNOSTICS v_afectados = ROW_COUNT;
  RAISE NOTICE '  series_factura: % registros actualizados', v_afectados;

  -- usuarios (si hubiera alguno sin taller)
  UPDATE usuarios SET taller_id = v_taller_id, updated_at = NOW()
  WHERE taller_id IS NULL;
  GET DIAGNOSTICS v_afectados = ROW_COUNT;
  RAISE NOTICE '  usuarios: % registros actualizados', v_afectados;

  RAISE NOTICE 'Blindaje multi-tenant completado.';
END;
$$;


-- ============================================================
-- PARTE 7: VeriFACTU — Propagar vehiculo_id en facturas
--           de órdenes existentes que ya fueron creadas sin él
-- ============================================================
UPDATE facturas f
SET vehiculo_id = o.vehiculo_id,
    updated_at  = NOW()
FROM ordenes_reparacion o
WHERE f.orden_id    = o.id
  AND f.vehiculo_id IS NULL
  AND o.vehiculo_id IS NOT NULL;


-- ============================================================
-- PARTE 8: Verificación final (SELECT informativos)
-- ============================================================

-- Facturas con doble guión (deben ser 0)
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM facturas WHERE numero_factura LIKE '%-%-%';
  IF v_count > 0 THEN
    RAISE WARNING '% facturas con doble guión persisten tras limpieza.', v_count;
  ELSE
    RAISE NOTICE 'OK: Sin facturas con doble guión.';
  END IF;
END;
$$;

-- NIFs con matrículas (deben ser 0)
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM clientes
  WHERE nif ~ '^[0-9]{4}[BCDFGHJKLMNPRSTUVWXYZ]{3}$';
  IF v_count > 0 THEN
    RAISE WARNING '% clientes aún tienen matrículas en campo NIF.', v_count;
  ELSE
    RAISE NOTICE 'OK: Sin matrículas en campo NIF.';
  END IF;
END;
$$;

-- Series configuradas
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM series_factura WHERE prefijo IN ('RS','SCR','ALP');
  RAISE NOTICE 'Series RS/SCR/ALP configuradas: %/3', v_count;
END;
$$;

-- Función v3 disponible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'asignar_numero_factura_v3'
  ) THEN
    RAISE NOTICE 'OK: asignar_numero_factura_v3 disponible.';
  ELSE
    RAISE WARNING 'asignar_numero_factura_v3 NO encontrada.';
  END IF;
END;
$$;

-- ============================================================
-- FIN DE MIGRACIÓN FINAL
-- ============================================================
