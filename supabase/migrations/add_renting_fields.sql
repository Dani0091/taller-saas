-- ============================================
-- MIGRACIÓN: Campos para Renting/Flotas
-- ============================================
-- Añade campos adicionales para clientes de renting como
-- Santander, ALD, Alphabet, etc.

-- Campos en facturas
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS numero_autorizacion VARCHAR(100);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS referencia_externa VARCHAR(255);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS persona_contacto VARCHAR(255);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS telefono_contacto VARCHAR(50);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS notas_internas TEXT;

-- Añadir comentarios descriptivos
COMMENT ON COLUMN facturas.numero_autorizacion IS 'Número de autorización requerido por empresas de renting (ej: GT Global)';
COMMENT ON COLUMN facturas.referencia_externa IS 'Referencia externa del cliente (número de expediente, pedido, etc.)';
COMMENT ON COLUMN facturas.persona_contacto IS 'Nombre de la persona de contacto para esta factura';
COMMENT ON COLUMN facturas.telefono_contacto IS 'Teléfono de contacto específico para esta factura';
COMMENT ON COLUMN facturas.notas_internas IS 'Notas internas visibles solo para el taller';

-- ============================================
-- CAMPOS EN CLIENTES (para renting)
-- ============================================
-- Tipo de cliente para aplicar reglas específicas
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(50) DEFAULT 'particular';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS requiere_autorizacion BOOLEAN DEFAULT FALSE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empresa_renting VARCHAR(100);

COMMENT ON COLUMN clientes.tipo_cliente IS 'Tipo: particular, empresa, autonomo, flota, renting';
COMMENT ON COLUMN clientes.requiere_autorizacion IS 'Si true, se requerirá número de autorización al facturar';
COMMENT ON COLUMN clientes.empresa_renting IS 'Nombre de la empresa de renting (Santander, ALD, etc.)';

-- ============================================
-- ÍNDICE PARA BÚSQUEDAS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_facturas_autorizacion ON facturas(numero_autorizacion);
CREATE INDEX IF NOT EXISTS idx_facturas_referencia ON facturas(referencia_externa);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON clientes(tipo_cliente);
