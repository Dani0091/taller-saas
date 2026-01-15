-- Migración: Tokens OAuth de Google Calendar por usuario
-- Ejecutar en Supabase SQL Editor

-- Tabla para almacenar tokens de Google Calendar por usuario
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

  -- Tokens OAuth
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,

  -- Info de la cuenta de Google
  google_email TEXT,
  calendar_id TEXT DEFAULT 'primary', -- ID del calendario a usar

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un usuario solo puede tener una conexión
  UNIQUE(usuario_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_google_tokens_usuario ON google_calendar_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_google_tokens_taller ON google_calendar_tokens(taller_id);

-- RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios tokens" ON google_calendar_tokens;
CREATE POLICY "Usuarios pueden ver sus propios tokens"
  ON google_calendar_tokens FOR SELECT
  USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios tokens" ON google_calendar_tokens;
CREATE POLICY "Usuarios pueden insertar sus propios tokens"
  ON google_calendar_tokens FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios tokens" ON google_calendar_tokens;
CREATE POLICY "Usuarios pueden actualizar sus propios tokens"
  ON google_calendar_tokens FOR UPDATE
  USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios tokens" ON google_calendar_tokens;
CREATE POLICY "Usuarios pueden eliminar sus propios tokens"
  ON google_calendar_tokens FOR DELETE
  USING (usuario_id = auth.uid());

-- Tabla para log de eventos creados en Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,

  -- Referencia al evento local
  tipo_referencia TEXT NOT NULL, -- 'orden', 'cita'
  referencia_id UUID NOT NULL,

  -- ID del evento en Google Calendar
  google_event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,

  -- Para sincronización
  google_event_link TEXT,
  sincronizado_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_gcal_events_usuario ON google_calendar_events(usuario_id);
CREATE INDEX IF NOT EXISTS idx_gcal_events_referencia ON google_calendar_events(tipo_referencia, referencia_id);

-- RLS
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden ver sus propios eventos" ON google_calendar_events;
CREATE POLICY "Usuarios pueden ver sus propios eventos"
  ON google_calendar_events FOR SELECT
  USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios eventos" ON google_calendar_events;
CREATE POLICY "Usuarios pueden insertar sus propios eventos"
  ON google_calendar_events FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios eventos" ON google_calendar_events;
CREATE POLICY "Usuarios pueden eliminar sus propios eventos"
  ON google_calendar_events FOR DELETE
  USING (usuario_id = auth.uid());

-- Comentarios
COMMENT ON TABLE google_calendar_tokens IS 'Tokens OAuth de Google Calendar por usuario';
COMMENT ON TABLE google_calendar_events IS 'Log de eventos sincronizados con Google Calendar';
