-- ============================================
-- RPC: asignar_numero_factura
-- ============================================
--
-- OBJETIVO: Asignar números de factura de forma atómica
-- garantizando que no haya duplicados ni saltos, incluso
-- con múltiples usuarios emitiendo facturas simultáneamente
--
-- CARACTERÍSTICAS:
-- - FOR UPDATE: Bloquea la fila de la serie mientras se incrementa
-- - Multi-tenancy: Filtra por taller_id
-- - Reseteo automático por año
-- - Manejo de series independientes (F, P, R, etc.)
-- ============================================

CREATE OR REPLACE FUNCTION asignar_numero_factura(
  p_taller_id UUID,
  p_serie TEXT,
  p_año INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ultimo_numero INTEGER;
  v_siguiente_numero INTEGER;
  v_numero_completo TEXT;
  v_serie_exists BOOLEAN;
BEGIN
  -- Validar parámetros
  IF p_taller_id IS NULL THEN
    RAISE EXCEPTION 'taller_id no puede ser NULL';
  END IF;

  IF p_serie IS NULL OR p_serie = '' THEN
    RAISE EXCEPTION 'serie no puede ser NULL o vacía';
  END IF;

  -- Verificar si existe la serie para este taller y año
  SELECT EXISTS (
    SELECT 1
    FROM series_facturacion
    WHERE taller_id = p_taller_id
      AND serie = p_serie
      AND año = p_año
  ) INTO v_serie_exists;

  -- Si no existe, crear la serie
  IF NOT v_serie_exists THEN
    INSERT INTO series_facturacion (
      taller_id,
      serie,
      año,
      ultimo_numero,
      created_at,
      updated_at
    ) VALUES (
      p_taller_id,
      p_serie,
      p_año,
      0,
      NOW(),
      NOW()
    );

    v_ultimo_numero := 0;
  ELSE
    -- CRÍTICO: FOR UPDATE bloquea la fila hasta que termine la transacción
    -- Esto evita que dos facturas obtengan el mismo número
    SELECT ultimo_numero INTO v_ultimo_numero
    FROM series_facturacion
    WHERE taller_id = p_taller_id
      AND serie = p_serie
      AND año = p_año
    FOR UPDATE; -- 🔒 LOCK DE FILA
  END IF;

  -- Calcular siguiente número
  v_siguiente_numero := v_ultimo_numero + 1;

  -- Generar número completo en formato: SERIE-YYYY-NNNNNN
  v_numero_completo := p_serie || '-' || p_año::TEXT || '-' || LPAD(v_siguiente_numero::TEXT, 6, '0');

  -- Actualizar el contador (dentro de la misma transacción con el lock)
  UPDATE series_facturacion
  SET ultimo_numero = v_siguiente_numero,
      updated_at = NOW()
  WHERE taller_id = p_taller_id
    AND serie = p_serie
    AND año = p_año;

  -- Retornar JSON con la información del número asignado
  RETURN json_build_object(
    'serie', p_serie,
    'año', p_año,
    'numero', v_siguiente_numero,
    'numero_completo', v_numero_completo,
    'ultimo_numero', v_ultimo_numero,
    'siguiente_numero', v_siguiente_numero
  );
END;
$$;

-- Comentario de documentación
COMMENT ON FUNCTION asignar_numero_factura(UUID, TEXT, INTEGER) IS
'Asigna el siguiente número de factura de forma atómica usando FOR UPDATE para evitar duplicados.
Resetea automáticamente el contador cada año.
Multi-tenant: filtra por taller_id.';

-- ============================================
-- EJEMPLO DE USO:
-- ============================================
-- SELECT asignar_numero_factura(
--   'taller-uuid-123'::UUID,
--   'F',
--   2026
-- );
--
-- Resultado: {"serie":"F","año":2026,"numero":124,"numero_completo":"F-2026-000124"}
-- ============================================
