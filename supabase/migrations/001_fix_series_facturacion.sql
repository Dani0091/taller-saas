-- ============================================
-- MIGRACIÓN: Fix Series de Facturación
-- ============================================
-- Propósito: Corregir el schema de series_facturacion para que coincida
-- con el RPC asignar_numero_factura
-- Fecha: 2026-01-29
-- Crítico: Necesario para producción
-- ============================================

-- 1. Verificar si la tabla existe y su estructura actual
DO $$
BEGIN
  -- Si la tabla existe con estructura antigua, la modificamos
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'series_facturacion'
  ) THEN
    -- Agregar columnas faltantes si no existen
    ALTER TABLE series_facturacion
    ADD COLUMN IF NOT EXISTS serie VARCHAR(20),
    ADD COLUMN IF NOT EXISTS año INTEGER;

    -- Si tiene "prefijo" pero no "serie", copiar prefijo a serie
    UPDATE series_facturacion
    SET serie = prefijo
    WHERE serie IS NULL AND prefijo IS NOT NULL;

    -- Si tiene "año" NULL, poner año actual
    UPDATE series_facturacion
    SET año = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
    WHERE año IS NULL;

    -- Crear índice único para evitar duplicados por taller/serie/año
    CREATE UNIQUE INDEX IF NOT EXISTS idx_series_facturacion_taller_serie_año
    ON series_facturacion(taller_id, serie, año);

  ELSE
    -- Si no existe, crear la tabla completa
    CREATE TABLE series_facturacion (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
      serie VARCHAR(20) NOT NULL,
      año INTEGER NOT NULL,
      prefijo VARCHAR(10), -- Mantener por compatibilidad
      nombre VARCHAR(100),
      descripcion TEXT,
      ultimo_numero INTEGER DEFAULT 0,
      activa BOOLEAN DEFAULT TRUE,
      es_predeterminada BOOLEAN DEFAULT FALSE,
      tipo VARCHAR(50) DEFAULT 'ordinaria',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(taller_id, serie, año)
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_series_facturacion_taller
    ON series_facturacion(taller_id);

    CREATE INDEX IF NOT EXISTS idx_series_facturacion_activa
    ON series_facturacion(activa) WHERE activa = TRUE;

    -- Comentario
    COMMENT ON TABLE series_facturacion IS
    'Tabla de series de facturación con numeración correlativa por taller, serie y año';

  END IF;
END $$;

-- 2. Verificar que el RPC asignar_numero_factura existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'asignar_numero_factura'
  ) THEN
    RAISE NOTICE 'ATENCIÓN: El RPC asignar_numero_factura NO está creado. Ejecuta rpc_asignar_numero_factura.sql';
  ELSE
    RAISE NOTICE '✅ RPC asignar_numero_factura encontrado';
  END IF;
END $$;

-- 3. Datos de ejemplo: Serie F para facturas (solo si no existe)
-- Nota: Reemplazar 'taller-id-ejemplo' con el UUID real del taller
/*
INSERT INTO series_facturacion (taller_id, serie, año, prefijo, nombre, ultimo_numero, activa, es_predeterminada)
VALUES
  ('taller-id-ejemplo'::UUID, 'F', 2026, 'F', 'Facturas Ordinarias', 0, TRUE, TRUE)
ON CONFLICT (taller_id, serie, año) DO NOTHING;
*/

-- 4. Verificación post-migración
SELECT
  'Series en BD:' as check_point,
  COUNT(*) as total,
  COUNT(DISTINCT taller_id) as talleres,
  COUNT(DISTINCT serie) as series_distintas
FROM series_facturacion;

-- Ver estructura final
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'series_facturacion'
ORDER BY ordinal_position;
