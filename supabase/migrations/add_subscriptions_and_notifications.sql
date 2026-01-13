-- ============================================
-- MIGRACIÓN: Sistema de Suscripciones y Notificaciones
-- TallerAgil - Gestión SaaS completa
-- Fecha: 2025-01
-- ============================================

-- ============================================
-- PARTE 1: PLANES DE SUSCRIPCIÓN
-- ============================================

-- Tabla de planes disponibles
CREATE TABLE IF NOT EXISTS planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,          -- 'trial', 'basico', 'pro', 'enterprise'
    nombre_display VARCHAR(100) NOT NULL,        -- 'Prueba', 'Básico', 'Profesional', 'Enterprise'
    precio_mensual DECIMAL(10,2) DEFAULT 0,
    precio_anual DECIMAL(10,2) DEFAULT 0,
    -- Límites
    max_usuarios INTEGER DEFAULT 1,
    max_ordenes_mes INTEGER DEFAULT 50,
    max_vehiculos INTEGER DEFAULT 100,
    max_clientes INTEGER DEFAULT 100,
    max_facturas_mes INTEGER DEFAULT 50,
    almacenamiento_mb INTEGER DEFAULT 500,
    -- Features
    tiene_ocr BOOLEAN DEFAULT FALSE,
    tiene_verifactu BOOLEAN DEFAULT FALSE,
    tiene_api BOOLEAN DEFAULT FALSE,
    tiene_soporte_prioritario BOOLEAN DEFAULT FALSE,
    tiene_backup_diario BOOLEAN DEFAULT FALSE,
    tiene_multi_taller BOOLEAN DEFAULT FALSE,
    -- Metadata
    color VARCHAR(7) DEFAULT '#6b7280',
    icono VARCHAR(50) DEFAULT 'Star',
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar planes por defecto
INSERT INTO planes (nombre, nombre_display, precio_mensual, precio_anual, max_usuarios, max_ordenes_mes, max_vehiculos, max_clientes, max_facturas_mes, almacenamiento_mb, tiene_ocr, tiene_verifactu, tiene_api, tiene_soporte_prioritario, tiene_backup_diario, tiene_multi_taller, color, icono, orden)
VALUES
    ('trial', 'Prueba Gratis', 0, 0, 1, 10, 20, 20, 10, 100, false, false, false, false, false, false, '#9ca3af', 'Gift', 0),
    ('basico', 'Básico', 19.90, 199, 2, 100, 200, 200, 50, 1000, true, false, false, false, false, false, '#3b82f6', 'Zap', 1),
    ('pro', 'Profesional', 39.90, 399, 5, 500, 1000, 500, 200, 5000, true, true, false, true, true, false, '#8b5cf6', 'Crown', 2),
    ('enterprise', 'Enterprise', 99.90, 999, 999, 9999, 9999, 9999, 9999, 50000, true, true, true, true, true, true, '#f59e0b', 'Building2', 3)
ON CONFLICT (nombre) DO UPDATE SET
    precio_mensual = EXCLUDED.precio_mensual,
    precio_anual = EXCLUDED.precio_anual,
    max_usuarios = EXCLUDED.max_usuarios,
    max_ordenes_mes = EXCLUDED.max_ordenes_mes,
    updated_at = NOW();

-- ============================================
-- PARTE 2: SUSCRIPCIONES DE TALLERES
-- ============================================

-- Añadir campos de suscripción a talleres
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES planes(id);
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS plan_nombre VARCHAR(50) DEFAULT 'trial';
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS fecha_inicio_plan TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS fecha_fin_plan TIMESTAMP WITH TIME ZONE;
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS dias_prueba INTEGER DEFAULT 14;
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS suscripcion_activa BOOLEAN DEFAULT TRUE;
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100);

-- Actualizar talleres existentes a plan trial
UPDATE talleres SET plan_nombre = 'trial' WHERE plan_nombre IS NULL;

-- ============================================
-- PARTE 3: NOTIFICACIONES
-- ============================================

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID REFERENCES talleres(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,                   -- 'orden', 'factura', 'cliente', 'sistema', 'pago'
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    enlace VARCHAR(500),                         -- URL relativa para navegar
    icono VARCHAR(50) DEFAULT 'Bell',
    color VARCHAR(50) DEFAULT 'blue',
    leida BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMP WITH TIME ZONE,
    prioridad INTEGER DEFAULT 0,                 -- 0=normal, 1=importante, 2=urgente
    datos JSONB,                                 -- Datos adicionales (orden_id, factura_id, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_taller ON notificaciones(taller_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(created_at DESC);

-- ============================================
-- PARTE 4: SUPER ADMIN
-- ============================================

-- Tabla de super administradores (gestores de la plataforma)
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre VARCHAR(255),
    permisos JSONB DEFAULT '{"all": true}',
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Logs de acciones admin
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES super_admins(id),
    admin_email VARCHAR(255),
    accion VARCHAR(100) NOT NULL,                -- 'crear_taller', 'suspender_taller', 'cambiar_plan', etc.
    entidad_tipo VARCHAR(50),                    -- 'taller', 'usuario', 'plan'
    entidad_id UUID,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_accion ON admin_logs(accion);
CREATE INDEX IF NOT EXISTS idx_admin_logs_fecha ON admin_logs(created_at DESC);

-- ============================================
-- PARTE 5: ESTADÍSTICAS DE USO (para límites)
-- ============================================

CREATE TABLE IF NOT EXISTS uso_mensual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    año INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    ordenes_creadas INTEGER DEFAULT 0,
    facturas_creadas INTEGER DEFAULT 0,
    clientes_creados INTEGER DEFAULT 0,
    vehiculos_creados INTEGER DEFAULT 0,
    almacenamiento_usado_mb DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(taller_id, año, mes)
);

CREATE INDEX IF NOT EXISTS idx_uso_mensual_taller ON uso_mensual(taller_id);
CREATE INDEX IF NOT EXISTS idx_uso_mensual_periodo ON uso_mensual(año, mes);

-- ============================================
-- PARTE 6: RLS PARA NUEVAS TABLAS
-- ============================================

ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE uso_mensual ENABLE ROW LEVEL SECURITY;

-- Planes: todos pueden leer
CREATE POLICY "Planes públicos" ON planes FOR SELECT USING (true);

-- Notificaciones: solo las del usuario o su taller
CREATE POLICY "Ver notificaciones propias" ON notificaciones
    FOR SELECT USING (
        usuario_id IN (SELECT id FROM usuarios WHERE email = auth.jwt()->>'email')
        OR taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY "Marcar notificaciones como leídas" ON notificaciones
    FOR UPDATE USING (
        usuario_id IN (SELECT id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- Super admins: solo acceso con service role (no RLS normal)
CREATE POLICY "Solo service role" ON super_admins FOR ALL USING (false);
CREATE POLICY "Solo service role logs" ON admin_logs FOR ALL USING (false);

-- Uso mensual: solo ver el del propio taller
CREATE POLICY "Ver uso del taller" ON uso_mensual
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- ============================================
-- PARTE 7: FUNCIONES ÚTILES
-- ============================================

-- Función para obtener el plan actual del taller
CREATE OR REPLACE FUNCTION get_plan_taller(p_taller_id UUID)
RETURNS TABLE(
    plan_nombre VARCHAR,
    plan_display VARCHAR,
    dias_restantes INTEGER,
    suscripcion_activa BOOLEAN,
    limites JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.plan_nombre,
        COALESCE(p.nombre_display, 'Prueba') as plan_display,
        CASE
            WHEN t.fecha_fin_plan IS NULL THEN t.dias_prueba - EXTRACT(DAY FROM NOW() - t.fecha_inicio_plan)::INTEGER
            ELSE EXTRACT(DAY FROM t.fecha_fin_plan - NOW())::INTEGER
        END as dias_restantes,
        t.suscripcion_activa,
        jsonb_build_object(
            'max_usuarios', COALESCE(p.max_usuarios, 1),
            'max_ordenes_mes', COALESCE(p.max_ordenes_mes, 10),
            'max_vehiculos', COALESCE(p.max_vehiculos, 20),
            'max_clientes', COALESCE(p.max_clientes, 20),
            'max_facturas_mes', COALESCE(p.max_facturas_mes, 10),
            'tiene_ocr', COALESCE(p.tiene_ocr, false),
            'tiene_verifactu', COALESCE(p.tiene_verifactu, false)
        ) as limites
    FROM talleres t
    LEFT JOIN planes p ON t.plan_nombre = p.nombre
    WHERE t.id = p_taller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el taller puede realizar una acción
CREATE OR REPLACE FUNCTION puede_crear(p_taller_id UUID, p_tipo VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_nombre VARCHAR;
    v_limite INTEGER;
    v_actual INTEGER;
    v_año INTEGER;
    v_mes INTEGER;
BEGIN
    v_año := EXTRACT(YEAR FROM NOW())::INTEGER;
    v_mes := EXTRACT(MONTH FROM NOW())::INTEGER;

    -- Obtener plan
    SELECT plan_nombre INTO v_plan_nombre FROM talleres WHERE id = p_taller_id;

    -- Obtener límite según tipo
    SELECT
        CASE p_tipo
            WHEN 'orden' THEN max_ordenes_mes
            WHEN 'factura' THEN max_facturas_mes
            WHEN 'cliente' THEN max_clientes
            WHEN 'vehiculo' THEN max_vehiculos
        END
    INTO v_limite
    FROM planes WHERE nombre = COALESCE(v_plan_nombre, 'trial');

    -- Obtener uso actual
    SELECT
        CASE p_tipo
            WHEN 'orden' THEN ordenes_creadas
            WHEN 'factura' THEN facturas_creadas
            WHEN 'cliente' THEN clientes_creados
            WHEN 'vehiculo' THEN vehiculos_creados
        END
    INTO v_actual
    FROM uso_mensual
    WHERE taller_id = p_taller_id AND año = v_año AND mes = v_mes;

    RETURN COALESCE(v_actual, 0) < COALESCE(v_limite, 10);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 'Migración completada' as status;
SELECT * FROM planes ORDER BY orden;
