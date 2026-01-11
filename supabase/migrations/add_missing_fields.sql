-- ============================================
-- MIGRACIÓN: Campos faltantes en múltiples tablas
-- TallerAgil - Solo operaciones ADD (no destructivas)
-- Fecha: 2025-01
-- ============================================

-- NOTA: Esta migración es 100% segura:
-- - Solo usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- - NO elimina nada
-- - NO modifica datos existentes
-- - Puede ejecutarse múltiples veces sin problema

-- ============================================
-- PARTE 1: TABLA FACTURAS - Campos VERI*FACTU
-- ============================================

-- Campos básicos de factura
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS serie VARCHAR(10) DEFAULT 'A';
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS orden_id UUID REFERENCES ordenes_reparacion(id) ON DELETE SET NULL;

-- Campos VERI*FACTU (preparados para cuando sea obligatorio)
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS numero_verifactu VARCHAR(20);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_huella VARCHAR(64);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_tipo_huella VARCHAR(2) DEFAULT '01';
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_huella_anterior VARCHAR(64);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_qr_url TEXT;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_xml TEXT;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_frase VARCHAR(100);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_fecha_generacion TIMESTAMP WITH TIME ZONE;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_estado VARCHAR(20) DEFAULT 'pendiente';
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_software_nombre VARCHAR(100);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_software_version VARCHAR(20);

-- ============================================
-- PARTE 2: TABLA LINEAS_FACTURA - Campo numero_linea
-- ============================================

ALTER TABLE lineas_factura ADD COLUMN IF NOT EXISTS numero_linea INTEGER DEFAULT 1;

-- ============================================
-- PARTE 3: TABLA VEHICULOS - Campos adicionales
-- ============================================

ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS version VARCHAR(100);

-- ============================================
-- PARTE 4: TABLA TALLER_CONFIG - Campos dirección completa
-- ============================================

ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10);
ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS provincia VARCHAR(100);
ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS pais VARCHAR(100) DEFAULT 'España';
ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS web VARCHAR(255);

-- Campos para numeración de facturas
ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS ultimo_numero_factura INTEGER DEFAULT 0;
ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS prefijo_factura VARCHAR(10) DEFAULT '';

-- Notas legales para facturas
ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS notas_legales TEXT;

-- ============================================
-- PARTE 5: TABLA TALLERES - Campos adicionales
-- ============================================

ALTER TABLE talleres ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10);
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS provincia VARCHAR(100);
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS pais VARCHAR(100) DEFAULT 'España';
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS web VARCHAR(255);

-- ============================================
-- PARTE 6: ÍNDICES ADICIONALES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero);
CREATE INDEX IF NOT EXISTS idx_facturas_serie ON facturas(serie);
CREATE INDEX IF NOT EXISTS idx_facturas_vehiculo ON facturas(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_facturas_orden ON facturas(orden_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_vin ON vehiculos(vin);

-- ============================================
-- VERIFICACIÓN (opcional - ejecutar aparte)
-- ============================================
-- Para verificar que las columnas se crearon:
--
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('facturas', 'lineas_factura', 'vehiculos', 'taller_config', 'talleres')
-- AND column_name IN (
--   'serie', 'numero', 'vehiculo_id', 'orden_id',
--   'numero_verifactu', 'verifactu_huella', 'verifactu_tipo_huella',
--   'verifactu_qr_url', 'verifactu_xml', 'verifactu_estado',
--   'numero_linea', 'version', 'codigo_postal', 'ciudad', 'provincia'
-- )
-- ORDER BY table_name, column_name;
