/**
 * Migración: Verifactu - Envío a AEAT
 * Fecha: 2026-09-05
 *
 * Cambios:
 * 1. Nuevas columnas en facturas para gestionar envío a AEAT
 * 2. Tabla aeat_submission_queue para cola de envíos asincronáticos
 * 3. Nuevas columnas en taller_config para certificados por taller
 * 4. Nuevas columnas en taller_config para datos SIF dinámicos
 */

-- ============================================================================
-- 1. Agregar columnas a tabla FACTURAS (respuesta AEAT)
-- ============================================================================

ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_csv VARCHAR(20) COMMENT 'Código Seguro de Verificación de AEAT';
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_respuesta_aeat JSONB COMMENT 'Respuesta completa de AEAT (CSV, errores, timestamp)';
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_intentos_envio INT DEFAULT 0 COMMENT 'Número de intentos realizados para enviar a AEAT';
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_ultimo_error TEXT COMMENT 'Último error recibido de AEAT';
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS verifactu_fecha_envio TIMESTAMPTZ COMMENT 'Fecha y hora del envío a AEAT';

-- ============================================================================
-- 2. Tabla AEAT_SUBMISSION_QUEUE - Cola de envíos
-- ============================================================================

CREATE TABLE IF NOT EXISTS aeat_submission_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  numero_verifactu VARCHAR(20) NOT NULL,
  xml_a_enviar TEXT NOT NULL COMMENT 'XML SOAP completo a enviar',
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente'
    COMMENT 'pendiente | enviando | completado | error | fallido_permanente',
  intentos INT NOT NULL DEFAULT 0 COMMENT 'Número de intentos de envío',
  proximo_reintento TIMESTAMPTZ COMMENT 'Cuándo reintentar (backoff exponencial)',
  error_mensaje TEXT COMMENT 'Mensaje de error del último intento',
  respuesta_aeat JSONB COMMENT 'Respuesta completa de AEAT',
  csv_aeat VARCHAR(20) COMMENT 'Código Seguro de Verificación (si exitoso)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id),
  CONSTRAINT aeat_queue_factura_unique UNIQUE(factura_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_aeat_queue_taller_id ON aeat_submission_queue(taller_id);
CREATE INDEX IF NOT EXISTS idx_aeat_queue_estado ON aeat_submission_queue(estado);
CREATE INDEX IF NOT EXISTS idx_aeat_queue_proximo_reintento ON aeat_submission_queue(proximo_reintento)
  WHERE estado IN ('pendiente', 'error');
CREATE INDEX IF NOT EXISTS idx_aeat_queue_numero_verifactu ON aeat_submission_queue(numero_verifactu);

-- ============================================================================
-- 3. Agregar columnas a tabla TALLER_CONFIG (certificados por taller)
-- ============================================================================

ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS certificado_verifactu_b64 TEXT
  COMMENT 'Certificado AEAT en formato base64 (PKCS#12)';
ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS certificado_verifactu_password_encrypted TEXT
  COMMENT 'Contraseña del certificado (encriptada con AEAT_ENCRYPTION_KEY)';
ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS verifactu_enabled BOOLEAN DEFAULT false
  COMMENT 'Si está habilitado envío a AEAT para este taller';

-- ============================================================================
-- 4. Agregar columnas a tabla TALLER_CONFIG (datos SIF dinámicos)
-- ============================================================================

ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS nif_software_sif VARCHAR(20)
  COMMENT 'NIF del taller para software SIF (usado en Verifactu)';
ALTER TABLE taller_config ADD COLUMN IF NOT EXISTS nombre_legal VARCHAR(255)
  COMMENT 'Razón social del taller (usado en Verifactu)';

-- ============================================================================
-- 5. TRIGGER para actualizar updated_at en aeat_submission_queue
-- ============================================================================

CREATE OR REPLACE FUNCTION update_aeat_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS aeat_queue_updated_at_trigger ON aeat_submission_queue;
CREATE TRIGGER aeat_queue_updated_at_trigger
BEFORE UPDATE ON aeat_submission_queue
FOR EACH ROW
EXECUTE FUNCTION update_aeat_queue_updated_at();

-- ============================================================================
-- 6. RLS - Row Level Security para aeat_submission_queue
-- ============================================================================

ALTER TABLE aeat_submission_queue ENABLE ROW LEVEL SECURITY;

-- Política: El usuario solo puede ver envíos de su taller
DROP POLICY IF EXISTS aeat_queue_select_policy ON aeat_submission_queue;
CREATE POLICY aeat_queue_select_policy ON aeat_submission_queue
  FOR SELECT
  USING (taller_id = public.get_my_taller_id());

-- Política: El usuario solo puede insertar para su taller
DROP POLICY IF EXISTS aeat_queue_insert_policy ON aeat_submission_queue;
CREATE POLICY aeat_queue_insert_policy ON aeat_submission_queue
  FOR INSERT
  WITH CHECK (taller_id = public.get_my_taller_id());

-- Política: El usuario solo puede actualizar envíos de su taller
DROP POLICY IF EXISTS aeat_queue_update_policy ON aeat_submission_queue;
CREATE POLICY aeat_queue_update_policy ON aeat_submission_queue
  FOR UPDATE
  USING (taller_id = public.get_my_taller_id())
  WITH CHECK (taller_id = public.get_my_taller_id());

-- ============================================================================
-- 7. RLS para columnas de taller_config
-- ============================================================================

-- Nota: taller_config ya tiene RLS, solo se aplica a las nuevas columnas
-- Las nuevas columnas heredan el RLS de la tabla

-- ============================================================================
-- 8. Índice para auditoría (logs de cambios en Verifactu)
-- ============================================================================

ALTER TABLE auditoria_facturas ADD COLUMN IF NOT EXISTS verifactu_intentos INT
  COMMENT 'Número de intentos de envío a AEAT en el momento del evento';

-- ============================================================================
-- FINALIZADO
-- ============================================================================
COMMENT ON TABLE aeat_submission_queue IS 'Cola de envíos de facturas a AEAT. Gestiona reintentos asincronáticos con backoff exponencial.';
