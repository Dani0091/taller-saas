-- Migración: Añadir soporte para Suplidos y Reembolsos en facturas
-- Fecha: 2025-01-19
-- Descripción: Documentar y preparar el campo tipo_linea para manejar suplidos y reembolsos

-- El campo tipo_linea ya existe en lineas_factura y soporta:
-- - 'servicio': Línea normal que suma a base imponible con IVA
-- - Nuevos tipos que añadimos:
-- - 'suplido': Gasto pagado en nombre del cliente (se suma directo al total sin IVA)
-- - 'reembolso': Gasto reembolsable (suma a base imponible con IVA)

-- Añadir comentario explicativo al campo
COMMENT ON COLUMN lineas_factura.tipo_linea IS 'Tipo de línea: servicio (normal con IVA), suplido (sin IVA, directo al total), reembolso (con IVA, suma a base)';

-- Crear índice si no existe para mejorar consultas por tipo
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lineas_factura_tipo_linea') THEN
        CREATE INDEX idx_lineas_factura_tipo_linea ON lineas_factura(tipo_linea);
    END IF;
END $$;

-- Crear función helper para calcular totales de factura con suplidos
CREATE OR REPLACE FUNCTION calcular_total_factura_con_suplidos(p_factura_id UUID)
RETURNS TABLE (
    subtotal NUMERIC,
    total_iva NUMERIC,
    total_suplidos NUMERIC,
    total_final NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Subtotal: suma de base_imponible de servicios y reembolsos (NO suplidos)
        COALESCE(SUM(CASE WHEN tipo_linea IN ('servicio', 'reembolso') THEN base_imponible ELSE 0 END), 0) as subtotal,
        -- IVA: suma de iva_importe de servicios y reembolsos
        COALESCE(SUM(CASE WHEN tipo_linea IN ('servicio', 'reembolso') THEN iva_importe ELSE 0 END), 0) as total_iva,
        -- Suplidos: suma de total_linea de suplidos (sin IVA)
        COALESCE(SUM(CASE WHEN tipo_linea = 'suplido' THEN total_linea ELSE 0 END), 0) as total_suplidos,
        -- Total final: subtotal + IVA + suplidos
        COALESCE(SUM(CASE WHEN tipo_linea IN ('servicio', 'reembolso') THEN total_linea ELSE total_linea END), 0) as total_final
    FROM lineas_factura
    WHERE factura_id = p_factura_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_total_factura_con_suplidos IS 'Calcula totales de factura considerando suplidos que no llevan IVA';
