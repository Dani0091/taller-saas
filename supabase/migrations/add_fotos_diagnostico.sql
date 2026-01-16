-- Migración: Añadir columna fotos_diagnostico a ordenes_reparacion
-- Fecha: 2026-01-16
-- Descripción: Permite guardar fotos del cuadro de instrumentos, testigos de fallo, etc.

-- Añadir columna si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ordenes_reparacion'
        AND column_name = 'fotos_diagnostico'
    ) THEN
        ALTER TABLE ordenes_reparacion ADD COLUMN fotos_diagnostico TEXT;
        COMMENT ON COLUMN ordenes_reparacion.fotos_diagnostico IS 'Fotos de diagnóstico (cuadro instrumentos, testigos, etc.)';
    END IF;
END $$;
