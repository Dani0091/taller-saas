-- ============================================
-- FIX: Políticas RLS para tabla USUARIOS
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- El problema: las políticas originales tienen dependencia circular
-- ============================================

-- 1. Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Ver usuarios del taller" ON usuarios;
DROP POLICY IF EXISTS "Gestionar usuarios del taller" ON usuarios;

-- 2. Crear política simple: cada usuario puede ver su propio registro por email
CREATE POLICY "Usuario ve su propio registro" ON usuarios
    FOR SELECT USING (email = auth.jwt()->>'email');

-- 3. Política para INSERT durante registro (el email debe coincidir)
CREATE POLICY "Usuario puede registrarse" ON usuarios
    FOR INSERT WITH CHECK (email = auth.jwt()->>'email');

-- 4. Política para UPDATE de su propio registro
CREATE POLICY "Usuario actualiza su registro" ON usuarios
    FOR UPDATE USING (email = auth.jwt()->>'email');

-- 5. Si necesitas que admins vean todos los usuarios del taller,
--    puedes añadir esta política adicional usando una función:
CREATE OR REPLACE FUNCTION get_my_taller_id()
RETURNS UUID AS $$
  SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Política para que usuarios vean otros del mismo taller (opcional)
CREATE POLICY "Ver usuarios del mismo taller" ON usuarios
    FOR SELECT USING (
        taller_id = get_my_taller_id()
    );

-- ============================================
-- VERIFICAR que funcionó
-- ============================================
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'usuarios';
