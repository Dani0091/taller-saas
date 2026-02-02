-- ============================================
-- SETUP: Series de Facturación para R&S Automoción
-- ============================================
-- Este archivo contiene todas las queries necesarias para:
-- 1. Buscar tu taller
-- 2. Arreglar el schema de series_facturacion
-- 3. Crear las series F, P, R
-- 4. Verificar y modificar desde la interfaz
-- ============================================

-- ============================================
-- PASO 1: BUSCAR TU TALLER
-- ============================================
-- Ejecuta esta query para encontrar tu taller_id

SELECT
  id,
  nombre,
  nif,
  email,
  ciudad,
  created_at
FROM talleres
WHERE nombre ILIKE '%R&S%' OR nombre ILIKE '%automocion%' OR nombre ILIKE '%rys%';

-- Si no aparece, intenta con más variaciones:
SELECT id, nombre, email, ciudad
FROM talleres
WHERE nombre ILIKE '%automocion%';

-- O busca TODOS los talleres para encontrarlo:
SELECT id, nombre, email, ciudad
FROM talleres
ORDER BY created_at DESC;

-- ============================================
-- PASO 2: ARREGLAR SCHEMA (Añadir columnas faltantes)
-- ============================================
-- IMPORTANTE: Ejecuta esto PRIMERO para añadir las columnas necesarias

DO $$
BEGIN
  -- Añadir columnas faltantes si no existen
  ALTER TABLE series_facturacion
  ADD COLUMN IF NOT EXISTS serie VARCHAR(20),
  ADD COLUMN IF NOT EXISTS año INTEGER,
  ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS es_predeterminada BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'ordinaria',
  ADD COLUMN IF NOT EXISTS descripcion TEXT;

  RAISE NOTICE '✅ Columnas añadidas correctamente';

  -- Migrar datos si tiene columna "prefijo" pero no "serie"
  UPDATE series_facturacion
  SET serie = prefijo
  WHERE serie IS NULL AND prefijo IS NOT NULL;

  -- Establecer año actual si es NULL
  UPDATE series_facturacion
  SET año = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  WHERE año IS NULL;

  -- Establecer activa = TRUE si es NULL
  UPDATE series_facturacion
  SET activa = TRUE
  WHERE activa IS NULL;

  RAISE NOTICE '✅ Datos migrados correctamente';
END $$;

-- Verificar estructura final
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'series_facturacion'
ORDER BY ordinal_position;

-- ============================================
-- PASO 3: CREAR SERIES PARA TU TALLER
-- ============================================
-- IMPORTANTE: Reemplaza 'TU-TALLER-UUID-AQUI' con el UUID que obtuviste en PASO 1

-- ⚠️ COPIA EL UUID DE TU TALLER AQUÍ ⚠️
-- Ejemplo: '12345678-1234-1234-1234-123456789012'

-- Serie F: Facturas Ordinarias
INSERT INTO series_facturacion (
  taller_id,
  serie,
  año,
  prefijo,
  nombre,
  descripcion,
  ultimo_numero,
  activa,
  es_predeterminada,
  tipo
)
VALUES (
  'TU-TALLER-UUID-AQUI'::UUID,  -- ⚠️ REEMPLAZAR ESTO
  'F',                           -- Serie
  2026,                          -- Año
  'F',                           -- Prefijo (igual a serie)
  'Facturas Ordinarias',         -- Nombre descriptivo
  'Serie principal para facturas normales',
  0,                             -- Último número (empezar en 0)
  TRUE,                          -- Activa
  TRUE,                          -- Es predeterminada (la usará por defecto)
  'ordinaria'                    -- Tipo
)
ON CONFLICT (taller_id, serie, año) DO UPDATE SET
  activa = TRUE,
  es_predeterminada = TRUE;

-- Serie P: Proformas
INSERT INTO series_facturacion (
  taller_id,
  serie,
  año,
  prefijo,
  nombre,
  descripcion,
  ultimo_numero,
  activa,
  es_predeterminada,
  tipo
)
VALUES (
  'TU-TALLER-UUID-AQUI'::UUID,  -- ⚠️ REEMPLAZAR ESTO
  'P',
  2026,
  'P',
  'Proformas',
  'Serie para presupuestos y proformas',
  0,
  TRUE,
  FALSE,  -- NO es predeterminada
  'proforma'
)
ON CONFLICT (taller_id, serie, año) DO UPDATE SET
  activa = TRUE;

-- Serie R: Rectificativas
INSERT INTO series_facturacion (
  taller_id,
  serie,
  año,
  prefijo,
  nombre,
  descripcion,
  ultimo_numero,
  activa,
  es_predeterminada,
  tipo
)
VALUES (
  'TU-TALLER-UUID-AQUI'::UUID,  -- ⚠️ REEMPLAZAR ESTO
  'R',
  2026,
  'R',
  'Rectificativas',
  'Serie para facturas rectificativas',
  0,
  TRUE,
  FALSE,
  'rectificativa'
)
ON CONFLICT (taller_id, serie, año) DO UPDATE SET
  activa = TRUE;

-- ============================================
-- PASO 4: VERIFICAR LAS SERIES CREADAS
-- ============================================
-- Ver tus series (reemplaza el UUID)

SELECT
  id,
  serie,
  año,
  nombre,
  ultimo_numero,
  activa,
  es_predeterminada,
  tipo,
  created_at
FROM series_facturacion
WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID  -- ⚠️ REEMPLAZAR ESTO
ORDER BY serie, año;

-- ============================================
-- QUERIES ÚTILES PARA MODIFICAR DESDE SQL
-- ============================================

-- Cambiar número inicial de una serie (si necesitas empezar desde otro número)
UPDATE series_facturacion
SET ultimo_numero = 100  -- El número que quieras
WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID
  AND serie = 'F'
  AND año = 2026;

-- Desactivar una serie
UPDATE series_facturacion
SET activa = FALSE
WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID
  AND serie = 'P'
  AND año = 2026;

-- Activar una serie
UPDATE series_facturacion
SET activa = TRUE
WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID
  AND serie = 'P'
  AND año = 2026;

-- Cambiar cuál es la serie predeterminada
-- Primero quitar predeterminada de todas
UPDATE series_facturacion
SET es_predeterminada = FALSE
WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID
  AND año = 2026;

-- Luego establecer la nueva predeterminada
UPDATE series_facturacion
SET es_predeterminada = TRUE
WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID
  AND serie = 'F'
  AND año = 2026;

-- Cambiar el nombre o descripción
UPDATE series_facturacion
SET
  nombre = 'Nuevo Nombre',
  descripcion = 'Nueva descripción'
WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID
  AND serie = 'F'
  AND año = 2026;

-- Eliminar una serie (solo si no tiene facturas asociadas)
DELETE FROM series_facturacion
WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID
  AND serie = 'R'
  AND año = 2026;

-- ============================================
-- QUERIES DE MONITOREO
-- ============================================

-- Ver últimas facturas emitidas con sus números
SELECT
  numero_factura,
  fecha_emision,
  total,
  estado,
  created_at
FROM facturas
WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID
ORDER BY created_at DESC
LIMIT 20;

-- Ver estado de numeración por serie
SELECT
  serie,
  año,
  nombre,
  ultimo_numero,
  activa,
  CONCAT(serie, '-', año, '-', LPAD((ultimo_numero + 1)::TEXT, 6, '0')) as proxima_factura
FROM series_facturacion
WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID
ORDER BY serie, año;

-- ============================================
-- MODIFICAR DESDE LA INTERFAZ WEB
-- ============================================
-- Las series YA son modificables desde:
-- /dashboard/configuracion
--
-- En la sección "Series de Facturación" puedes:
-- ✅ Ver todas tus series
-- ✅ Crear nuevas series
-- ✅ Editar nombre, prefijo, número actual
-- ✅ Activar/desactivar series
-- ✅ Eliminar series (si no tienen facturas)
--
-- Los cambios se guardan automáticamente en la BD
-- ============================================

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- Si las series no aparecen en la interfaz:
-- 1. Verifica que el taller_id es correcto
SELECT id, nombre FROM talleres WHERE nombre ILIKE '%R&S%';

-- 2. Verifica que las series existen
SELECT COUNT(*) FROM series_facturacion WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID;

-- 3. Verifica la estructura de la tabla
SELECT column_name FROM information_schema.columns WHERE table_name = 'series_facturacion';

-- Si hay errores al crear facturas:
-- 1. Verifica que el RPC existe
SELECT proname FROM pg_proc WHERE proname = 'asignar_numero_factura';

-- 2. Verifica que las series están activas
SELECT serie, activa FROM series_facturacion WHERE taller_id = 'TU-TALLER-UUID-AQUI'::UUID;

-- ============================================
-- FIN
-- ============================================
