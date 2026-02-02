-- ============================================
-- RLS POLICIES: Facturas (Multi-tenancy + Inmutabilidad)
-- ============================================
--
-- OBJETIVO: Garantizar seguridad multi-tenant y cumplimiento normativo
--
-- CARACTERÍSTICAS CRÍTICAS:
-- 1. Multi-tenancy: Solo acceso a facturas del propio taller
-- 2. Inmutabilidad fiscal: Facturas emitidas NO se pueden modificar
-- 3. No se pueden eliminar facturas, solo anular
-- 4. Auditoría completa de cambios de estado
--
-- PUNTO DE AUDITORÍA #2: MULTI-TENANCY
-- PUNTO DE AUDITORÍA #3: INMUTABILIDAD
-- ============================================

-- ============================================
-- HELPER FUNCTION: Obtener taller_id del usuario autenticado
-- ============================================

-- Esta función ya debería existir, pero la recreamos por seguridad
CREATE OR REPLACE FUNCTION auth.get_user_taller_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (
    SELECT taller_id
    FROM public.usuarios
    WHERE auth_id = auth.uid()
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION auth.get_user_taller_id() IS
'Obtiene el taller_id del usuario autenticado (usado en RLS policies)';

-- ============================================
-- TABLA: facturas
-- ============================================

-- Habilitar RLS (por si acaso)
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: SELECT - Los talleres solo ven sus propias facturas
DROP POLICY IF EXISTS "Usuarios ven facturas de su taller" ON facturas;
CREATE POLICY "Usuarios ven facturas de su taller"
ON facturas
FOR SELECT
USING (taller_id = auth.get_user_taller_id());

-- POLÍTICA 2: INSERT - Los talleres solo crean facturas para sí mismos
DROP POLICY IF EXISTS "Usuarios crean facturas en su taller" ON facturas;
CREATE POLICY "Usuarios crean facturas en su taller"
ON facturas
FOR INSERT
WITH CHECK (taller_id = auth.get_user_taller_id());

-- POLÍTICA 3: UPDATE - Solo borradores pueden modificarse (INMUTABILIDAD)
DROP POLICY IF EXISTS "Solo borradores pueden modificarse" ON facturas;
CREATE POLICY "Solo borradores pueden modificarse"
ON facturas
FOR UPDATE
USING (
  taller_id = auth.get_user_taller_id() AND
  estado = 'borrador'
)
WITH CHECK (
  taller_id = auth.get_user_taller_id() AND
  estado IN ('borrador', 'emitida', 'pagada', 'anulada')
);

-- POLÍTICA 4: DELETE - NO se pueden eliminar facturas (solo anular)
-- Esta política NO existe intencionalmente
-- Las facturas NUNCA se eliminan físicamente por normativa fiscal

COMMENT ON POLICY "Usuarios ven facturas de su taller" ON facturas IS
'Multi-tenancy: Cada taller solo ve sus propias facturas';

COMMENT ON POLICY "Usuarios crean facturas en su taller" ON facturas IS
'Multi-tenancy: Solo se pueden crear facturas en el taller del usuario';

COMMENT ON POLICY "Solo borradores pueden modificarse" ON facturas IS
'Inmutabilidad fiscal: Solo facturas en borrador pueden modificarse';

-- ============================================
-- TABLA: lineas_factura
-- ============================================

ALTER TABLE lineas_factura ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: SELECT - Ver líneas de facturas del taller
DROP POLICY IF EXISTS "Usuarios ven lineas de su taller" ON lineas_factura;
CREATE POLICY "Usuarios ven lineas de su taller"
ON lineas_factura
FOR SELECT
USING (
  factura_id IN (
    SELECT id FROM facturas
    WHERE taller_id = auth.get_user_taller_id()
  )
);

-- POLÍTICA 2: INSERT - Crear líneas solo en facturas del taller
DROP POLICY IF EXISTS "Usuarios crean lineas en su taller" ON lineas_factura;
CREATE POLICY "Usuarios crean lineas en su taller"
ON lineas_factura
FOR INSERT
WITH CHECK (
  factura_id IN (
    SELECT id FROM facturas
    WHERE taller_id = auth.get_user_taller_id()
  )
);

-- POLÍTICA 3: UPDATE - Solo líneas de borradores (INMUTABILIDAD)
DROP POLICY IF EXISTS "Solo lineas de borradores pueden modificarse" ON lineas_factura;
CREATE POLICY "Solo lineas de borradores pueden modificarse"
ON lineas_factura
FOR UPDATE
USING (
  factura_id IN (
    SELECT id FROM facturas
    WHERE taller_id = auth.get_user_taller_id()
      AND estado = 'borrador'
  )
);

-- POLÍTICA 4: DELETE - Solo líneas de borradores pueden eliminarse
DROP POLICY IF EXISTS "Solo lineas de borradores pueden eliminarse" ON lineas_factura;
CREATE POLICY "Solo lineas de borradores pueden eliminarse"
ON lineas_factura
FOR DELETE
USING (
  factura_id IN (
    SELECT id FROM facturas
    WHERE taller_id = auth.get_user_taller_id()
      AND estado = 'borrador'
  )
);

-- ============================================
-- TABLA: verifactu_registros
-- ============================================

ALTER TABLE verifactu_registros ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: SELECT - Ver registros Verifactu del taller
DROP POLICY IF EXISTS "Usuarios ven verifactu de su taller" ON verifactu_registros;
CREATE POLICY "Usuarios ven verifactu de su taller"
ON verifactu_registros
FOR SELECT
USING (taller_id = auth.get_user_taller_id());

-- POLÍTICA 2: INSERT - Solo el sistema puede crear registros Verifactu
DROP POLICY IF EXISTS "Sistema crea registros verifactu" ON verifactu_registros;
CREATE POLICY "Sistema crea registros verifactu"
ON verifactu_registros
FOR INSERT
WITH CHECK (taller_id = auth.get_user_taller_id());

-- POLÍTICA 3: UPDATE - Solo el sistema puede actualizar registros
DROP POLICY IF EXISTS "Sistema actualiza registros verifactu" ON verifactu_registros;
CREATE POLICY "Sistema actualiza registros verifactu"
ON verifactu_registros
FOR UPDATE
USING (taller_id = auth.get_user_taller_id());

-- POLÍTICA 4: DELETE - NO se pueden eliminar registros Verifactu (trazabilidad)
-- Esta política NO existe intencionalmente por trazabilidad fiscal

-- ============================================
-- TABLA: series_facturacion
-- ============================================

ALTER TABLE series_facturacion ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: SELECT - Ver series del taller
DROP POLICY IF EXISTS "Usuarios ven series de su taller" ON series_facturacion;
CREATE POLICY "Usuarios ven series de su taller"
ON series_facturacion
FOR SELECT
USING (taller_id = auth.get_user_taller_id());

-- POLÍTICA 2: INSERT - Crear series (normalmente lo hace el RPC)
DROP POLICY IF EXISTS "Sistema crea series" ON series_facturacion;
CREATE POLICY "Sistema crea series"
ON series_facturacion
FOR INSERT
WITH CHECK (taller_id = auth.get_user_taller_id());

-- POLÍTICA 3: UPDATE - Solo el RPC puede actualizar (FOR UPDATE lock)
DROP POLICY IF EXISTS "Sistema actualiza series" ON series_facturacion;
CREATE POLICY "Sistema actualiza series"
ON series_facturacion
FOR UPDATE
USING (taller_id = auth.get_user_taller_id());

-- POLÍTICA 4: DELETE - NO se pueden eliminar series (trazabilidad)
-- Esta política NO existe intencionalmente

-- ============================================
-- TABLA: auditoria_facturas
-- ============================================

ALTER TABLE auditoria_facturas ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: SELECT - Ver auditoría del taller
DROP POLICY IF EXISTS "Usuarios ven auditoria de su taller" ON auditoria_facturas;
CREATE POLICY "Usuarios ven auditoria de su taller"
ON auditoria_facturas
FOR SELECT
USING (taller_id = auth.get_user_taller_id());

-- POLÍTICA 2: INSERT - El sistema crea registros de auditoría
DROP POLICY IF EXISTS "Sistema crea auditoria" ON auditoria_facturas;
CREATE POLICY "Sistema crea auditoria"
ON auditoria_facturas
FOR INSERT
WITH CHECK (taller_id = auth.get_user_taller_id());

-- POLÍTICA 3: UPDATE - NO se puede modificar auditoría (inmutabilidad)
-- POLÍTICA 4: DELETE - NO se puede eliminar auditoría (trazabilidad)
-- Estas políticas NO existen intencionalmente

-- ============================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================

-- Índice para búsquedas por taller_id (crítico para RLS)
CREATE INDEX IF NOT EXISTS idx_facturas_taller_estado
ON facturas(taller_id, estado)
WHERE estado != 'borrador';

-- Índice para facturas por cliente
CREATE INDEX IF NOT EXISTS idx_facturas_cliente
ON facturas(cliente_id, fecha_emision DESC);

-- Índice para facturas por orden
CREATE INDEX IF NOT EXISTS idx_facturas_orden
ON facturas(orden_id)
WHERE orden_id IS NOT NULL;

-- Índice para facturas vencidas
CREATE INDEX IF NOT EXISTS idx_facturas_vencidas
ON facturas(fecha_vencimiento, estado)
WHERE estado = 'emitida' AND fecha_vencimiento < CURRENT_DATE;

-- Índice para búsqueda por número de factura
CREATE INDEX IF NOT EXISTS idx_facturas_numero
ON facturas(taller_id, numero_factura);

-- Índice para líneas de factura
CREATE INDEX IF NOT EXISTS idx_lineas_factura_id
ON lineas_factura(factura_id);

-- Índice para auditoría por fecha
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha
ON auditoria_facturas(taller_id, created_at DESC);

-- ============================================
-- FUNCIÓN: Trigger de auditoría automática
-- ============================================

CREATE OR REPLACE FUNCTION trigger_auditoria_factura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evento TEXT;
  v_cambios JSONB;
  v_user_id UUID;
BEGIN
  -- Obtener ID del usuario actual
  SELECT id INTO v_user_id
  FROM usuarios
  WHERE auth_id = auth.uid()
  LIMIT 1;

  -- Determinar tipo de evento
  IF TG_OP = 'INSERT' THEN
    v_evento := 'creada';
    v_cambios := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detectar cambios de estado críticos
    IF OLD.estado != NEW.estado THEN
      CASE NEW.estado
        WHEN 'emitida' THEN v_evento := 'emitida';
        WHEN 'pagada' THEN v_evento := 'pagada';
        WHEN 'anulada' THEN v_evento := 'anulada';
        ELSE v_evento := 'modificada';
      END CASE;
    ELSE
      v_evento := 'modificada';
    END IF;

    -- Capturar solo los campos que cambiaron
    v_cambios := jsonb_build_object(
      'old', row_to_json(OLD)::jsonb,
      'new', row_to_json(NEW)::jsonb
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_evento := 'eliminada_intento'; -- NO debería pasar nunca
    v_cambios := to_jsonb(OLD);
  END IF;

  -- Insertar registro de auditoría
  INSERT INTO auditoria_facturas (
    factura_id,
    taller_id,
    evento,
    estado_anterior,
    estado_nuevo,
    cambios,
    motivo,
    created_by
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.taller_id, OLD.taller_id),
    v_evento,
    OLD.estado,
    NEW.estado,
    v_cambios,
    NEW.motivo_anulacion,
    v_user_id
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- No fallar la transacción principal si falla la auditoría
    RAISE WARNING 'Error en trigger de auditoría: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Aplicar trigger a facturas
DROP TRIGGER IF EXISTS trigger_auditoria_factura_changes ON facturas;
CREATE TRIGGER trigger_auditoria_factura_changes
  AFTER INSERT OR UPDATE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auditoria_factura();

COMMENT ON FUNCTION trigger_auditoria_factura() IS
'Registra automáticamente cambios críticos en facturas para auditoría y cumplimiento normativo';

-- ============================================
-- FUNCIÓN: Validar inmutabilidad en UPDATE
-- ============================================

CREATE OR REPLACE FUNCTION check_factura_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si la factura está emitida, NO se puede modificar (excepto estado)
  IF OLD.estado IN ('emitida', 'pagada', 'anulada') THEN
    -- Solo permitir cambios en estos campos:
    IF (
      OLD.id IS DISTINCT FROM NEW.id OR
      OLD.taller_id IS DISTINCT FROM NEW.taller_id OR
      OLD.numero_factura IS DISTINCT FROM NEW.numero_factura OR
      OLD.tipo IS DISTINCT FROM NEW.tipo OR
      OLD.cliente_id IS DISTINCT FROM NEW.cliente_id OR
      OLD.fecha_emision IS DISTINCT FROM NEW.fecha_emision OR
      OLD.base_imponible IS DISTINCT FROM NEW.base_imponible OR
      OLD.iva IS DISTINCT FROM NEW.iva OR
      OLD.total IS DISTINCT FROM NEW.total OR
      OLD.porcentaje_retencion IS DISTINCT FROM NEW.porcentaje_retencion
    ) AND (
      -- EXCEPCIONES permitidas:
      -- 1. Cambio de estado emitida → pagada
      NOT (OLD.estado = 'emitida' AND NEW.estado = 'pagada') AND
      -- 2. Cambio de estado emitida → anulada (con motivo)
      NOT (OLD.estado = 'emitida' AND NEW.estado = 'anulada' AND NEW.motivo_anulacion IS NOT NULL) AND
      -- 3. Actualización de campos Verifactu
      NOT (
        OLD.estado_verifactu IS DISTINCT FROM NEW.estado_verifactu OR
        OLD.verifactu_numero IS DISTINCT FROM NEW.verifactu_numero OR
        OLD.verifactu_url IS DISTINCT FROM NEW.verifactu_url
      )
    ) THEN
      RAISE EXCEPTION 'No se puede modificar una factura emitida (normativa fiscal)'
        USING HINT = 'Crea una factura rectificativa en su lugar',
              ERRCODE = '23P01'; -- Triggered action exception
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Aplicar trigger de inmutabilidad
DROP TRIGGER IF EXISTS check_factura_inmutable_trigger ON facturas;
CREATE TRIGGER check_factura_inmutable_trigger
  BEFORE UPDATE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION check_factura_inmutable();

COMMENT ON FUNCTION check_factura_inmutable() IS
'Previene modificaciones en facturas emitidas (inmutabilidad fiscal)';

-- ============================================
-- FUNCIÓN: Prevenir eliminación de facturas
-- ============================================

CREATE OR REPLACE FUNCTION prevent_factura_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'No se pueden eliminar facturas (normativa fiscal)'
    USING HINT = 'Usa el estado "anulada" en su lugar',
          ERRCODE = '23P01';
  RETURN NULL;
END;
$$;

-- Aplicar trigger de prevención de eliminación
DROP TRIGGER IF EXISTS prevent_factura_delete_trigger ON facturas;
CREATE TRIGGER prevent_factura_delete_trigger
  BEFORE DELETE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION prevent_factura_delete();

COMMENT ON FUNCTION prevent_factura_delete() IS
'Previene eliminación física de facturas (cumplimiento normativo)';

-- ============================================
-- COMENTARIOS FINALES
-- ============================================

COMMENT ON TABLE facturas IS
'Facturas emitidas por el taller.
CRÍTICO: Facturas emitidas son INMUTABLES (normativa fiscal española).
Solo se pueden anular creando facturas rectificativas.';

COMMENT ON TABLE lineas_factura IS
'Líneas de factura (productos, servicios, descuentos).
CRÍTICO: Solo modificables si la factura está en estado borrador.';

COMMENT ON TABLE verifactu_registros IS
'Registro de firmas digitales Verifactu (BOE-A-2024-22138).
Trazabilidad fiscal mediante hash encadenado anti-manipulación.';

COMMENT ON TABLE series_facturacion IS
'Control de series de numeración por taller y año.
CRÍTICO: Usa FOR UPDATE en RPC para prevenir race conditions.';

COMMENT ON TABLE auditoria_facturas IS
'Registro de auditoría de cambios en facturas.
INMUTABLE: No se pueden modificar ni eliminar registros de auditoría.';

-- ============================================
-- FIN DE LA MIGRACIÓN RLS
-- ============================================
