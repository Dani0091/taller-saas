-- ============================================================
-- SPRINT B — Schema additions
-- Date: 2026-02-25
-- ============================================================

-- 1. ordenes_reparacion: kilometros_salida + numero_visual
ALTER TABLE ordenes_reparacion
  ADD COLUMN IF NOT EXISTS kilometros_salida INTEGER,
  ADD COLUMN IF NOT EXISTS numero_visual     VARCHAR(50);

-- 2. facturas: VeriFACTU chaining fields + simplificada flag
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS huella_hash              TEXT,
  ADD COLUMN IF NOT EXISTS encadenamiento_anterior  TEXT,
  ADD COLUMN IF NOT EXISTS es_simplificada          BOOLEAN DEFAULT FALSE;

-- 3. Index for fast plate lookups (used by matricula-first search)
CREATE INDEX IF NOT EXISTS idx_vehiculos_matricula_taller
  ON vehiculos(taller_id, matricula);

-- 4. Index for VeriFACTU chain: last emitted invoice per taller
CREATE INDEX IF NOT EXISTS idx_facturas_taller_emitida_created
  ON facturas(taller_id, created_at DESC)
  WHERE estado IN ('emitida', 'pagada');

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON COLUMN ordenes_reparacion.kilometros_salida IS
  'Kilómetros registrados en la entrega del vehículo';

COMMENT ON COLUMN facturas.huella_hash IS
  'SHA-256 de los campos fiscales de la factura. Requisito VeriFACTU.';

COMMENT ON COLUMN facturas.encadenamiento_anterior IS
  'huella_hash de la factura inmediatamente anterior del mismo taller. VeriFACTU.';

COMMENT ON COLUMN facturas.es_simplificada IS
  'TRUE cuando la factura se generó con Cobro Rápido (importe < 3000€, normativa ES).';
