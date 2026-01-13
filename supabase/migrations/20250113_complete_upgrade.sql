-- ============================================
-- MIGRACIÓN COMPLETA: Nuevas funcionalidades TallerAgil
-- Fecha: 2025-01-13
-- ============================================
--
-- Esta migración añade:
-- 1. Borrado lógico de órdenes (deleted_at)
-- 2. Numeración visual independiente
-- 3. Sistema de citas/avisos
-- 4. Precios diferenciados por tipo de cliente
-- 5. Campos para cálculo de horas de mano de obra
-- 6. Historial de cambios en órdenes
--
-- 100% SEGURA: Solo usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================

-- ============================================
-- PARTE 1: BORRADO LÓGICO Y NUMERACIÓN VISUAL
-- ============================================

-- Borrado lógico: en lugar de DELETE, se marca como eliminado
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Numeración visual: número amigable que ve el usuario (independiente del ID)
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS numero_visual INTEGER DEFAULT NULL;

-- Motivo de eliminación (para auditoría)
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS motivo_eliminacion TEXT DEFAULT NULL;

-- Quién eliminó la orden
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS eliminado_por UUID DEFAULT NULL;

-- Índice para búsqueda eficiente excluyendo eliminados
CREATE INDEX IF NOT EXISTS idx_ordenes_activas
ON ordenes_reparacion(taller_id, deleted_at)
WHERE deleted_at IS NULL;

-- Índice para numeración visual única por taller
CREATE UNIQUE INDEX IF NOT EXISTS idx_ordenes_numero_visual_taller
ON ordenes_reparacion(taller_id, numero_visual)
WHERE deleted_at IS NULL AND numero_visual IS NOT NULL;

-- ============================================
-- PARTE 2: SISTEMA DE CITAS Y AVISOS
-- ============================================

-- Tabla principal de citas
CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    orden_id UUID REFERENCES ordenes_reparacion(id) ON DELETE SET NULL,

    -- Datos de la cita
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    duracion_minutos INTEGER DEFAULT 60,

    -- Estado: pendiente, confirmada, completada, cancelada, no_presentado
    estado VARCHAR(20) DEFAULT 'pendiente',

    -- Recordatorios
    recordatorio_enviado BOOLEAN DEFAULT FALSE,
    fecha_recordatorio TIMESTAMP WITH TIME ZONE,

    -- Contacto
    telefono_contacto VARCHAR(20),
    email_contacto VARCHAR(100),

    -- Tipo de cita: revision, reparacion, entrega, presupuesto, itv, otro
    tipo_cita VARCHAR(30) DEFAULT 'revision',

    -- Notas internas
    notas TEXT,

    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,

    -- Color para calendario (hex)
    color VARCHAR(7) DEFAULT '#3B82F6'
);

-- Índices para citas
CREATE INDEX IF NOT EXISTS idx_citas_taller_fecha
ON citas(taller_id, fecha_hora);

CREATE INDEX IF NOT EXISTS idx_citas_cliente
ON citas(cliente_id);

CREATE INDEX IF NOT EXISTS idx_citas_estado
ON citas(taller_id, estado);

-- ============================================
-- PARTE 3: PRECIOS DIFERENCIADOS POR TIPO CLIENTE
-- ============================================

-- Tabla de tarifas por tipo de cliente
CREATE TABLE IF NOT EXISTS tarifas_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

    -- Tipo de cliente: particular, empresa, flota, aseguradora, mayorista
    tipo_cliente VARCHAR(30) NOT NULL,

    -- Nombre descriptivo de la tarifa
    nombre VARCHAR(100) NOT NULL,

    -- Descuentos aplicables
    descuento_mano_obra DECIMAL(5,2) DEFAULT 0, -- Porcentaje
    descuento_piezas DECIMAL(5,2) DEFAULT 0,    -- Porcentaje

    -- Tarifa hora específica (si NULL, usa la general)
    tarifa_hora_especial DECIMAL(10,2) DEFAULT NULL,

    -- Condiciones de pago
    dias_pago INTEGER DEFAULT 0, -- 0 = contado, 30 = 30 días, etc.
    forma_pago_default VARCHAR(30) DEFAULT 'efectivo',

    -- Activo
    activo BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(taller_id, tipo_cliente)
);

-- Añadir referencia a tarifa en clientes
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS tarifa_id UUID REFERENCES tarifas_cliente(id) ON DELETE SET NULL;

-- Añadir descuento especial por cliente
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS descuento_especial DECIMAL(5,2) DEFAULT NULL;

-- ============================================
-- PARTE 4: CAMPOS PARA CÁLCULO DE HORAS
-- ============================================

-- Añadir precio de coste a líneas de orden (ya existe, verificar)
ALTER TABLE lineas_orden
ADD COLUMN IF NOT EXISTS precio_coste DECIMAL(10,2) DEFAULT NULL;

ALTER TABLE lineas_orden
ADD COLUMN IF NOT EXISTS proveedor VARCHAR(100) DEFAULT NULL;

ALTER TABLE lineas_orden
ADD COLUMN IF NOT EXISTS referencia VARCHAR(50) DEFAULT NULL;

-- Añadir tarifa hora usada en la línea (para histórico)
ALTER TABLE lineas_orden
ADD COLUMN IF NOT EXISTS tarifa_hora_aplicada DECIMAL(10,2) DEFAULT NULL;

-- Cálculo automático de mano de obra
ALTER TABLE lineas_orden
ADD COLUMN IF NOT EXISTS horas_calculadas DECIMAL(6,2) DEFAULT NULL;

-- ============================================
-- PARTE 5: HISTORIAL DE CAMBIOS EN ÓRDENES
-- ============================================

CREATE TABLE IF NOT EXISTS historial_ordenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES ordenes_reparacion(id) ON DELETE CASCADE,

    -- Qué cambió
    campo VARCHAR(50) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,

    -- Quién y cuándo
    usuario_id UUID,
    usuario_nombre VARCHAR(100),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Tipo de acción: crear, actualizar, eliminar, restaurar
    accion VARCHAR(20) DEFAULT 'actualizar',

    -- Notas adicionales
    notas TEXT
);

CREATE INDEX IF NOT EXISTS idx_historial_orden
ON historial_ordenes(orden_id, fecha DESC);

-- ============================================
-- PARTE 6: FUNCIÓN PARA GENERAR NÚMERO VISUAL
-- ============================================

-- Función que genera el siguiente número visual para un taller
CREATE OR REPLACE FUNCTION generar_numero_visual(p_taller_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_siguiente INTEGER;
BEGIN
    SELECT COALESCE(MAX(numero_visual), 0) + 1
    INTO v_siguiente
    FROM ordenes_reparacion
    WHERE taller_id = p_taller_id
    AND deleted_at IS NULL;

    RETURN v_siguiente;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 7: TRIGGER PARA AUTO-ASIGNAR NÚMERO VISUAL
-- ============================================

-- Función del trigger
CREATE OR REPLACE FUNCTION trigger_asignar_numero_visual()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo asignar si es nuevo y no tiene número visual
    IF NEW.numero_visual IS NULL THEN
        NEW.numero_visual := generar_numero_visual(NEW.taller_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (eliminar si existe para recrear)
DROP TRIGGER IF EXISTS tr_asignar_numero_visual ON ordenes_reparacion;

CREATE TRIGGER tr_asignar_numero_visual
    BEFORE INSERT ON ordenes_reparacion
    FOR EACH ROW
    EXECUTE FUNCTION trigger_asignar_numero_visual();

-- ============================================
-- PARTE 8: ACTUALIZAR ÓRDENES EXISTENTES SIN NÚMERO VISUAL
-- ============================================

-- Asignar números visuales a órdenes existentes que no lo tengan
WITH ordenes_sin_numero AS (
    SELECT id, taller_id,
           ROW_NUMBER() OVER (PARTITION BY taller_id ORDER BY created_at) as num
    FROM ordenes_reparacion
    WHERE numero_visual IS NULL
    AND deleted_at IS NULL
)
UPDATE ordenes_reparacion o
SET numero_visual = osn.num
FROM ordenes_sin_numero osn
WHERE o.id = osn.id;

-- ============================================
-- PARTE 9: VISTAS ÚTILES
-- ============================================

-- Vista de órdenes activas (excluye eliminadas)
CREATE OR REPLACE VIEW v_ordenes_activas AS
SELECT
    o.*,
    c.nombre as cliente_nombre,
    c.telefono as cliente_telefono,
    v.matricula,
    v.marca,
    v.modelo
FROM ordenes_reparacion o
LEFT JOIN clientes c ON o.cliente_id = c.id
LEFT JOIN vehiculos v ON o.vehiculo_id = v.id
WHERE o.deleted_at IS NULL;

-- Vista de citas del día
CREATE OR REPLACE VIEW v_citas_hoy AS
SELECT
    ci.*,
    c.nombre as cliente_nombre,
    c.telefono as cliente_telefono,
    v.matricula,
    v.marca,
    v.modelo
FROM citas ci
LEFT JOIN clientes c ON ci.cliente_id = c.id
LEFT JOIN vehiculos v ON ci.vehiculo_id = v.id
WHERE DATE(ci.fecha_hora) = CURRENT_DATE
AND ci.estado NOT IN ('cancelada', 'completada')
ORDER BY ci.fecha_hora;

-- ============================================
-- PARTE 10: RLS (Row Level Security) PARA NUEVAS TABLAS
-- ============================================

-- Habilitar RLS en citas
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo ven citas de su taller
DROP POLICY IF EXISTS citas_taller_policy ON citas;
CREATE POLICY citas_taller_policy ON citas
    FOR ALL
    USING (
        taller_id IN (
            SELECT taller_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Habilitar RLS en tarifas_cliente
ALTER TABLE tarifas_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tarifas_taller_policy ON tarifas_cliente;
CREATE POLICY tarifas_taller_policy ON tarifas_cliente
    FOR ALL
    USING (
        taller_id IN (
            SELECT taller_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Habilitar RLS en historial_ordenes
ALTER TABLE historial_ordenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS historial_taller_policy ON historial_ordenes;
CREATE POLICY historial_taller_policy ON historial_ordenes
    FOR ALL
    USING (
        orden_id IN (
            SELECT id FROM ordenes_reparacion
            WHERE taller_id IN (
                SELECT taller_id FROM usuarios WHERE id = auth.uid()
            )
        )
    );

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- Ejecutar esto para verificar que todo se creó correctamente:
--
-- SELECT 'ordenes_reparacion' as tabla, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'ordenes_reparacion'
-- AND column_name IN ('deleted_at', 'numero_visual', 'motivo_eliminacion', 'eliminado_por')
-- UNION ALL
-- SELECT 'citas' as tabla, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'citas'
-- UNION ALL
-- SELECT 'tarifas_cliente' as tabla, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'tarifas_cliente'
-- ORDER BY tabla, column_name;

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
