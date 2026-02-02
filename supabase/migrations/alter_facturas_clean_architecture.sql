-- ============================================
-- ALTER TABLE: Facturas y Líneas (Clean Architecture)
-- ============================================
--
-- OBJETIVO: Añadir columnas faltantes para soportar la arquitectura
-- Clean Architecture del módulo de Facturas
--
-- CARACTERÍSTICAS:
-- - Non-destructive: Solo ALTER TABLE ADD COLUMN IF NOT EXISTS
-- - Borradores e Inmutabilidad: Columnas de auditoría
-- - Multi-tenancy: Compatible con RLS
-- - Retenciones IRPF: porcentaje_retencion
-- - Verifactu: estado_verifactu para tracking
-- - Facturas Rectificativas: factura_anulada_id
-- ============================================

-- ============================================
-- TABLA: facturas
-- ============================================

-- Tipo de factura (normal, rectificativa, simplificada)
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'normal';

COMMENT ON COLUMN facturas.tipo IS 'Tipo de factura: normal, rectificativa, simplificada, proforma';

-- Orden de reparación asociada (bridge entre módulos)
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS orden_id UUID REFERENCES ordenes_reparacion(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_orden ON facturas(orden_id);

COMMENT ON COLUMN facturas.orden_id IS 'Orden de reparación que originó esta factura (si aplica)';

-- NIF del cliente (desnormalizado para velocidad y GDPR)
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS cliente_nif VARCHAR(20);

COMMENT ON COLUMN facturas.cliente_nif IS 'NIF/CIF del cliente (desnormalizado para rendimiento en listados)';

-- Retención IRPF para profesionales
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS porcentaje_retencion DECIMAL(5,2) DEFAULT 0;

COMMENT ON COLUMN facturas.porcentaje_retencion IS 'Porcentaje de retención IRPF (0, 7, 15, 19, 21)';

-- Estado de Verifactu (tracking del proceso de firma)
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS estado_verifactu VARCHAR(50) DEFAULT 'pendiente';

COMMENT ON COLUMN facturas.estado_verifactu IS 'Estado Verifactu: pendiente, procesando, firmado, error';

-- Factura que anula (para rectificativas)
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS factura_anulada_id UUID REFERENCES facturas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_anulada ON facturas(factura_anulada_id);

COMMENT ON COLUMN facturas.factura_anulada_id IS 'ID de la factura que esta rectificativa anula';

-- Motivo de anulación (obligatorio legalmente)
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

COMMENT ON COLUMN facturas.motivo_anulacion IS 'Motivo de anulación (requerido si estado = anulada)';

-- Auditoría: Usuario que creó (borrador)
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_created_by ON facturas(created_by);

COMMENT ON COLUMN facturas.created_by IS 'Usuario que creó el borrador';

-- Auditoría: Usuario que emitió (cambio crítico de estado)
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS emitida_by UUID REFERENCES usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN facturas.emitida_by IS 'Usuario que emitió la factura (inmutabilidad fiscal)';

-- Auditoría: Usuario que anuló
ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS anulada_by UUID REFERENCES usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN facturas.anulada_by IS 'Usuario que anuló la factura';

-- Serie de facturación (normalizar nombre de columna)
-- Ya existe como "numero_serie", pero el dominio usa "serie"
-- Mantenemos compatibilidad y agregamos alias
COMMENT ON COLUMN facturas.numero_serie IS 'Serie de facturación (F=Factura, P=Presupuesto, R=Rectificativa)';

-- ============================================
-- TABLA: lineas_factura
-- ============================================

-- Tipo de línea (mano_obra, pieza, suplido, descuento)
ALTER TABLE lineas_factura
ADD COLUMN IF NOT EXISTS tipo_linea VARCHAR(50) DEFAULT 'pieza';

COMMENT ON COLUMN lineas_factura.tipo_linea IS 'Tipo: mano_obra, pieza, suplido, descuento';

-- Referencia/SKU del producto
ALTER TABLE lineas_factura
ADD COLUMN IF NOT EXISTS referencia VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_lineas_factura_referencia ON lineas_factura(referencia);

COMMENT ON COLUMN lineas_factura.referencia IS 'Código/SKU del producto o servicio';

-- Descuento por porcentaje
ALTER TABLE lineas_factura
ADD COLUMN IF NOT EXISTS descuento_porcentaje DECIMAL(5,2) DEFAULT 0;

COMMENT ON COLUMN lineas_factura.descuento_porcentaje IS 'Porcentaje de descuento (0-100)';

-- Descuento importe fijo
ALTER TABLE lineas_factura
ADD COLUMN IF NOT EXISTS descuento_importe DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN lineas_factura.descuento_importe IS 'Importe fijo de descuento';

-- ============================================
-- TABLA: verifactu_registros (NUEVA)
-- ============================================
--
-- Tabla para registro de firmas digitales Verifactu
-- Cumplimiento normativa española de facturación electrónica
--
CREATE TABLE IF NOT EXISTS verifactu_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

  -- Datos de Verifactu
  numero_verifactu VARCHAR(100) NOT NULL,
  url_verifactu TEXT,
  qr_url TEXT,
  xml_firmado TEXT,

  -- Hash encadenado (anti-manipulación blockchain-like)
  hash_encadenado VARCHAR(256),
  hash_factura_anterior VARCHAR(256),

  -- Estado del proceso
  estado VARCHAR(50) DEFAULT 'pendiente',
  tipo_huella VARCHAR(20) DEFAULT 'SHA256',

  -- Metadata
  fecha_firma TIMESTAMPTZ,
  fecha_envio_aeat TIMESTAMPTZ,
  respuesta_aeat JSONB,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  UNIQUE(taller_id, numero_verifactu)
);

CREATE INDEX IF NOT EXISTS idx_verifactu_factura ON verifactu_registros(factura_id);
CREATE INDEX IF NOT EXISTS idx_verifactu_taller ON verifactu_registros(taller_id);
CREATE INDEX IF NOT EXISTS idx_verifactu_estado ON verifactu_registros(estado);
CREATE INDEX IF NOT EXISTS idx_verifactu_hash ON verifactu_registros(hash_encadenado);

COMMENT ON TABLE verifactu_registros IS 'Registro de firmas digitales Verifactu para trazabilidad fiscal';
COMMENT ON COLUMN verifactu_registros.hash_encadenado IS 'Hash SHA256 encadenado para prevenir manipulación';
COMMENT ON COLUMN verifactu_registros.hash_factura_anterior IS 'Hash de la factura anterior en la cadena';

-- ============================================
-- TABLA: series_facturacion (NUEVA)
-- ============================================
--
-- Tabla para control de series de numeración
-- Usada por RPC asignar_numero_factura
--
CREATE TABLE IF NOT EXISTS series_facturacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

  -- Serie y año
  serie VARCHAR(10) NOT NULL,
  año INTEGER NOT NULL,

  -- Control de secuencia
  ultimo_numero INTEGER DEFAULT 0,

  -- Metadata
  descripcion TEXT,
  activa BOOLEAN DEFAULT TRUE,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(taller_id, serie, año)
);

CREATE INDEX IF NOT EXISTS idx_series_taller_serie ON series_facturacion(taller_id, serie, año);

COMMENT ON TABLE series_facturacion IS 'Control de series de numeración de facturas por taller y año';
COMMENT ON COLUMN series_facturacion.ultimo_numero IS 'Último número asignado (se incrementa atómicamente con FOR UPDATE)';

-- ============================================
-- TABLA: auditoria_facturas (NUEVA)
-- ============================================
--
-- Tabla de auditoría para cambios críticos en facturas
-- Especialmente cambios de estado (BORRADOR → EMITIDA)
--
CREATE TABLE IF NOT EXISTS auditoria_facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

  -- Evento
  evento VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),

  -- Datos del cambio
  cambios JSONB,
  motivo TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auditoria_factura ON auditoria_facturas(factura_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_taller ON auditoria_facturas(taller_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_evento ON auditoria_facturas(evento);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_facturas(created_at DESC);

COMMENT ON TABLE auditoria_facturas IS 'Registro de auditoría de cambios críticos en facturas (inmutabilidad)';
COMMENT ON COLUMN auditoria_facturas.evento IS 'Tipo de evento: creada, emitida, pagada, anulada, modificada';

-- ============================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================

-- Función genérica para updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger para facturas (si no existe)
DROP TRIGGER IF EXISTS set_facturas_updated_at ON facturas;
CREATE TRIGGER set_facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- Trigger para verifactu_registros
DROP TRIGGER IF EXISTS set_verifactu_updated_at ON verifactu_registros;
CREATE TRIGGER set_verifactu_updated_at
  BEFORE UPDATE ON verifactu_registros
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- Trigger para series_facturacion
DROP TRIGGER IF EXISTS set_series_updated_at ON series_facturacion;
CREATE TRIGGER set_series_updated_at
  BEFORE UPDATE ON series_facturacion
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================
-- VALIDACIONES A NIVEL DE BD
-- ============================================

-- Validación: Estado de factura debe ser válido
ALTER TABLE facturas
DROP CONSTRAINT IF EXISTS check_estado_valido;

ALTER TABLE facturas
ADD CONSTRAINT check_estado_valido
CHECK (estado IN ('borrador', 'emitida', 'pagada', 'anulada', 'vencida'));

-- Validación: Tipo de factura debe ser válido
ALTER TABLE facturas
DROP CONSTRAINT IF EXISTS check_tipo_valido;

ALTER TABLE facturas
ADD CONSTRAINT check_tipo_valido
CHECK (tipo IN ('normal', 'rectificativa', 'simplificada', 'proforma'));

-- Validación: Porcentaje de retención válido
ALTER TABLE facturas
DROP CONSTRAINT IF EXISTS check_retencion_valida;

ALTER TABLE facturas
ADD CONSTRAINT check_retencion_valida
CHECK (porcentaje_retencion >= 0 AND porcentaje_retencion <= 100);

-- Validación: Descuento porcentaje válido
ALTER TABLE lineas_factura
DROP CONSTRAINT IF EXISTS check_descuento_porcentaje_valido;

ALTER TABLE lineas_factura
ADD CONSTRAINT check_descuento_porcentaje_valido
CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 100);

-- Validación: Tipo de línea válido
ALTER TABLE lineas_factura
DROP CONSTRAINT IF EXISTS check_tipo_linea_valido;

ALTER TABLE lineas_factura
ADD CONSTRAINT check_tipo_linea_valido
CHECK (tipo_linea IN ('mano_obra', 'pieza', 'suplido', 'descuento', 'otro'));

-- ============================================
-- COMENTARIOS FINALES
-- ============================================

COMMENT ON CONSTRAINT check_estado_valido ON facturas IS
'Validación: Estado debe ser borrador, emitida, pagada, anulada o vencida';

COMMENT ON CONSTRAINT check_tipo_valido ON facturas IS
'Validación: Tipo debe ser normal, rectificativa, simplificada o proforma';

COMMENT ON CONSTRAINT check_retencion_valida ON facturas IS
'Validación: Retención IRPF entre 0% y 100%';

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
