-- ============================================
-- TALLERAGIL - MASTER SCHEMA COMPLETO
-- ============================================
-- Ejecutar este archivo COMPLETO en Supabase SQL Editor
-- para una instalación desde cero
-- URL: https://supabase.com/dashboard/project/[TU_PROYECTO]/sql/new
-- ============================================
-- IMPORTANTE: Ejecutar en orden de arriba hacia abajo
-- ============================================

-- ============================================
-- PARTE 1: TABLAS PRINCIPALES
-- ============================================

-- 1. TALLERES (empresas/negocios)
CREATE TABLE IF NOT EXISTS talleres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    cif VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    codigo_postal VARCHAR(10),
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'España',
    web VARCHAR(255),
    -- Suscripción
    plan_id UUID,
    plan_nombre VARCHAR(50) DEFAULT 'trial',
    fecha_inicio_plan TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin_plan TIMESTAMPTZ,
    dias_prueba INTEGER DEFAULT 14,
    suscripcion_activa BOOLEAN DEFAULT TRUE,
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USUARIOS (empleados del taller)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- Enlace a auth.users de Supabase
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre VARCHAR(255),
    apellidos VARCHAR(255),
    rol VARCHAR(50) DEFAULT 'operario', -- 'admin', 'mecanico', 'operario', 'recepcion'
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT TRUE,
    telefono VARCHAR(20),
    avatar_url TEXT,
    -- Permisos específicos
    puede_crear_ordenes BOOLEAN DEFAULT TRUE,
    puede_crear_facturas BOOLEAN DEFAULT FALSE,
    puede_ver_finanzas BOOLEAN DEFAULT FALSE,
    puede_gestionar_usuarios BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255),
    nif VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    codigo_postal VARCHAR(10),
    pais VARCHAR(100) DEFAULT 'España',
    notas TEXT,
    estado VARCHAR(20) DEFAULT 'activo',
    -- Tipo de cliente
    tipo_cliente VARCHAR(50) DEFAULT 'particular', -- particular, empresa, autonomo, flota, renting
    requiere_autorizacion BOOLEAN DEFAULT FALSE,
    empresa_renting VARCHAR(100), -- Santander, ALD, Alphabet, etc.
    -- Facturación
    iban VARCHAR(34),
    forma_pago VARCHAR(50) DEFAULT 'efectivo',
    dias_pago INTEGER DEFAULT 0,
    limite_credito DECIMAL(10,2),
    -- Borrado lógico
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. VEHÍCULOS
CREATE TABLE IF NOT EXISTS vehiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    matricula VARCHAR(20) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    año INTEGER,
    color VARCHAR(50),
    kilometros INTEGER,
    vin VARCHAR(17),
    bastidor_vin VARCHAR(50),
    numero_motor VARCHAR(50),
    tipo_combustible VARCHAR(50),
    carroceria VARCHAR(50),
    potencia_cv INTEGER,
    cilindrada INTEGER,
    emisiones VARCHAR(50),
    fecha_matriculacion DATE,
    -- Fotos y documentos
    fotos JSONB,
    documentos JSONB,
    historial_reparaciones JSONB,
    ficha_tecnica_url TEXT,
    permiso_circulacion_url TEXT,
    -- OCR
    datos_ocr JSONB DEFAULT '{}',
    ocr_procesado BOOLEAN DEFAULT FALSE,
    ocr_fecha TIMESTAMPTZ,
    notas TEXT,
    -- Borrado lógico
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ÓRDENES DE REPARACIÓN
CREATE TABLE IF NOT EXISTS ordenes_reparacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    numero_orden VARCHAR(50) NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    operario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    estado VARCHAR(50) DEFAULT 'recibido',
    descripcion_problema TEXT,
    diagnostico TEXT,
    trabajos_realizados TEXT,
    fecha_entrada TIMESTAMPTZ DEFAULT NOW(),
    fecha_salida_estimada TIMESTAMPTZ,
    fecha_salida_real TIMESTAMPTZ,
    tiempo_estimado_horas DECIMAL(10,2),
    tiempo_real_horas DECIMAL(10,2),
    subtotal_mano_obra DECIMAL(12,2) DEFAULT 0,
    subtotal_piezas DECIMAL(12,2) DEFAULT 0,
    iva_amount DECIMAL(12,2) DEFAULT 0,
    total_con_iva DECIMAL(12,2) DEFAULT 0,
    presupuesto_aprobado_por_cliente BOOLEAN DEFAULT FALSE,
    notas TEXT,
    fotos_entrada TEXT,
    fotos_salida TEXT,
    -- Campos formulario físico
    nivel_combustible VARCHAR(10),
    renuncia_presupuesto BOOLEAN DEFAULT FALSE,
    accion_imprevisto VARCHAR(20) DEFAULT 'avisar',
    recoger_piezas BOOLEAN DEFAULT FALSE,
    danos_carroceria TEXT,
    coste_diario_estancia DECIMAL(10,2),
    kilometros_entrada INTEGER,
    -- Campos presupuesto público
    token_publico UUID DEFAULT gen_random_uuid(),
    fecha_envio_presupuesto TIMESTAMPTZ,
    fecha_aceptacion_cliente TIMESTAMPTZ,
    ip_aceptacion VARCHAR(45),
    firma_cliente TEXT,
    -- Borrado lógico
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LÍNEAS DE ORDEN (detalle de trabajos/piezas)
CREATE TABLE IF NOT EXISTS lineas_orden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES ordenes_reparacion(id) ON DELETE CASCADE,
    tipo VARCHAR(50) DEFAULT 'mano_obra', -- mano_obra, pieza, servicio
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(10,2) DEFAULT 1,
    precio_unitario DECIMAL(12,2) DEFAULT 0,
    precio_coste DECIMAL(12,2) DEFAULT 0, -- Precio de coste (para calcular beneficio)
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    iva_porcentaje DECIMAL(5,2) DEFAULT 21,
    importe_total DECIMAL(12,2) DEFAULT 0,
    horas DECIMAL(10,2),
    operario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    operario_nombre VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SERIES DE FACTURACIÓN
CREATE TABLE IF NOT EXISTS series_facturacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    prefijo VARCHAR(10) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    ultimo_numero INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT TRUE,
    es_predeterminada BOOLEAN DEFAULT FALSE,
    tipo VARCHAR(50) DEFAULT 'ordinaria', -- ordinaria, rectificativa, abono
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(taller_id, prefijo)
);

-- 8. FACTURAS
CREATE TABLE IF NOT EXISTS facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    orden_id UUID REFERENCES ordenes_reparacion(id) ON DELETE SET NULL,
    numero_factura VARCHAR(50) NOT NULL,
    numero_serie VARCHAR(20) DEFAULT 'FA',
    serie VARCHAR(20) DEFAULT 'FA',
    numero INTEGER,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,
    base_imponible DECIMAL(12,2) DEFAULT 0,
    iva DECIMAL(12,2) DEFAULT 0,
    iva_porcentaje DECIMAL(5,2) DEFAULT 21,
    total DECIMAL(12,2) DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'borrador', -- borrador, emitida, pagada, anulada
    metodo_pago VARCHAR(50),
    notas TEXT,
    notas_internas TEXT,
    condiciones_pago TEXT,
    -- Contacto específico factura
    persona_contacto TEXT,
    telefono_contacto TEXT,
    -- Campos para renting/flotas
    numero_autorizacion VARCHAR(100),
    referencia_externa VARCHAR(255),
    -- Verifactu
    verifactu_numero VARCHAR(100),
    verifactu_url TEXT,
    verifactu_huella TEXT,
    verifactu_tipo_huella VARCHAR(20),
    verifactu_qr_url TEXT,
    verifactu_xml TEXT,
    verifactu_estado VARCHAR(20),
    numero_verifactu VARCHAR(100),
    pdf_url TEXT,
    version INTEGER DEFAULT 1,
    -- Borrado lógico
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. LÍNEAS DE FACTURA
CREATE TABLE IF NOT EXISTS lineas_factura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
    numero_linea INTEGER DEFAULT 1,
    concepto VARCHAR(255),
    descripcion TEXT,
    cantidad DECIMAL(10,2) DEFAULT 1,
    precio_unitario DECIMAL(12,2) DEFAULT 0,
    base_imponible DECIMAL(12,2) DEFAULT 0,
    iva_porcentaje DECIMAL(5,2) DEFAULT 21,
    iva_importe DECIMAL(12,2) DEFAULT 0,
    total_linea DECIMAL(12,2) DEFAULT 0,
    importe_total DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CONFIGURACIÓN DEL TALLER
CREATE TABLE IF NOT EXISTS taller_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL UNIQUE REFERENCES talleres(id) ON DELETE CASCADE,
    tarifa_hora DECIMAL(10,2) DEFAULT 45.00,
    incluye_iva BOOLEAN DEFAULT FALSE,
    porcentaje_iva DECIMAL(5,2) DEFAULT 21,
    tarifa_con_iva BOOLEAN DEFAULT FALSE,
    nombre_empresa VARCHAR(255),
    cif VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    -- Dirección completa
    codigo_postal VARCHAR(10),
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'España',
    web VARCHAR(255),
    -- Campos facturación
    serie_factura VARCHAR(10) DEFAULT 'FA',
    numero_factura_inicial INTEGER DEFAULT 1,
    ultimo_numero_factura INTEGER DEFAULT 0,
    prefijo_factura VARCHAR(10) DEFAULT '',
    iban VARCHAR(34),
    condiciones_pago TEXT DEFAULT 'Pago a 30 días',
    notas_factura TEXT,
    notas_legales TEXT,
    -- Colores marca
    color_primario VARCHAR(7) DEFAULT '#0ea5e9',
    color_secundario VARCHAR(7) DEFAULT '#f97316',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CITAS Y CALENDARIO
CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL DEFAULT 'cita', -- cita, itv, revision, entrega
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ,
    todo_el_dia BOOLEAN DEFAULT FALSE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    orden_id UUID REFERENCES ordenes_reparacion(id) ON DELETE SET NULL,
    estado TEXT DEFAULT 'pendiente', -- pendiente, confirmada, completada, cancelada
    notificar_cliente BOOLEAN DEFAULT FALSE,
    recordatorio_enviado BOOLEAN DEFAULT FALSE,
    color TEXT DEFAULT '#3b82f6',
    -- Borrado lógico
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES usuarios(id)
);

-- 12. TARIFAS POR TIPO DE CLIENTE
CREATE TABLE IF NOT EXISTS tarifas_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    tipo_cliente TEXT NOT NULL,
    tarifa_hora DECIMAL(10,2) NOT NULL DEFAULT 45.00,
    tarifa_hora_urgente DECIMAL(10,2),
    descuento_piezas_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_mano_obra_porcentaje DECIMAL(5,2) DEFAULT 0,
    dias_pago INTEGER DEFAULT 0,
    limite_credito DECIMAL(10,2),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(taller_id, tipo_cliente)
);

-- 13. FOTOS DE ÓRDENES
CREATE TABLE IF NOT EXISTS fotos_orden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES ordenes_reparacion(id) ON DELETE CASCADE,
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'entrada', 'salida', 'proceso'
    posicion TEXT, -- 'frontal', 'trasera', 'lateral_izq', 'lateral_der', 'interior', 'motor', 'detalle', 'documento'
    url TEXT NOT NULL,
    url_thumbnail TEXT,
    tiene_ocr BOOLEAN DEFAULT FALSE,
    datos_ocr JSONB DEFAULT '{}',
    descripcion TEXT,
    orden_visual INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES usuarios(id)
);

-- 14. GOOGLE CALENDAR OAUTH
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ,
    scope TEXT,
    google_email TEXT,
    calendar_id TEXT DEFAULT 'primary',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id)
);

CREATE TABLE IF NOT EXISTS google_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    tipo_referencia TEXT NOT NULL,
    referencia_id UUID NOT NULL,
    google_event_id TEXT NOT NULL,
    calendar_id TEXT NOT NULL,
    google_event_link TEXT,
    sincronizado_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CONTROL DE USO DE APIs
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    servicio TEXT NOT NULL, -- 'google_calendar', 'ocr_gemini', 'ocr_openrouter', 'whatsapp'
    periodo TEXT NOT NULL, -- '2025-01' formato año-mes
    requests_count INTEGER DEFAULT 0,
    limite_mensual INTEGER,
    ultimo_request TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(taller_id, servicio, periodo)
);

-- 16. CONFIGURACIÓN APIs POR TALLER
CREATE TABLE IF NOT EXISTS taller_api_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    google_client_id TEXT,
    google_client_secret TEXT,
    gemini_api_key TEXT,
    openrouter_api_key TEXT,
    whatsapp_api_token TEXT,
    whatsapp_phone_id TEXT,
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    limite_google_calendar_mes INTEGER DEFAULT 1000,
    limite_ocr_mes INTEGER DEFAULT 100,
    usa_apis_propias BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(taller_id)
);

-- 17. PLANES DE SUSCRIPCIÓN
CREATE TABLE IF NOT EXISTS planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    nombre_display VARCHAR(100) NOT NULL,
    precio_mensual DECIMAL(10,2) DEFAULT 0,
    precio_anual DECIMAL(10,2) DEFAULT 0,
    max_usuarios INTEGER DEFAULT 1,
    max_ordenes_mes INTEGER DEFAULT 50,
    max_vehiculos INTEGER DEFAULT 100,
    max_clientes INTEGER DEFAULT 100,
    max_facturas_mes INTEGER DEFAULT 50,
    almacenamiento_mb INTEGER DEFAULT 500,
    tiene_ocr BOOLEAN DEFAULT FALSE,
    tiene_verifactu BOOLEAN DEFAULT FALSE,
    tiene_api BOOLEAN DEFAULT FALSE,
    tiene_soporte_prioritario BOOLEAN DEFAULT FALSE,
    tiene_backup_diario BOOLEAN DEFAULT FALSE,
    tiene_multi_taller BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT '#6b7280',
    icono VARCHAR(50) DEFAULT 'Star',
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID REFERENCES talleres(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- orden, factura, cliente, sistema, pago
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    enlace VARCHAR(500),
    icono VARCHAR(50) DEFAULT 'Bell',
    color VARCHAR(50) DEFAULT 'blue',
    leida BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMPTZ,
    prioridad INTEGER DEFAULT 0, -- 0=normal, 1=importante, 2=urgente
    datos JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PARTE 2: ÍNDICES PARA RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_taller ON usuarios(taller_id);
CREATE INDEX IF NOT EXISTS idx_clientes_taller ON clientes(taller_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nif ON clientes(nif);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON clientes(tipo_cliente);
CREATE INDEX IF NOT EXISTS idx_vehiculos_taller ON vehiculos(taller_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_matricula ON vehiculos(matricula);
CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON vehiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_vin ON vehiculos(vin);
CREATE INDEX IF NOT EXISTS idx_ordenes_taller ON ordenes_reparacion(taller_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente ON ordenes_reparacion(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo ON ordenes_reparacion(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_reparacion(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha ON ordenes_reparacion(fecha_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_ordenes_deleted ON ordenes_reparacion(deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ordenes_token_publico ON ordenes_reparacion(token_publico);
CREATE INDEX IF NOT EXISTS idx_lineas_orden ON lineas_orden(orden_id);
CREATE INDEX IF NOT EXISTS idx_facturas_taller ON facturas(taller_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_autorizacion ON facturas(numero_autorizacion);
CREATE INDEX IF NOT EXISTS idx_facturas_referencia ON facturas(referencia_externa);
CREATE INDEX IF NOT EXISTS idx_lineas_factura ON lineas_factura(factura_id);
CREATE INDEX IF NOT EXISTS idx_series_taller ON series_facturacion(taller_id);
CREATE INDEX IF NOT EXISTS idx_citas_taller ON citas(taller_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_citas_cliente ON citas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tarifas_taller ON tarifas_cliente(taller_id);
CREATE INDEX IF NOT EXISTS idx_fotos_orden_orden ON fotos_orden(orden_id);
CREATE INDEX IF NOT EXISTS idx_google_tokens_usuario ON google_calendar_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gcal_events_referencia ON google_calendar_events(tipo_referencia, referencia_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_taller ON api_usage(taller_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_periodo ON api_usage(periodo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_taller ON notificaciones(taller_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(created_at DESC);

-- ============================================
-- PARTE 3: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE talleres ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_reparacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_orden ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE taller_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_orden ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE taller_api_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_facturacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 4: POLÍTICAS DE SEGURIDAD
-- ============================================

-- FUNCIÓN AUXILIAR: Obtener taller_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_taller_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid() LIMIT 1);
END;
$$;

-- TALLERES
DROP POLICY IF EXISTS "Usuarios ven su taller" ON talleres;
CREATE POLICY "Usuarios ven su taller" ON talleres
    FOR SELECT USING (id = get_my_taller_id());

DROP POLICY IF EXISTS "Usuarios modifican su taller" ON talleres;
CREATE POLICY "Usuarios modifican su taller" ON talleres
    FOR ALL USING (id = get_my_taller_id());

-- USUARIOS
DROP POLICY IF EXISTS "Ver usuarios del taller" ON usuarios;
CREATE POLICY "Ver usuarios del taller" ON usuarios
    FOR SELECT USING (taller_id = get_my_taller_id());

DROP POLICY IF EXISTS "Gestionar usuarios del taller" ON usuarios;
CREATE POLICY "Gestionar usuarios del taller" ON usuarios
    FOR ALL USING (taller_id = get_my_taller_id());

-- CLIENTES
DROP POLICY IF EXISTS "Ver clientes del taller" ON clientes;
CREATE POLICY "Ver clientes del taller" ON clientes
    FOR SELECT USING (taller_id = get_my_taller_id());

DROP POLICY IF EXISTS "Gestionar clientes del taller" ON clientes;
CREATE POLICY "Gestionar clientes del taller" ON clientes
    FOR ALL USING (taller_id = get_my_taller_id());

-- VEHÍCULOS
DROP POLICY IF EXISTS "Ver vehiculos del taller" ON vehiculos;
CREATE POLICY "Ver vehiculos del taller" ON vehiculos
    FOR SELECT USING (taller_id = get_my_taller_id());

DROP POLICY IF EXISTS "Gestionar vehiculos del taller" ON vehiculos;
CREATE POLICY "Gestionar vehiculos del taller" ON vehiculos
    FOR ALL USING (taller_id = get_my_taller_id());

-- ÓRDENES
DROP POLICY IF EXISTS "Ver ordenes del taller" ON ordenes_reparacion;
CREATE POLICY "Ver ordenes del taller" ON ordenes_reparacion
    FOR SELECT USING (taller_id = get_my_taller_id());

DROP POLICY IF EXISTS "Gestionar ordenes del taller" ON ordenes_reparacion;
CREATE POLICY "Gestionar ordenes del taller" ON ordenes_reparacion
    FOR ALL USING (taller_id = get_my_taller_id());

-- LÍNEAS ORDEN
DROP POLICY IF EXISTS "Ver lineas del taller" ON lineas_orden;
CREATE POLICY "Ver lineas del taller" ON lineas_orden
    FOR SELECT USING (
        orden_id IN (SELECT id FROM ordenes_reparacion WHERE taller_id = get_my_taller_id())
    );

DROP POLICY IF EXISTS "Gestionar lineas del taller" ON lineas_orden;
CREATE POLICY "Gestionar lineas del taller" ON lineas_orden
    FOR ALL USING (
        orden_id IN (SELECT id FROM ordenes_reparacion WHERE taller_id = get_my_taller_id())
    );

-- FACTURAS
DROP POLICY IF EXISTS "Ver facturas del taller" ON facturas;
CREATE POLICY "Ver facturas del taller" ON facturas
    FOR SELECT USING (taller_id = get_my_taller_id());

DROP POLICY IF EXISTS "Gestionar facturas del taller" ON facturas;
CREATE POLICY "Gestionar facturas del taller" ON facturas
    FOR ALL USING (taller_id = get_my_taller_id());

-- LÍNEAS FACTURA
DROP POLICY IF EXISTS "Ver lineas factura del taller" ON lineas_factura;
CREATE POLICY "Ver lineas factura del taller" ON lineas_factura
    FOR SELECT USING (
        factura_id IN (SELECT id FROM facturas WHERE taller_id = get_my_taller_id())
    );

DROP POLICY IF EXISTS "Gestionar lineas factura del taller" ON lineas_factura;
CREATE POLICY "Gestionar lineas factura del taller" ON lineas_factura
    FOR ALL USING (
        factura_id IN (SELECT id FROM facturas WHERE taller_id = get_my_taller_id())
    );

-- CONFIGURACIÓN
DROP POLICY IF EXISTS "Ver config del taller" ON taller_config;
CREATE POLICY "Ver config del taller" ON taller_config
    FOR SELECT USING (taller_id = get_my_taller_id());

DROP POLICY IF EXISTS "Gestionar config del taller" ON taller_config;
CREATE POLICY "Gestionar config del taller" ON taller_config
    FOR ALL USING (taller_id = get_my_taller_id());

-- CITAS
DROP POLICY IF EXISTS "Ver citas del taller" ON citas;
CREATE POLICY "Ver citas del taller" ON citas
    FOR SELECT USING (taller_id = get_my_taller_id());

DROP POLICY IF EXISTS "Gestionar citas del taller" ON citas;
CREATE POLICY "Gestionar citas del taller" ON citas
    FOR ALL USING (taller_id = get_my_taller_id());

-- TARIFAS
DROP POLICY IF EXISTS "Ver tarifas del taller" ON tarifas_cliente;
CREATE POLICY "Ver tarifas del taller" ON tarifas_cliente
    FOR SELECT USING (taller_id = get_my_taller_id());

DROP POLICY IF EXISTS "Gestionar tarifas del taller" ON tarifas_cliente;
CREATE POLICY "Gestionar tarifas del taller" ON tarifas_cliente
    FOR ALL USING (taller_id = get_my_taller_id());

-- FOTOS ORDEN
DROP POLICY IF EXISTS "Ver fotos del taller" ON fotos_orden;
CREATE POLICY "Ver fotos del taller" ON fotos_orden
    FOR SELECT USING (taller_id = get_my_taller_id());

DROP POLICY IF EXISTS "Gestionar fotos del taller" ON fotos_orden;
CREATE POLICY "Gestionar fotos del taller" ON fotos_orden
    FOR ALL USING (taller_id = get_my_taller_id());

-- GOOGLE CALENDAR
DROP POLICY IF EXISTS "Gestionar tokens propios" ON google_calendar_tokens;
CREATE POLICY "Gestionar tokens propios" ON google_calendar_tokens
    FOR ALL USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Gestionar eventos propios" ON google_calendar_events;
CREATE POLICY "Gestionar eventos propios" ON google_calendar_events
    FOR ALL USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- API USAGE
DROP POLICY IF EXISTS "Ver uso API del taller" ON api_usage;
CREATE POLICY "Ver uso API del taller" ON api_usage
    FOR ALL USING (taller_id = get_my_taller_id());

-- TALLER API CONFIG
DROP POLICY IF EXISTS "Gestionar config API del taller" ON taller_api_config;
CREATE POLICY "Gestionar config API del taller" ON taller_api_config
    FOR ALL USING (taller_id = get_my_taller_id());

-- NOTIFICACIONES
DROP POLICY IF EXISTS "Ver notificaciones propias" ON notificaciones;
CREATE POLICY "Ver notificaciones propias" ON notificaciones
    FOR SELECT USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Gestionar notificaciones propias" ON notificaciones;
CREATE POLICY "Gestionar notificaciones propias" ON notificaciones
    FOR ALL USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- SERIES FACTURACIÓN
DROP POLICY IF EXISTS "Ver series del taller" ON series_facturacion;
CREATE POLICY "Ver series del taller" ON series_facturacion
    FOR SELECT USING (taller_id = get_my_taller_id());

DROP POLICY IF EXISTS "Gestionar series del taller" ON series_facturacion;
CREATE POLICY "Gestionar series del taller" ON series_facturacion
    FOR ALL USING (taller_id = get_my_taller_id());

-- PLANES (lectura pública)
DROP POLICY IF EXISTS "Ver planes" ON planes;
CREATE POLICY "Ver planes" ON planes
    FOR SELECT USING (true);

-- ============================================
-- PARTE 5: FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para incrementar uso de API
CREATE OR REPLACE FUNCTION increment_api_usage(
    p_taller_id UUID,
    p_usuario_id UUID,
    p_servicio TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_periodo TEXT;
    v_limite INTEGER;
    v_count INTEGER;
BEGIN
    v_periodo := TO_CHAR(NOW(), 'YYYY-MM');

    INSERT INTO api_usage (taller_id, usuario_id, servicio, periodo, requests_count, ultimo_request)
    VALUES (p_taller_id, p_usuario_id, p_servicio, v_periodo, 1, NOW())
    ON CONFLICT (taller_id, servicio, periodo)
    DO UPDATE SET
        requests_count = api_usage.requests_count + 1,
        ultimo_request = NOW(),
        updated_at = NOW()
    RETURNING requests_count, limite_mensual INTO v_count, v_limite;

    IF v_limite IS NOT NULL AND v_count > v_limite THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- ============================================
-- PARTE 6: TRIGGERS PARA updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_talleres_updated_at ON talleres;
CREATE TRIGGER update_talleres_updated_at BEFORE UPDATE ON talleres
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehiculos_updated_at ON vehiculos;
CREATE TRIGGER update_vehiculos_updated_at BEFORE UPDATE ON vehiculos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ordenes_updated_at ON ordenes_reparacion;
CREATE TRIGGER update_ordenes_updated_at BEFORE UPDATE ON ordenes_reparacion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lineas_orden_updated_at ON lineas_orden;
CREATE TRIGGER update_lineas_orden_updated_at BEFORE UPDATE ON lineas_orden
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_facturas_updated_at ON facturas;
CREATE TRIGGER update_facturas_updated_at BEFORE UPDATE ON facturas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_taller_config_updated_at ON taller_config;
CREATE TRIGGER update_taller_config_updated_at BEFORE UPDATE ON taller_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_citas_updated_at ON citas;
CREATE TRIGGER update_citas_updated_at BEFORE UPDATE ON citas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_series_updated_at ON series_facturacion;
CREATE TRIGGER update_series_updated_at BEFORE UPDATE ON series_facturacion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PARTE 7: DATOS INICIALES
-- ============================================

-- Insertar planes por defecto
INSERT INTO planes (nombre, nombre_display, precio_mensual, precio_anual, max_usuarios, max_ordenes_mes, max_vehiculos, max_clientes, max_facturas_mes, almacenamiento_mb, tiene_ocr, tiene_verifactu, tiene_api, tiene_soporte_prioritario, tiene_backup_diario, tiene_multi_taller, color, icono, orden)
VALUES
    ('trial', 'Prueba Gratis', 0, 0, 1, 10, 20, 20, 10, 100, false, false, false, false, false, false, '#9ca3af', 'Gift', 0),
    ('basico', 'Básico', 19.90, 199, 2, 100, 200, 200, 50, 1000, true, false, false, false, false, false, '#3b82f6', 'Zap', 1),
    ('pro', 'Profesional', 39.90, 399, 5, 500, 1000, 500, 200, 5000, true, true, false, true, true, false, '#8b5cf6', 'Crown', 2),
    ('enterprise', 'Enterprise', 99.90, 999, 999, 9999, 9999, 9999, 9999, 50000, true, true, true, true, true, true, '#f59e0b', 'Building2', 3)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- GUÍA DE SOLUCIÓN DE PROBLEMAS RLS
-- ============================================
/*
Si RLS causa problemas, estas son las opciones:

1. VERIFICAR QUE EL USUARIO ESTÁ CORRECTAMENTE ENLAZADO:
   SELECT * FROM usuarios WHERE auth_id = auth.uid();

   Si no devuelve nada, el usuario no está registrado en la tabla usuarios.
   Solución: INSERT INTO usuarios (email, taller_id, auth_id, nombre)
   VALUES ('email@ejemplo.com', 'uuid-del-taller', auth.uid(), 'Nombre');

2. VERIFICAR QUE get_my_taller_id() DEVUELVE EL TALLER CORRECTO:
   SELECT get_my_taller_id();

   Si devuelve NULL, revisar que auth.uid() corresponde al auth_id en usuarios.

3. TEMPORALMENTE DESACTIVAR RLS PARA UNA TABLA (SOLO PARA DEBUG):
   ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;

   ¡IMPORTANTE! Volver a activar después:
   ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

4. VER TODAS LAS POLÍTICAS ACTIVAS:
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public';

5. SI TODO FALLA, USAR service_role_key EN EL CLIENTE SUPABASE:
   - Esto bypasea RLS completamente
   - Solo usar en backend/APIs, NUNCA exponer al cliente
*/

-- ============================================
-- FIN DEL SCHEMA
-- ============================================
