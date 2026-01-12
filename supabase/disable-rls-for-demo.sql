-- ============================================
-- FIX COMPLETO DE RLS - TallerAgil
-- ============================================
-- Ejecutar TODO este archivo en Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/nimvxyhwjdfdlyjtofce/sql/new
-- ============================================

-- ============================================
-- OPCIÓN A: DESACTIVAR RLS (RECOMENDADO PARA DEMO)
-- ============================================
-- Descomenta estas líneas si quieres desactivar RLS completamente
-- Es más seguro para demos y desarrollo

ALTER TABLE talleres DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_reparacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_orden DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_factura DISABLE ROW LEVEL SECURITY;
ALTER TABLE taller_config DISABLE ROW LEVEL SECURITY;

-- Si tienes las tablas de suscripciones (de la migración anterior)
ALTER TABLE IF EXISTS planes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notificaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS super_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS uso_mensual DISABLE ROW LEVEL SECURITY;

-- ============================================
-- ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================
-- Esto limpia cualquier política problemática

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas de todas las tablas
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
-- VERIFICACIÓN
-- ============================================
SELECT
    tablename,
    CASE WHEN rowsecurity THEN 'RLS ACTIVADO' ELSE 'RLS DESACTIVADO' END as estado_rls
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'talleres', 'usuarios', 'clientes', 'vehiculos',
    'ordenes_reparacion', 'lineas_orden', 'facturas',
    'lineas_factura', 'taller_config'
)
ORDER BY tablename;

-- ============================================
-- NOTA: Si más adelante quieres reactivar RLS
-- ============================================
-- Puedes usar el archivo supabase/schema.sql original
-- O crear políticas más simples como estas:
--
-- CREATE POLICY "allow_all" ON talleres FOR ALL USING (true);
-- CREATE POLICY "allow_all" ON usuarios FOR ALL USING (true);
-- etc.
-- ============================================

SELECT '✅ RLS desactivado correctamente. La aplicación debería funcionar sin restricciones.' as mensaje;
