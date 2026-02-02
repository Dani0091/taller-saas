-- ============================================
-- MIGRACIÓN: Fix Missing Columns in usuarios Table
-- ============================================
-- Fecha: 2026-01-26
-- Descripción: Añade columnas faltantes en tabla usuarios
-- ============================================

-- 1. Añadir columna 'activo' si no existe
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- 2. Añadir columna 'auth_id' si no existe (vincula con Supabase Auth)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Crear índice para búsquedas por auth_id
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);

-- 4. Actualizar usuarios existentes que no tengan activo=true
UPDATE usuarios
SET activo = TRUE
WHERE activo IS NULL;

-- 5. Comentarios en las columnas
COMMENT ON COLUMN usuarios.activo IS 'Indica si el usuario está activo en el sistema';
COMMENT ON COLUMN usuarios.auth_id IS 'ID del usuario en Supabase Auth (auth.users)';

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
