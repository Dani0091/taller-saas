-- ============================================
-- FIX: Datos Legacy - Migración de Limpieza
-- ============================================
-- Propósito: Arreglar datos existentes con formatos inválidos
-- Ejecutar en: Supabase SQL Editor
-- Fecha: 2026-01-29

-- ============================================
-- 1. ANALIZAR PROBLEMAS EXISTENTES
-- ============================================

-- Ver facturas con formato de número inválido
SELECT
  id,
  numero_factura,
  fecha_emision,
  estado,
  CASE
    WHEN numero_factura IS NULL THEN 'NULL'
    WHEN numero_factura !~ '^[A-Z]+-\d{4}-\d{6}$' THEN 'FORMATO_INVALIDO'
    ELSE 'OK'
  END as validacion
FROM facturas
WHERE numero_factura IS NOT NULL
  AND numero_factura !~ '^[A-Z]+-\d{4}-\d{6}$'
ORDER BY fecha_emision DESC;

-- Ver clientes con NIF inválido (formato básico)
SELECT
  id,
  nombre,
  nif,
  CASE
    WHEN nif IS NULL THEN 'NULL'
    WHEN LENGTH(nif) < 9 THEN 'MUY_CORTO'
    WHEN nif ~ '^[0-9]{8}[A-Z]$' THEN 'OK_PERSONA'
    WHEN nif ~ '^[A-Z][0-9]{7}[A-Z]$' THEN 'OK_EMPRESA'
    ELSE 'FORMATO_INVALIDO'
  END as validacion
FROM clientes
WHERE nif IS NULL
   OR (nif !~ '^[0-9]{8}[A-Z]$' AND nif !~ '^[A-Z][0-9]{7}[A-Z]$')
ORDER BY created_at DESC;

-- ============================================
-- 2. OPCIONES DE FIX (ELEGIR UNA)
-- ============================================

-- OPCIÓN A: Convertir facturas con formato legacy a nuevo formato
-- (Solo ejecutar si estás seguro de que quieres modificar los datos)
/*
UPDATE facturas
SET numero_factura = CONCAT('F-', EXTRACT(YEAR FROM fecha_emision), '-', LPAD(EXTRACT(MONTH FROM fecha_emision)::TEXT, 6, '0'))
WHERE numero_factura IS NOT NULL
  AND numero_factura !~ '^[A-Z]+-\d{4}-\d{6}$'
  AND estado = 'borrador';  -- Solo borradores para no afectar facturas emitidas
*/

-- OPCIÓN B: Limpiar números de factura inválidos (solo en borradores)
-- (Más seguro - permite que se regeneren)
/*
UPDATE facturas
SET numero_factura = NULL
WHERE numero_factura IS NOT NULL
  AND numero_factura !~ '^[A-Z]+-\d{4}-\d{6}$'
  AND estado = 'borrador';
*/

-- OPCIÓN C: Agregar prefijo a facturas sin formato
-- (Para preservar el número original)
/*
UPDATE facturas
SET numero_factura = CONCAT('LEGACY-', numero_factura)
WHERE numero_factura IS NOT NULL
  AND numero_factura !~ '^[A-Z]+-\d{4}-\d{6}$'
  AND numero_factura !~ '^LEGACY-';
*/

-- ============================================
-- 3. FIX DE CLIENTES CON NIF INVÁLIDO
-- ============================================

-- Ver cuántos clientes tienen NIF problemático
SELECT COUNT(*) as total_problematicos
FROM clientes
WHERE nif IS NULL
   OR (nif !~ '^[0-9]{8}[A-Z]$' AND nif !~ '^[A-Z][0-9]{7}[A-Z]$');

-- OPCIÓN: Marcar clientes con NIF inválido (agregar en notas)
-- (No modifica el NIF, solo documenta el problema)
/*
UPDATE clientes
SET notas = CONCAT(
  COALESCE(notas, ''),
  E'\n[MIGRACIÓN] NIF original inválido: ',
  nif,
  ' - Fecha: ',
  NOW()::DATE
)
WHERE nif IS NOT NULL
  AND (nif !~ '^[0-9]{8}[A-Z]$' AND nif !~ '^[A-Z][0-9]{7}[A-Z]$')
  AND (notas IS NULL OR notas NOT LIKE '%MIGRACIÓN%');
*/

-- ============================================
-- 4. AGREGAR DELETED_AT A ORDENES (OPCIONAL)
-- ============================================

-- Ver si ordenes_reparacion tiene deleted_at
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ordenes_reparacion'
  AND column_name = 'deleted_at';

-- Si no existe, agregar columna
/*
ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE ordenes_reparacion
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES usuarios(id);
*/

-- ============================================
-- 5. VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

-- Verificar facturas arregladas
SELECT
  COUNT(*) FILTER (WHERE numero_factura IS NULL) as sin_numero,
  COUNT(*) FILTER (WHERE numero_factura ~ '^[A-Z]+-\d{4}-\d{6}$') as formato_correcto,
  COUNT(*) FILTER (WHERE numero_factura !~ '^[A-Z]+-\d{4}-\d{6}$' AND numero_factura IS NOT NULL) as formato_invalido,
  COUNT(*) as total
FROM facturas;

-- Verificar clientes arreglados
SELECT
  COUNT(*) FILTER (WHERE nif ~ '^[0-9]{8}[A-Z]$' OR nif ~ '^[A-Z][0-9]{7}[A-Z]$') as nif_valido,
  COUNT(*) FILTER (WHERE nif IS NULL OR (nif !~ '^[0-9]{8}[A-Z]$' AND nif !~ '^[A-Z][0-9]{7}[A-Z]$')) as nif_invalido,
  COUNT(*) as total
FROM clientes;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
/*
1. SIEMPRE hacer backup antes de ejecutar UPDATEs
2. Probar primero con WHERE ... LIMIT 1
3. Las consultas comentadas (/* *\/) están desactivadas por seguridad
4. Descomenta solo las que quieras ejecutar
5. Verifica los resultados con las queries de verificación

PASOS RECOMENDADOS:
1. Ejecutar queries de análisis (SELECT)
2. Revisar los datos problemáticos
3. Decidir qué opción usar
4. Descomentar UNA opción
5. Ejecutar con LIMIT 1 primero
6. Si funciona, ejecutar sin LIMIT
7. Verificar con queries de verificación
*/
