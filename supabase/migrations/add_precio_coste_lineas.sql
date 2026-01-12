-- ============================================
-- MIGRACIÓN: Añadir precio de coste a líneas
-- ============================================
-- Permite trackear el coste de las piezas para calcular margen de beneficio

-- Añadir columnas de coste a lineas_orden
ALTER TABLE lineas_orden ADD COLUMN IF NOT EXISTS precio_coste DECIMAL(12,2) DEFAULT 0;
ALTER TABLE lineas_orden ADD COLUMN IF NOT EXISTS iva_coste_porcentaje DECIMAL(5,2) DEFAULT 21;
ALTER TABLE lineas_orden ADD COLUMN IF NOT EXISTS proveedor VARCHAR(255);
ALTER TABLE lineas_orden ADD COLUMN IF NOT EXISTS referencia VARCHAR(100);

-- Comentarios para documentación
COMMENT ON COLUMN lineas_orden.precio_coste IS 'Precio de coste unitario sin IVA';
COMMENT ON COLUMN lineas_orden.iva_coste_porcentaje IS 'Porcentaje de IVA del proveedor (normalmente 21%)';
COMMENT ON COLUMN lineas_orden.proveedor IS 'Nombre del proveedor de la pieza';
COMMENT ON COLUMN lineas_orden.referencia IS 'Referencia o código del proveedor';

-- También añadir a lineas_factura para histórico
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS precio_coste DECIMAL(12,2) DEFAULT 0;
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS proveedor VARCHAR(255);
ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS referencia VARCHAR(100);

-- Vista útil para análisis de rentabilidad
CREATE OR REPLACE VIEW vista_rentabilidad_lineas AS
SELECT
    lo.id,
    lo.orden_id,
    o.numero_orden,
    lo.tipo,
    lo.descripcion,
    lo.cantidad,
    lo.precio_unitario as precio_venta,
    lo.precio_coste,
    lo.proveedor,
    lo.referencia,
    (lo.precio_unitario - COALESCE(lo.precio_coste, 0)) as margen_unitario,
    (lo.cantidad * lo.precio_unitario) as total_venta,
    (lo.cantidad * COALESCE(lo.precio_coste, 0)) as total_coste,
    (lo.cantidad * (lo.precio_unitario - COALESCE(lo.precio_coste, 0))) as margen_total,
    CASE
        WHEN lo.precio_unitario > 0 THEN
            ROUND(((lo.precio_unitario - COALESCE(lo.precio_coste, 0)) / lo.precio_unitario * 100), 2)
        ELSE 0
    END as margen_porcentaje,
    o.taller_id,
    o.created_at as fecha_orden
FROM lineas_orden lo
JOIN ordenes_reparacion o ON lo.orden_id = o.id
WHERE lo.tipo = 'pieza';

-- Índice para consultas de rentabilidad
CREATE INDEX IF NOT EXISTS idx_lineas_orden_precio_coste ON lineas_orden(precio_coste) WHERE precio_coste > 0;

SELECT '✅ Migración de precio de coste completada' as mensaje;
