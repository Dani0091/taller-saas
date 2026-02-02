-- ============================================
-- VERIFICACIÓN Y ACTUALIZACIÓN DE CAMPOS PERSONALIZABLES EN FACTURAS
-- ============================================
-- Este script asegura que todos los campos personalizables de facturas
-- estén presentes en la tabla taller_config
-- Ejecutar en Supabase SQL Editor si es necesario

-- ============================================
-- 1. VERIFICAR CAMPOS EXISTENTES
-- ============================================
-- Ejecuta esta consulta para ver qué campos tienes actualmente:
SELECT column_name, data_type, character_maximum_length, column_default
FROM information_schema.columns
WHERE table_name = 'taller_config'
AND column_name IN ('iban', 'condiciones_pago', 'notas_factura', 'notas_legales', 'color_primario', 'color_secundario')
ORDER BY column_name;

-- ============================================
-- 2. AGREGAR CAMPOS SI NO EXISTEN
-- ============================================
-- Estos comandos son seguros (IF NOT EXISTS)

-- IBAN para transferencias bancarias
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'taller_config' AND column_name = 'iban'
    ) THEN
        ALTER TABLE taller_config ADD COLUMN iban VARCHAR(34);
        RAISE NOTICE 'Campo iban agregado';
    ELSE
        RAISE NOTICE 'Campo iban ya existe';
    END IF;
END $$;

-- Condiciones de pago (texto que aparece en todas las facturas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'taller_config' AND column_name = 'condiciones_pago'
    ) THEN
        ALTER TABLE taller_config ADD COLUMN condiciones_pago TEXT DEFAULT 'Pago a 30 días';
        RAISE NOTICE 'Campo condiciones_pago agregado';
    ELSE
        RAISE NOTICE 'Campo condiciones_pago ya existe';
    END IF;
END $$;

-- Notas de factura (información legal, garantías, etc.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'taller_config' AND column_name = 'notas_factura'
    ) THEN
        ALTER TABLE taller_config ADD COLUMN notas_factura TEXT;
        RAISE NOTICE 'Campo notas_factura agregado';
    ELSE
        RAISE NOTICE 'Campo notas_factura ya existe';
    END IF;
END $$;

-- Notas legales adicionales (opcional)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'taller_config' AND column_name = 'notas_legales'
    ) THEN
        ALTER TABLE taller_config ADD COLUMN notas_legales TEXT;
        RAISE NOTICE 'Campo notas_legales agregado';
    ELSE
        RAISE NOTICE 'Campo notas_legales ya existe';
    END IF;
END $$;

-- Color primario para PDFs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'taller_config' AND column_name = 'color_primario'
    ) THEN
        ALTER TABLE taller_config ADD COLUMN color_primario VARCHAR(7) DEFAULT '#0ea5e9';
        RAISE NOTICE 'Campo color_primario agregado';
    ELSE
        RAISE NOTICE 'Campo color_primario ya existe';
    END IF;
END $$;

-- Color secundario para PDFs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'taller_config' AND column_name = 'color_secundario'
    ) THEN
        ALTER TABLE taller_config ADD COLUMN color_secundario VARCHAR(7) DEFAULT '#f97316';
        RAISE NOTICE 'Campo color_secundario agregado';
    ELSE
        RAISE NOTICE 'Campo color_secundario ya existe';
    END IF;
END $$;

-- ============================================
-- 3. VERIFICACIÓN FINAL
-- ============================================
-- Ejecuta esta consulta para confirmar que todo está correcto:
SELECT
    CASE
        WHEN COUNT(*) = 6 THEN '✅ Todos los campos están presentes'
        ELSE '⚠️ Faltan campos: ' || (6 - COUNT(*))::text
    END as estado,
    COUNT(*) as campos_encontrados
FROM information_schema.columns
WHERE table_name = 'taller_config'
AND column_name IN ('iban', 'condiciones_pago', 'notas_factura', 'notas_legales', 'color_primario', 'color_secundario');

-- ============================================
-- 4. EJEMPLO DE USO
-- ============================================
-- Actualizar la configuración del taller con valores de ejemplo:
/*
UPDATE taller_config
SET
    iban = 'ES00 0000 0000 0000 0000 0000',
    condiciones_pago = 'Pago a 30 días desde la fecha de emisión',
    notas_factura = 'Garantía de 12 meses en todas las reparaciones. No se aceptan devoluciones de piezas especiales.',
    color_primario = '#0284c7',
    color_secundario = '#0369a1'
WHERE taller_id = 'TU_TALLER_ID_AQUI';
*/

-- ============================================
-- 5. CONSULTAR CONFIGURACIÓN ACTUAL
-- ============================================
-- Ver la configuración actual de tu taller:
/*
SELECT
    id,
    taller_id,
    iban,
    condiciones_pago,
    notas_factura,
    color_primario,
    color_secundario
FROM taller_config
ORDER BY created_at DESC
LIMIT 5;
*/
