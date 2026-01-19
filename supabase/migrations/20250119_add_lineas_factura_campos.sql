-- Migración: Añadir campos faltantes a lineas_factura para soportar cálculos completos
-- Fecha: 2025-01-19
-- Descripción: Asegura que todos los campos necesarios existan en la tabla lineas_factura

-- Añadir campo numero_linea si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='lineas_factura' AND column_name='numero_linea') THEN
        ALTER TABLE lineas_factura ADD COLUMN numero_linea INTEGER DEFAULT 1;
    END IF;
END $$;

-- Añadir campo concepto si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='lineas_factura' AND column_name='concepto') THEN
        ALTER TABLE lineas_factura ADD COLUMN concepto VARCHAR(255);
    END IF;
END $$;

-- Añadir campo base_imponible si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='lineas_factura' AND column_name='base_imponible') THEN
        ALTER TABLE lineas_factura ADD COLUMN base_imponible DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- Añadir campo iva_porcentaje si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='lineas_factura' AND column_name='iva_porcentaje') THEN
        ALTER TABLE lineas_factura ADD COLUMN iva_porcentaje DECIMAL(5,2) DEFAULT 21;
    END IF;
END $$;

-- Añadir campo iva_importe si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='lineas_factura' AND column_name='iva_importe') THEN
        ALTER TABLE lineas_factura ADD COLUMN iva_importe DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- Añadir campo total_linea si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='lineas_factura' AND column_name='total_linea') THEN
        ALTER TABLE lineas_factura ADD COLUMN total_linea DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- Añadir campo importe_total si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='lineas_factura' AND column_name='importe_total') THEN
        ALTER TABLE lineas_factura ADD COLUMN importe_total DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- Añadir campo tipo para soportar suplidos/reembolsos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='lineas_factura' AND column_name='tipo') THEN
        ALTER TABLE lineas_factura ADD COLUMN tipo VARCHAR(50) DEFAULT 'servicio';
        COMMENT ON COLUMN lineas_factura.tipo IS 'Tipo de línea: servicio, suplido, reembolso';
    END IF;
END $$;

-- Crear índice en factura_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lineas_factura_factura_id') THEN
        CREATE INDEX idx_lineas_factura_factura_id ON lineas_factura(factura_id);
    END IF;
END $$;

-- Comentarios explicativos
COMMENT ON COLUMN lineas_factura.tipo IS 'servicio: suma a base imponible con IVA | suplido: suma directo al total sin IVA | reembolso: suma a base imponible con IVA';
COMMENT ON COLUMN lineas_factura.base_imponible IS 'Base imponible de la línea (cantidad * precio_unitario)';
COMMENT ON COLUMN lineas_factura.iva_importe IS 'Importe del IVA de la línea';
COMMENT ON COLUMN lineas_factura.total_linea IS 'Total de la línea (base_imponible + iva_importe)';
