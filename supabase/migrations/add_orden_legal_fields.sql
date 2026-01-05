-- ============================================
-- MIGRACIÓN: Campos legales y compartir presupuesto
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Campos legales del formulario físico
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS nivel_combustible VARCHAR(10) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS renuncia_presupuesto BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS accion_imprevisto VARCHAR(20) DEFAULT 'avisar',
ADD COLUMN IF NOT EXISTS recoger_piezas BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS danos_carroceria TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS coste_diario_estancia DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS kilometros_entrada INTEGER DEFAULT NULL;

-- 2. Campos para compartir presupuesto con cliente
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS token_publico UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS fecha_envio_presupuesto TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fecha_aceptacion_cliente TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ip_aceptacion VARCHAR(45) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS firma_cliente TEXT DEFAULT NULL;

-- 3. Crear índice único para token público (acceso rápido)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ordenes_token_publico
ON ordenes_reparacion(token_publico);

-- 4. Política RLS para acceso público por token (lectura)
-- Primero verificamos si existe y la eliminamos
DROP POLICY IF EXISTS "Acceso público por token" ON ordenes_reparacion;

-- Crear política para lectura pública con token
CREATE POLICY "Acceso público por token" ON ordenes_reparacion
FOR SELECT
USING (
  token_publico IS NOT NULL
  AND fecha_envio_presupuesto IS NOT NULL
);

-- 5. Comentarios para documentar campos
COMMENT ON COLUMN ordenes_reparacion.nivel_combustible IS 'Nivel de combustible al entrar: E, 1/4, 1/2, 3/4, F';
COMMENT ON COLUMN ordenes_reparacion.renuncia_presupuesto IS 'Cliente renuncia a recibir presupuesto previo';
COMMENT ON COLUMN ordenes_reparacion.accion_imprevisto IS 'Qué hacer ante imprevistos: avisar o actuar';
COMMENT ON COLUMN ordenes_reparacion.recoger_piezas IS 'Cliente desea recoger piezas sustituidas';
COMMENT ON COLUMN ordenes_reparacion.danos_carroceria IS 'Descripción de daños preexistentes en carrocería';
COMMENT ON COLUMN ordenes_reparacion.coste_diario_estancia IS 'Coste diario de estancia en taller';
COMMENT ON COLUMN ordenes_reparacion.kilometros_entrada IS 'Kilómetros del vehículo al entrar al taller';
COMMENT ON COLUMN ordenes_reparacion.token_publico IS 'Token UUID para acceso público al presupuesto';
COMMENT ON COLUMN ordenes_reparacion.fecha_envio_presupuesto IS 'Fecha/hora de envío del presupuesto al cliente';
COMMENT ON COLUMN ordenes_reparacion.fecha_aceptacion_cliente IS 'Fecha/hora de aceptación por el cliente';
COMMENT ON COLUMN ordenes_reparacion.ip_aceptacion IS 'IP desde la que se aceptó el presupuesto';
COMMENT ON COLUMN ordenes_reparacion.firma_cliente IS 'Firma digital del cliente (base64 de imagen)';

-- ============================================
-- VERIFICACIÓN: Ejecutar para confirmar cambios
-- ============================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'ordenes_reparacion'
-- ORDER BY ordinal_position;
