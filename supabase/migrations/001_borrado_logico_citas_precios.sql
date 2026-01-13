-- ============================================
-- MIGRACIÓN 001: BORRADO LÓGICO, CITAS Y PRECIOS DIFERENCIADOS
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2025-01-13
-- ============================================

-- ============================================
-- 1. BORRADO LÓGICO DE ÓRDENES
-- ============================================

-- Añadir campos para borrado lógico en ordenes_reparacion
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS numero_visual INTEGER;

-- Crear secuencia para número visual por taller
CREATE OR REPLACE FUNCTION generar_numero_visual_orden()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_numero INTEGER;
BEGIN
    -- Obtener el siguiente número visual para este taller
    SELECT COALESCE(MAX(numero_visual), 0) + 1 INTO nuevo_numero
    FROM ordenes_reparacion
    WHERE taller_id = NEW.taller_id;

    NEW.numero_visual := nuevo_numero;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar número visual automáticamente
DROP TRIGGER IF EXISTS trigger_numero_visual_orden ON ordenes_reparacion;
CREATE TRIGGER trigger_numero_visual_orden
    BEFORE INSERT ON ordenes_reparacion
    FOR EACH ROW
    WHEN (NEW.numero_visual IS NULL)
    EXECUTE FUNCTION generar_numero_visual_orden();

-- Actualizar órdenes existentes con número visual
DO $$
DECLARE
    taller_rec RECORD;
    orden_rec RECORD;
    contador INTEGER;
BEGIN
    FOR taller_rec IN SELECT DISTINCT taller_id FROM ordenes_reparacion LOOP
        contador := 1;
        FOR orden_rec IN
            SELECT id FROM ordenes_reparacion
            WHERE taller_id = taller_rec.taller_id
            AND numero_visual IS NULL
            ORDER BY created_at ASC
        LOOP
            UPDATE ordenes_reparacion SET numero_visual = contador WHERE id = orden_rec.id;
            contador := contador + 1;
        END LOOP;
    END LOOP;
END $$;

-- Índice para búsquedas de órdenes activas
CREATE INDEX IF NOT EXISTS idx_ordenes_activas ON ordenes_reparacion(taller_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ordenes_numero_visual ON ordenes_reparacion(taller_id, numero_visual);

-- ============================================
-- 2. HISTORIAL DE CAMBIOS (AUDITORÍA)
-- ============================================

CREATE TABLE IF NOT EXISTS historial_cambios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    tabla VARCHAR(100) NOT NULL,
    registro_id UUID NOT NULL,
    accion VARCHAR(20) NOT NULL, -- 'crear', 'actualizar', 'eliminar', 'restaurar'
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_taller ON historial_cambios(taller_id);
CREATE INDEX IF NOT EXISTS idx_historial_tabla ON historial_cambios(tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_cambios(created_at DESC);

-- RLS para historial
ALTER TABLE historial_cambios ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Ver historial del taller" ON historial_cambios
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Insertar historial del taller" ON historial_cambios
    FOR INSERT WITH CHECK (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- ============================================
-- 3. SISTEMA DE CITAS/AVISOS
-- ============================================

CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    orden_id UUID REFERENCES ordenes_reparacion(id) ON DELETE SET NULL,

    -- Información de la cita
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) DEFAULT 'cita', -- 'cita', 'recordatorio', 'aviso', 'itv', 'revision'

    -- Fecha y hora
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    todo_el_dia BOOLEAN DEFAULT FALSE,

    -- Estado
    estado VARCHAR(50) DEFAULT 'pendiente', -- 'pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'

    -- Recordatorios
    recordatorio_email BOOLEAN DEFAULT FALSE,
    recordatorio_sms BOOLEAN DEFAULT FALSE,
    minutos_antes_recordatorio INTEGER DEFAULT 60,
    recordatorio_enviado BOOLEAN DEFAULT FALSE,

    -- Color para el calendario
    color VARCHAR(7) DEFAULT '#3b82f6',

    -- Notas internas
    notas TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_citas_taller ON citas(taller_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_citas_cliente ON citas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_citas_vehiculo ON citas(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);

-- RLS para citas
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Ver citas del taller" ON citas
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Gestionar citas del taller" ON citas
    FOR ALL USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_citas_updated_at ON citas;
CREATE TRIGGER update_citas_updated_at BEFORE UPDATE ON citas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. PRECIOS DIFERENCIADOS POR TIPO DE CLIENTE
-- ============================================

CREATE TABLE IF NOT EXISTS tarifas_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

    -- Tipo de cliente al que aplica
    tipo_cliente VARCHAR(50) NOT NULL, -- 'particular', 'empresa', 'autonomo', 'flota'

    -- Tarifas de mano de obra
    tarifa_hora DECIMAL(10,2) NOT NULL DEFAULT 45.00,
    tarifa_hora_urgente DECIMAL(10,2), -- Tarifa para trabajos urgentes

    -- Descuentos automáticos
    descuento_piezas_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_mano_obra_porcentaje DECIMAL(5,2) DEFAULT 0,

    -- Condiciones de pago
    dias_pago INTEGER DEFAULT 0, -- 0 = al contado
    limite_credito DECIMAL(12,2),

    -- Activo
    activo BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Único por taller y tipo
    UNIQUE(taller_id, tipo_cliente)
);

CREATE INDEX IF NOT EXISTS idx_tarifas_taller ON tarifas_cliente(taller_id);

-- RLS para tarifas
ALTER TABLE tarifas_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Ver tarifas del taller" ON tarifas_cliente
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Gestionar tarifas del taller" ON tarifas_cliente
    FOR ALL USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_tarifas_updated_at ON tarifas_cliente;
CREATE TRIGGER update_tarifas_updated_at BEFORE UPDATE ON tarifas_cliente
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. CAMPOS ADICIONALES PARA LÍNEAS DE ORDEN
-- ============================================

-- Añadir campos de coste y tiempos a lineas_orden
ALTER TABLE lineas_orden
ADD COLUMN IF NOT EXISTS precio_coste DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS proveedor VARCHAR(255),
ADD COLUMN IF NOT EXISTS referencia VARCHAR(100),
ADD COLUMN IF NOT EXISTS tiempo_estimado_minutos INTEGER,
ADD COLUMN IF NOT EXISTS tiempo_real_minutos INTEGER;

-- ============================================
-- 6. CAMPOS ADICIONALES PARA CLIENTES
-- ============================================

-- Añadir campos para registro completo de clientes
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS segundo_telefono VARCHAR(20),
ADD COLUMN IF NOT EXISTS email_secundario VARCHAR(255),
ADD COLUMN IF NOT EXISTS preferencia_contacto VARCHAR(50) DEFAULT 'telefono', -- 'telefono', 'email', 'whatsapp', 'sms'
ADD COLUMN IF NOT EXISTS acepta_marketing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS como_nos_conocio VARCHAR(100),
ADD COLUMN IF NOT EXISTS credito_disponible DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_facturado DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultima_visita DATE;

-- ============================================
-- 7. DOCUMENTOS PROCESADOS (OCR/IA)
-- ============================================

CREATE TABLE IF NOT EXISTS documentos_procesados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

    -- Referencia opcional
    orden_id UUID REFERENCES ordenes_reparacion(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,

    -- Información del documento
    tipo_documento VARCHAR(50) NOT NULL, -- 'albaran', 'factura', 'presupuesto', 'ficha_tecnica', 'otro'
    nombre_archivo VARCHAR(255),
    url_original TEXT,
    url_procesado TEXT,

    -- Datos extraídos por OCR/IA
    texto_extraido TEXT,
    datos_estructurados JSONB, -- JSON con datos parseados
    confianza_ocr DECIMAL(5,2),

    -- Servicio usado
    servicio_ocr VARCHAR(50), -- 'tesseract', 'gemini', 'openrouter', etc.

    -- Estado
    estado VARCHAR(50) DEFAULT 'pendiente', -- 'pendiente', 'procesando', 'completado', 'error'
    error_mensaje TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    procesado_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_docs_taller ON documentos_procesados(taller_id);
CREATE INDEX IF NOT EXISTS idx_docs_orden ON documentos_procesados(orden_id);
CREATE INDEX IF NOT EXISTS idx_docs_tipo ON documentos_procesados(tipo_documento);

-- RLS para documentos
ALTER TABLE documentos_procesados ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Ver documentos del taller" ON documentos_procesados
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Gestionar documentos del taller" ON documentos_procesados
    FOR ALL USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecutar para verificar que todo se creó correctamente:

SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
