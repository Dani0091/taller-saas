-- ============================================================
-- FIX URGENTE: RLS facturas bloqueando inserts (error 42501)
-- Fecha: 2026-03-05
-- Causa: auth.get_user_taller_id() devuelve NULL para usuarios
--        cuyo campo auth_id en tabla 'usuarios' es NULL.
--        La RLS: WITH CHECK (taller_id = auth.get_user_taller_id())
--        falla porque NULL != cualquier taller_id.
--
-- Solución doble:
--   1. Poblar auth_id en usuarios donde falte (JOIN por email con auth.users)
--   2. Hacer auth.get_user_taller_id() resiliente con fallback por email
--
-- Idempotente: segura para re-ejecutar.
-- ============================================================


-- ============================================================
-- PARTE 1: Poblar auth_id para usuarios con NULL
-- ============================================================
-- Vincula por email (mismo mecanismo que 20250126_vincular_usuarios_existentes.sql)
-- No toca usuarios que ya tienen auth_id correcto.

UPDATE public.usuarios u
SET auth_id = au.id
FROM auth.users au
WHERE au.email = u.email
  AND u.auth_id IS NULL;

-- Verificar cuántos quedaron sin vincular (aparecerá en los logs de migración)
DO $$
DECLARE
  v_sin_vincular INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_sin_vincular
  FROM public.usuarios
  WHERE auth_id IS NULL;

  IF v_sin_vincular > 0 THEN
    RAISE WARNING '⚠️  % usuario(s) siguen sin auth_id. Puede que no tengan entrada en auth.users.', v_sin_vincular;
  ELSE
    RAISE NOTICE '✅ Todos los usuarios tienen auth_id vinculado.';
  END IF;
END;
$$;


-- ============================================================
-- PARTE 2: Reforzar auth.get_user_taller_id() con fallback por email
-- ============================================================
-- Misma firma, mismo schema, sin tocar las RLS policies existentes.
-- Lógica: primero busca por auth_id (rápido, índice), si no encuentra
--         hace fallback por email (para usuarios con auth_id NULL históricos).

CREATE OR REPLACE FUNCTION auth.get_user_taller_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_taller_id UUID;
BEGIN
  -- Método principal: lookup por auth_id (usa idx_usuarios_auth_id)
  SELECT taller_id INTO v_taller_id
  FROM public.usuarios
  WHERE auth_id = auth.uid()
  LIMIT 1;

  -- Fallback: lookup por email si auth_id no está enlazado todavía.
  -- Cubre usuarios migrados antes de que auth_id fuera obligatorio.
  IF v_taller_id IS NULL THEN
    SELECT u.taller_id INTO v_taller_id
    FROM public.usuarios u
    INNER JOIN auth.users au ON au.email = u.email
    WHERE au.id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN v_taller_id;
END;
$$;

COMMENT ON FUNCTION auth.get_user_taller_id() IS
'Obtiene taller_id del usuario autenticado.
Intenta auth_id primero; si es NULL hace fallback por email.
Usado en RLS policies de facturas, detalles_factura, etc.';

GRANT EXECUTE ON FUNCTION auth.get_user_taller_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.get_user_taller_id() TO service_role;


-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
DO $$
DECLARE
  v_func_existe BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'get_user_taller_id'
  ) INTO v_func_existe;

  IF v_func_existe THEN
    RAISE NOTICE '✅ auth.get_user_taller_id() actualizada con fallback por email.';
  ELSE
    RAISE WARNING '❌ No se pudo verificar auth.get_user_taller_id().';
  END IF;
END;
$$;

-- ============================================================
-- FIN DEL FIX
-- ============================================================
