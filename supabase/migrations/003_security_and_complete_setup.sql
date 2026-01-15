-- ============================================
-- MIGRACIÓN COMPLETA: SEGURIDAD RLS + NUEVAS FUNCIONALIDADES
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2025-01
-- ============================================

-- ============================================
-- PARTE 1: HABILITAR RLS EN TODAS LAS TABLAS
-- (Crítico de seguridad - Supabase lo detectó)
-- ============================================

-- Tablas principales
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lineas_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ordenes_reparacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS talleres ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS taller_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lineas_orden ENABLE ROW LEVEL SECURITY;

-- Tablas adicionales que también necesitan RLS
ALTER TABLE IF EXISTS verifactu_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auditoria_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS config_empresa ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: POLÍTICAS RLS PARA taller_config
-- ============================================

DROP POLICY IF EXISTS "Usuarios ven config de su taller" ON taller_config;
CREATE POLICY "Usuarios ven config de su taller"
  ON taller_config FOR SELECT
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios gestionan config de su taller" ON taller_config;
CREATE POLICY "Usuarios gestionan config de su taller"
  ON taller_config FOR ALL
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

-- ============================================
-- PARTE 3: POLÍTICAS RLS PARA lineas_orden
-- ============================================

DROP POLICY IF EXISTS "Usuarios ven lineas de ordenes de su taller" ON lineas_orden;
CREATE POLICY "Usuarios ven lineas de ordenes de su taller"
  ON lineas_orden FOR SELECT
  USING (orden_id IN (
    SELECT id FROM ordenes_reparacion
    WHERE taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Usuarios gestionan lineas de ordenes de su taller" ON lineas_orden;
CREATE POLICY "Usuarios gestionan lineas de ordenes de su taller"
  ON lineas_orden FOR ALL
  USING (orden_id IN (
    SELECT id FROM ordenes_reparacion
    WHERE taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid())
  ));

-- ============================================
-- PARTE 4: POLÍTICAS RLS PARA verifactu_registros
-- ============================================

DROP POLICY IF EXISTS "Usuarios ven verifactu de su taller" ON verifactu_registros;
CREATE POLICY "Usuarios ven verifactu de su taller"
  ON verifactu_registros FOR SELECT
  USING (factura_id IN (
    SELECT id FROM facturas
    WHERE taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Usuarios gestionan verifactu de su taller" ON verifactu_registros;
CREATE POLICY "Usuarios gestionan verifactu de su taller"
  ON verifactu_registros FOR ALL
  USING (factura_id IN (
    SELECT id FROM facturas
    WHERE taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid())
  ));

-- ============================================
-- PARTE 5: POLÍTICAS RLS PARA auditoria_facturas
-- ============================================

DROP POLICY IF EXISTS "Usuarios ven auditoria de su taller" ON auditoria_facturas;
CREATE POLICY "Usuarios ven auditoria de su taller"
  ON auditoria_facturas FOR SELECT
  USING (factura_id IN (
    SELECT id FROM facturas
    WHERE taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Usuarios insertan auditoria de su taller" ON auditoria_facturas;
CREATE POLICY "Usuarios insertan auditoria de su taller"
  ON auditoria_facturas FOR INSERT
  WITH CHECK (factura_id IN (
    SELECT id FROM facturas
    WHERE taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid())
  ));

-- ============================================
-- PARTE 6: POLÍTICAS RLS PARA config_empresa
-- ============================================

DROP POLICY IF EXISTS "Usuarios ven config_empresa de su taller" ON config_empresa;
CREATE POLICY "Usuarios ven config_empresa de su taller"
  ON config_empresa FOR SELECT
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios gestionan config_empresa de su taller" ON config_empresa;
CREATE POLICY "Usuarios gestionan config_empresa de su taller"
  ON config_empresa FOR ALL
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

-- ============================================
-- PARTE 7: ARREGLAR FUNCIONES CON search_path
-- ============================================

-- Recrear funciones con search_path fijo para seguridad
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

CREATE OR REPLACE FUNCTION public.is_same_taller(check_taller_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN check_taller_id = (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid() LIMIT 1);
END;
$$;

-- ============================================
-- PARTE 8: BORRADO LÓGICO DE ÓRDENES
-- ============================================

ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES usuarios(id) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_ordenes_deleted ON ordenes_reparacion(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- PARTE 9: TABLA DE CITAS
-- ============================================

CREATE TABLE IF NOT EXISTS citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL DEFAULT 'cita',

  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ,
  todo_el_dia BOOLEAN DEFAULT FALSE,

  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
  orden_id UUID REFERENCES ordenes_reparacion(id) ON DELETE SET NULL,

  estado TEXT DEFAULT 'pendiente',
  notificar_cliente BOOLEAN DEFAULT FALSE,
  recordatorio_enviado BOOLEAN DEFAULT FALSE,

  color TEXT DEFAULT '#3b82f6',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_citas_taller ON citas(taller_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_citas_cliente ON citas(cliente_id);

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden ver citas de su taller" ON citas;
CREATE POLICY "Usuarios pueden ver citas de su taller"
  ON citas FOR SELECT
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Usuarios pueden gestionar citas de su taller" ON citas;
CREATE POLICY "Usuarios pueden gestionar citas de su taller"
  ON citas FOR ALL
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

-- ============================================
-- PARTE 10: TARIFAS POR TIPO DE CLIENTE
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_tarifas_taller ON tarifas_cliente(taller_id);

ALTER TABLE tarifas_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden gestionar tarifas de su taller" ON tarifas_cliente;
CREATE POLICY "Usuarios pueden gestionar tarifas de su taller"
  ON tarifas_cliente FOR ALL
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

-- ============================================
-- PARTE 11: GOOGLE CALENDAR OAUTH
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_google_tokens_usuario ON google_calendar_tokens(usuario_id);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gestionan sus propios tokens" ON google_calendar_tokens;
CREATE POLICY "Usuarios gestionan sus propios tokens"
  ON google_calendar_tokens FOR ALL
  USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- Tabla de eventos sincronizados
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

CREATE INDEX IF NOT EXISTS idx_gcal_events_referencia ON google_calendar_events(tipo_referencia, referencia_id);

ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gestionan sus propios eventos gcal" ON google_calendar_events;
CREATE POLICY "Usuarios gestionan sus propios eventos gcal"
  ON google_calendar_events FOR ALL
  USING (usuario_id IN (SELECT id FROM usuarios WHERE auth_id = auth.uid()));

-- ============================================
-- PARTE 12: LÍMITES DE API POR USUARIO/TALLER
-- (Para controlar uso de Google Calendar, OCR, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  -- Tipo de servicio
  servicio TEXT NOT NULL, -- 'google_calendar', 'ocr_gemini', 'ocr_openrouter', 'whatsapp'

  -- Contadores
  periodo TEXT NOT NULL, -- '2025-01' formato año-mes
  requests_count INTEGER DEFAULT 0,

  -- Límites (NULL = sin límite)
  limite_mensual INTEGER,

  -- Metadata
  ultimo_request TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(taller_id, servicio, periodo)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_taller ON api_usage(taller_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_periodo ON api_usage(periodo);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven uso de API de su taller" ON api_usage;
CREATE POLICY "Usuarios ven uso de API de su taller"
  ON api_usage FOR SELECT
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Sistema gestiona uso de API" ON api_usage;
CREATE POLICY "Sistema gestiona uso de API"
  ON api_usage FOR ALL
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

-- Función para incrementar contador de uso
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

  -- Insertar o actualizar contador
  INSERT INTO api_usage (taller_id, usuario_id, servicio, periodo, requests_count, ultimo_request)
  VALUES (p_taller_id, p_usuario_id, p_servicio, v_periodo, 1, NOW())
  ON CONFLICT (taller_id, servicio, periodo)
  DO UPDATE SET
    requests_count = api_usage.requests_count + 1,
    ultimo_request = NOW(),
    updated_at = NOW()
  RETURNING requests_count, limite_mensual INTO v_count, v_limite;

  -- Si hay límite y se excede, devolver FALSE
  IF v_limite IS NOT NULL AND v_count > v_limite THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- ============================================
-- PARTE 13: CONFIGURACIÓN DE APIs POR TALLER
-- (Para que cada taller pueda usar sus propias API keys)
-- ============================================

CREATE TABLE IF NOT EXISTS taller_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

  -- Google Calendar (cada taller puede tener su propio proyecto de Google)
  google_client_id TEXT,
  google_client_secret TEXT,

  -- OCR APIs
  gemini_api_key TEXT,
  openrouter_api_key TEXT,

  -- WhatsApp Business API (para el futuro)
  whatsapp_api_token TEXT,
  whatsapp_phone_id TEXT,

  -- Telegram Bot (notificaciones)
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,

  -- Límites personalizados
  limite_google_calendar_mes INTEGER DEFAULT 1000,
  limite_ocr_mes INTEGER DEFAULT 100,

  -- Estado
  usa_apis_propias BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(taller_id)
);

ALTER TABLE taller_api_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gestionan config api de su taller" ON taller_api_config;
CREATE POLICY "Usuarios gestionan config api de su taller"
  ON taller_api_config FOR ALL
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

-- ============================================
-- PARTE 14: CAMPOS OCR EN VEHÍCULOS
-- ============================================

ALTER TABLE vehiculos
ADD COLUMN IF NOT EXISTS datos_ocr JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ocr_procesado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ocr_fecha TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ficha_tecnica_url TEXT,
ADD COLUMN IF NOT EXISTS permiso_circulacion_url TEXT;

COMMENT ON COLUMN vehiculos.datos_ocr IS 'Datos extraídos por OCR de documentos del vehículo';
COMMENT ON COLUMN vehiculos.ficha_tecnica_url IS 'URL de la foto de la ficha técnica';
COMMENT ON COLUMN vehiculos.permiso_circulacion_url IS 'URL del permiso de circulación';

-- ============================================
-- PARTE 15: MEJORAS EN FOTOS DE ÓRDENES
-- ============================================

-- Crear tabla para fotos con metadatos
CREATE TABLE IF NOT EXISTS fotos_orden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL REFERENCES ordenes_reparacion(id) ON DELETE CASCADE,
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

  -- Tipo y posición
  tipo TEXT NOT NULL, -- 'entrada', 'salida', 'proceso'
  posicion TEXT, -- 'frontal', 'trasera', 'lateral_izq', 'lateral_der', 'interior', 'motor', 'detalle', 'documento'

  -- URLs
  url TEXT NOT NULL,
  url_thumbnail TEXT,

  -- OCR si aplica
  tiene_ocr BOOLEAN DEFAULT FALSE,
  datos_ocr JSONB DEFAULT '{}',

  -- Metadata
  descripcion TEXT,
  orden_visual INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_fotos_orden_orden ON fotos_orden(orden_id);

ALTER TABLE fotos_orden ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gestionan fotos de ordenes de su taller" ON fotos_orden;
CREATE POLICY "Usuarios gestionan fotos de ordenes de su taller"
  ON fotos_orden FOR ALL
  USING (taller_id IN (SELECT taller_id FROM usuarios WHERE auth_id = auth.uid()));

-- ============================================
-- COMENTARIOS DESCRIPTIVOS
-- ============================================

COMMENT ON TABLE citas IS 'Citas, ITVs y recordatorios del taller';
COMMENT ON TABLE tarifas_cliente IS 'Tarifas diferenciadas por tipo de cliente';
COMMENT ON TABLE google_calendar_tokens IS 'Tokens OAuth de Google Calendar por usuario';
COMMENT ON TABLE google_calendar_events IS 'Eventos sincronizados con Google Calendar';
COMMENT ON TABLE api_usage IS 'Control de uso de APIs externas por taller/usuario';
COMMENT ON TABLE taller_api_config IS 'Configuración de APIs propias de cada taller';
COMMENT ON TABLE fotos_orden IS 'Fotos de órdenes con metadatos y OCR';

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
