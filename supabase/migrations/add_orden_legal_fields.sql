-- Migración para añadir campos del formulario físico de orden de trabajo
-- Ejecutar en Supabase SQL Editor

-- Campos legales y adicionales para ordenes_reparacion
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS nivel_combustible VARCHAR(10) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS renuncia_presupuesto BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS accion_imprevisto VARCHAR(20) DEFAULT 'avisar',
ADD COLUMN IF NOT EXISTS recoger_piezas BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS danos_carroceria TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS coste_diario_estancia DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS kilometros_entrada INTEGER DEFAULT NULL;

-- Comentarios para documentar los campos
COMMENT ON COLUMN ordenes_reparacion.nivel_combustible IS 'Nivel de combustible al entrar: E, 1/4, 1/2, 3/4, F';
COMMENT ON COLUMN ordenes_reparacion.renuncia_presupuesto IS 'Cliente renuncia a recibir presupuesto previo';
COMMENT ON COLUMN ordenes_reparacion.accion_imprevisto IS 'Qué hacer ante imprevistos: avisar o actuar';
COMMENT ON COLUMN ordenes_reparacion.recoger_piezas IS 'Cliente desea recoger piezas sustituidas';
COMMENT ON COLUMN ordenes_reparacion.danos_carroceria IS 'Descripción de daños preexistentes en carrocería';
COMMENT ON COLUMN ordenes_reparacion.coste_diario_estancia IS 'Coste diario de estancia en taller';
COMMENT ON COLUMN ordenes_reparacion.kilometros_entrada IS 'Kilómetros del vehículo al entrar al taller';
