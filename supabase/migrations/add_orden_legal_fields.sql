-- ============================================
-- MIGRACIÓN SEGURA: Campos para órdenes de trabajo
-- TallerAgil - Solo operaciones ADD (no destructivas)
-- ============================================

-- NOTA: Esta migración es 100% segura:
-- - Solo usa IF NOT EXISTS (no falla si ya existe)
-- - NO elimina nada
-- - NO modifica datos existentes
-- - Puede ejecutarse múltiples veces sin problema

-- ============================================
-- PARTE 1: Campos del formulario físico
-- ============================================

-- Nivel de combustible al recibir vehículo
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS nivel_combustible VARCHAR(10) DEFAULT NULL;

-- Cliente renuncia a presupuesto previo
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS renuncia_presupuesto BOOLEAN DEFAULT FALSE;

-- Qué hacer ante imprevistos: 'avisar' o 'actuar'
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS accion_imprevisto VARCHAR(20) DEFAULT 'avisar';

-- Cliente desea recoger piezas sustituidas
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS recoger_piezas BOOLEAN DEFAULT FALSE;

-- Daños preexistentes en carrocería
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS danos_carroceria TEXT DEFAULT NULL;

-- Coste diario de estancia en taller
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS coste_diario_estancia DECIMAL(10,2) DEFAULT NULL;

-- Kilómetros del vehículo al entrar
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS kilometros_entrada INTEGER DEFAULT NULL;

-- ============================================
-- PARTE 2: Campos para compartir presupuesto
-- ============================================

-- Token único para acceso público (sin login)
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS token_publico UUID DEFAULT gen_random_uuid();

-- Fecha/hora de envío del presupuesto
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS fecha_envio_presupuesto TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Fecha/hora de aceptación por el cliente
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS fecha_aceptacion_cliente TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- IP desde la que se aceptó (para auditoría)
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS ip_aceptacion VARCHAR(45) DEFAULT NULL;

-- Firma digital del cliente (base64)
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS firma_cliente TEXT DEFAULT NULL;

-- ============================================
-- PARTE 3: Índice para búsqueda por token
-- ============================================

-- Índice único para acceso rápido por token público
-- (permite buscar órdenes por su enlace compartido)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ordenes_token_publico
ON ordenes_reparacion(token_publico);

-- ============================================
-- VERIFICACIÓN (opcional - ejecutar aparte)
-- ============================================
-- Para verificar que las columnas se crearon:
--
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'ordenes_reparacion'
-- AND column_name IN (
--   'nivel_combustible', 'renuncia_presupuesto', 'accion_imprevisto',
--   'recoger_piezas', 'danos_carroceria', 'coste_diario_estancia',
--   'kilometros_entrada', 'token_publico', 'fecha_envio_presupuesto',
--   'fecha_aceptacion_cliente', 'ip_aceptacion', 'firma_cliente'
-- )
-- ORDER BY column_name;
