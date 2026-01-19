-- Migración: Permitir numero_factura NULL para implementar numeración inteligente
-- Fecha: 2026-01-19
-- Razón: Cumplir con normativa española Real Decreto 1619/2012
--        Las facturas se crean como BORRADOR sin número
--        El número se asigna SOLO cuando se emiten (estado: emitida/pagada)
--        Esto evita huecos en la numeración si se cancelan borradores

-- Eliminar restricción NOT NULL de numero_factura
ALTER TABLE facturas
  ALTER COLUMN numero_factura DROP NOT NULL;

-- Añadir constraint: Si estado != 'borrador', numero_factura debe existir
-- Esto garantiza que solo los borradores pueden no tener número
ALTER TABLE facturas
  ADD CONSTRAINT facturas_numero_required_unless_draft
  CHECK (
    (estado = 'borrador' AND numero_factura IS NULL) OR
    (estado != 'borrador' AND numero_factura IS NOT NULL)
  );

-- Comentario explicativo
COMMENT ON COLUMN facturas.numero_factura IS
  'Número de factura único. NULL solo para estado=borrador. Se asigna al emitir.';

-- Índice para búsquedas por número (solo facturas con número)
CREATE INDEX IF NOT EXISTS idx_facturas_numero_factura
  ON facturas(numero_factura)
  WHERE numero_factura IS NOT NULL;
