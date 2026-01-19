-- Migración: Permitir numero_factura NULL para implementar numeración inteligente
-- Fecha: 2026-01-19
-- Razón: Cumplir con normativa española Real Decreto 1619/2012
--        Las facturas se crean como BORRADOR sin número
--        El número se asigna SOLO cuando se emiten (estado: emitida/pagada)
--        Esto evita huecos en la numeración si se cancelan borradores

-- PASO 1: Limpiar datos existentes que violarían el constraint
-- Asignar números temporales a facturas emitidas/pagadas sin número
DO $$
DECLARE
  factura_record RECORD;
  siguiente_num INTEGER;
BEGIN
  -- Para cada factura sin número que NO sea borrador
  FOR factura_record IN
    SELECT id, taller_id, numero_serie, estado
    FROM facturas
    WHERE numero_factura IS NULL
    AND estado != 'borrador'
  LOOP
    -- Obtener el último número de la serie o empezar en 1
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO siguiente_num
    FROM facturas
    WHERE taller_id = factura_record.taller_id
    AND numero_serie = factura_record.numero_serie
    AND numero_factura IS NOT NULL;

    -- Asignar número temporal
    UPDATE facturas
    SET numero_factura = factura_record.numero_serie || LPAD(siguiente_num::TEXT, 3, '0')
    WHERE id = factura_record.id;

    RAISE NOTICE 'Asignado número % a factura % (estado: %)',
      factura_record.numero_serie || LPAD(siguiente_num::TEXT, 3, '0'),
      factura_record.id,
      factura_record.estado;
  END LOOP;
END $$;

-- PASO 2: Eliminar restricción NOT NULL de numero_factura
ALTER TABLE facturas
  ALTER COLUMN numero_factura DROP NOT NULL;

-- PASO 3: Añadir constraint flexible
-- Permitir: borrador con NULL, o cualquier estado con número
ALTER TABLE facturas
  ADD CONSTRAINT facturas_numero_required_unless_draft
  CHECK (
    numero_factura IS NOT NULL OR estado = 'borrador'
  );

-- Comentario explicativo
COMMENT ON COLUMN facturas.numero_factura IS
  'Número de factura único. NULL solo para estado=borrador. Se asigna al emitir.';

-- Índice para búsquedas por número (solo facturas con número)
CREATE INDEX IF NOT EXISTS idx_facturas_numero_factura
  ON facturas(numero_factura)
  WHERE numero_factura IS NOT NULL;
