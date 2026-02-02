-- ============================================================================
-- MIGRACIONES PARA REFACTOR - Sincronización de Base de Datos
-- ============================================================================
-- Estas migraciones son CRÍTICAS para que la app refactorizada funcione
-- Ejecutar en Supabase SQL Editor o vía CLI
-- ============================================================================

-- 1. AGREGAR COLUMNAS NECESARIAS A TABLA USUARIOS
-- auth_id: Vincula usuario con auth.users de Supabase
-- activo: Para soft-delete de usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- 2. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

-- 3. VINCULAR USUARIOS EXISTENTES CON AUTH.USERS
-- Esto evita que usuarios de la rama main "mueran" después del refactor
-- Busca por email y vincula automáticamente
UPDATE usuarios u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;

-- 4. CREAR TABLA DE SERIES DE FACTURACIÓN
-- Necesaria para la lógica de numeración de facturas
CREATE TABLE IF NOT EXISTS series_facturacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    prefijo TEXT NOT NULL,
    ultimo_numero INTEGER DEFAULT 0,
    taller_id UUID REFERENCES talleres(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(taller_id, prefijo)
);

-- 5. CREAR ÍNDICES PARA SERIES_FACTURACION
CREATE INDEX IF NOT EXISTS idx_series_taller ON series_facturacion(taller_id);
CREATE INDEX IF NOT EXISTS idx_series_activo ON series_facturacion(activo);

-- 6. CREAR TABLA DE CONFIGURACIÓN DE TALLER
-- Centraliza configuración del taller (tarifa hora, IVA, etc.)
CREATE TABLE IF NOT EXISTS configuracion_taller (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID REFERENCES talleres(id) ON DELETE CASCADE UNIQUE,

    -- Configuración de tarifas
    tarifa_hora DECIMAL(10,2) DEFAULT 45.00,
    incluye_iva BOOLEAN DEFAULT TRUE,
    porcentaje_iva DECIMAL(5,2) DEFAULT 21.00,

    -- Configuración de facturación
    serie_factura_default TEXT DEFAULT 'FA',
    numero_factura_inicial INTEGER DEFAULT 1,

    -- Datos del taller para facturas/presupuestos
    nombre_empresa TEXT,
    cif TEXT,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    logo_url TEXT,
    iban TEXT,

    -- Condiciones por defecto
    condiciones_pago TEXT,
    notas_factura TEXT,

    -- Personalización
    color_primario TEXT DEFAULT '#3b82f6',
    color_secundario TEXT DEFAULT '#10b981',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. CREAR ÍNDICE PARA CONFIGURACION_TALLER
CREATE INDEX IF NOT EXISTS idx_config_taller ON configuracion_taller(taller_id);

-- 8. INSERTAR CONFIGURACIÓN INICIAL PARA TALLERES EXISTENTES
-- Solo si no tienen configuración ya
INSERT INTO configuracion_taller (taller_id, tarifa_hora, incluye_iva, porcentaje_iva)
SELECT id, 45.00, TRUE, 21.00
FROM talleres
WHERE id NOT IN (SELECT taller_id FROM configuracion_taller WHERE taller_id IS NOT NULL);

-- 9. INSERTAR SERIE DE FACTURACIÓN POR DEFECTO PARA TALLERES EXISTENTES
INSERT INTO series_facturacion (taller_id, nombre, prefijo, ultimo_numero)
SELECT id, 'Facturas', 'FA', 0
FROM talleres
WHERE id NOT IN (SELECT taller_id FROM series_facturacion WHERE taller_id IS NOT NULL);

-- ============================================================================
-- VERIFICACIONES POST-MIGRACIÓN
-- ============================================================================
-- Ejecuta estas queries para verificar que todo está correcto:
--
-- SELECT COUNT(*) as usuarios_sin_auth_id FROM usuarios WHERE auth_id IS NULL;
-- SELECT COUNT(*) as talleres_sin_config FROM talleres t LEFT JOIN configuracion_taller c ON t.id = c.taller_id WHERE c.id IS NULL;
-- SELECT COUNT(*) as talleres_sin_serie FROM talleres t LEFT JOIN series_facturacion s ON t.id = s.taller_id WHERE s.id IS NULL;
-- ============================================================================
