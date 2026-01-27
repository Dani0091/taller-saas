-- ============================================
-- SCRIPT: Vincular Usuarios Existentes con Auth
-- ============================================
-- Fecha: 2026-01-26
-- Descripción: Vincula usuarios de la tabla 'usuarios' con 'auth.users' por email
-- ============================================

-- PASO 1: Ver usuarios sin auth_id
SELECT
  u.id,
  u.email,
  u.nombre,
  CASE
    WHEN u.auth_id IS NULL THEN '❌ Sin vincular'
    ELSE '✅ Vinculado'
  END as estado
FROM usuarios u
ORDER BY u.created_at DESC;

-- PASO 2: Ver usuarios en auth.users para comparar
-- (Ejecuta esto para ver qué usuarios tienen auth)
SELECT
  id as auth_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- PASO 3: VINCULAR AUTOMÁTICAMENTE POR EMAIL
-- ============================================
-- Este UPDATE vincula usuarios existentes buscando su auth_id por email

UPDATE usuarios u
SET auth_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_id IS NULL;

-- ============================================
-- PASO 4: VERIFICAR RESULTADO
-- ============================================
-- Ver cuántos se vincularon exitosamente

SELECT
  COUNT(*) FILTER (WHERE auth_id IS NOT NULL) as vinculados,
  COUNT(*) FILTER (WHERE auth_id IS NULL) as sin_vincular,
  COUNT(*) as total
FROM usuarios;

-- ============================================
-- PASO 5: VER USUARIOS QUE NO SE PUDIERON VINCULAR
-- ============================================
-- Si hay usuarios sin vincular, significa que no tienen registro en auth.users

SELECT
  u.id,
  u.email,
  u.nombre,
  u.created_at,
  '⚠️ No existe en auth.users - Debe registrarse de nuevo' as problema
FROM usuarios u
WHERE u.auth_id IS NULL;

-- ============================================
-- PASO 6 (OPCIONAL): LIMPIAR USUARIOS HUÉRFANOS
-- ============================================
-- Si prefieres eliminar usuarios que no tienen auth.users
-- (CUIDADO: Esto es DESTRUCTIVO - solo en desarrollo)

-- DESCOMENTA LAS SIGUIENTES LÍNEAS SI QUIERES ELIMINAR:

-- DELETE FROM usuarios
-- WHERE auth_id IS NULL;

-- ============================================
-- PASO 7: VERIFICACIÓN FINAL
-- ============================================
-- Todos los usuarios deben tener auth_id ahora

SELECT
  id,
  email,
  nombre,
  auth_id,
  CASE
    WHEN auth_id IS NOT NULL THEN '✅ OK'
    ELSE '❌ ERROR: Aún sin vincular'
  END as verificacion
FROM usuarios
ORDER BY created_at DESC;
