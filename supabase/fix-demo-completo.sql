-- ============================================
-- FIX DEMO COMPLETO - TallerAgil
-- ============================================
-- Ejecutar este archivo COMPLETO en Supabase SQL Editor
-- Esto arregla TODO para que la demo funcione
-- ============================================

-- ============================================
-- PASO 1: DESACTIVAR RLS
-- ============================================
ALTER TABLE talleres DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_reparacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_orden DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_factura DISABLE ROW LEVEL SECURITY;
ALTER TABLE taller_config DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 2: ELIMINAR POLÍTICAS PROBLEMÁTICAS
-- ============================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================
-- PASO 3: AÑADIR CAMPOS FALTANTES (si no existen)
-- ============================================
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS plan_nombre VARCHAR(50) DEFAULT 'trial';
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS fecha_inicio_plan TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS dias_prueba INTEGER DEFAULT 14;
ALTER TABLE talleres ADD COLUMN IF NOT EXISTS suscripcion_activa BOOLEAN DEFAULT TRUE;

-- ============================================
-- PASO 4: CREAR TABLA DE PLANES (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(50) NOT NULL UNIQUE,
    nombre_display VARCHAR(100) NOT NULL,
    precio_mensual DECIMAL(10,2) DEFAULT 0,
    max_usuarios INTEGER DEFAULT 1,
    max_ordenes_mes INTEGER DEFAULT 50,
    tiene_ocr BOOLEAN DEFAULT FALSE,
    tiene_verifactu BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT '#6b7280',
    activo BOOLEAN DEFAULT TRUE
);

-- Insertar planes
INSERT INTO planes (nombre, nombre_display, precio_mensual, max_usuarios, max_ordenes_mes, tiene_ocr, tiene_verifactu, color)
VALUES
    ('trial', 'Prueba Gratis', 0, 1, 10, false, false, '#9ca3af'),
    ('basico', 'Básico', 19.90, 2, 100, true, false, '#3b82f6'),
    ('pro', 'Profesional', 39.90, 5, 500, true, true, '#8b5cf6'),
    ('enterprise', 'Enterprise', 99.90, 999, 9999, true, true, '#f59e0b')
ON CONFLICT (nombre) DO UPDATE SET
    precio_mensual = EXCLUDED.precio_mensual,
    color = EXCLUDED.color;

-- ============================================
-- PASO 5: LIMPIAR USUARIOS DE PRUEBA (OPCIONAL)
-- ============================================
-- Descomenta las siguientes líneas para eliminar usuarios de prueba
-- Mantén tu usuario principal

-- DELETE FROM usuarios WHERE email LIKE '%test%' OR email LIKE '%prueba%';
-- DELETE FROM talleres WHERE nombre LIKE '%test%' OR nombre LIKE '%prueba%';

-- ============================================
-- PASO 6: CREAR TU USUARIO ADMIN
-- ============================================
-- IMPORTANTE: Cambia estos valores por los tuyos reales

-- Primero crear el taller
DO $$
DECLARE
    v_taller_id UUID;
    v_email VARCHAR := 'tu@email.com';  -- ← CAMBIA ESTO
    v_nombre_taller VARCHAR := 'Mi Taller';  -- ← CAMBIA ESTO
    v_tu_nombre VARCHAR := 'Tu Nombre';  -- ← CAMBIA ESTO
BEGIN
    -- Verificar si ya existe el taller
    SELECT id INTO v_taller_id FROM talleres WHERE email = v_email;

    IF v_taller_id IS NULL THEN
        -- Crear taller
        INSERT INTO talleres (nombre, cif, email, plan_nombre, suscripcion_activa)
        VALUES (v_nombre_taller, 'B00000000', v_email, 'pro', true)
        RETURNING id INTO v_taller_id;

        RAISE NOTICE 'Taller creado con ID: %', v_taller_id;
    ELSE
        RAISE NOTICE 'Taller ya existe con ID: %', v_taller_id;
    END IF;

    -- Verificar si ya existe el usuario
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE email = v_email) THEN
        -- Crear usuario
        INSERT INTO usuarios (email, nombre, rol, taller_id, activo)
        VALUES (v_email, v_tu_nombre, 'admin', v_taller_id, true);

        RAISE NOTICE 'Usuario creado: %', v_email;
    ELSE
        -- Actualizar usuario existente
        UPDATE usuarios SET taller_id = v_taller_id, activo = true WHERE email = v_email;
        RAISE NOTICE 'Usuario actualizado: %', v_email;
    END IF;

    -- Crear o actualizar config del taller
    INSERT INTO taller_config (taller_id, nombre_empresa, tarifa_hora, porcentaje_iva, incluye_iva)
    VALUES (v_taller_id, v_nombre_taller, 45, 21, true)
    ON CONFLICT (taller_id) DO UPDATE SET nombre_empresa = EXCLUDED.nombre_empresa;

    RAISE NOTICE 'Configuración del taller lista';
END $$;

-- ============================================
-- PASO 7: VERIFICACIÓN FINAL
-- ============================================
SELECT '--- TALLERES ---' as seccion;
SELECT id, nombre, email, plan_nombre FROM talleres;

SELECT '--- USUARIOS ---' as seccion;
SELECT id, email, nombre, rol, activo, taller_id FROM usuarios;

SELECT '--- ESTADO RLS ---' as seccion;
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '❌ RLS ACTIVADO' ELSE '✅ RLS DESACTIVADO' END as estado
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('talleres', 'usuarios', 'clientes', 'vehiculos', 'ordenes_reparacion', 'facturas')
ORDER BY tablename;

SELECT '✅ FIX COMPLETO. Ahora puedes usar la app.' as mensaje;
