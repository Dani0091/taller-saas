-- ============================================
-- RLS (Row Level Security) - Módulo de Órdenes
-- ============================================
--
-- OBJETIVO: Asegurar que cada taller solo pueda acceder a sus propias órdenes
--
-- ESTRATEGIA: Multi-tenancy mediante taller_id
-- Cada tabla filtra por taller_id extraído del JWT del usuario autenticado
--
-- TABLAS AFECTADAS:
-- - ordenes_reparacion
-- - lineas_orden
--
-- ============================================

-- --------------------------------------------
-- 1. FUNCIÓN HELPER: Obtener taller_id del usuario autenticado
-- --------------------------------------------
CREATE OR REPLACE FUNCTION auth.get_user_taller_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Obtener el taller_id desde la tabla usuarios
  -- usando el user_id del JWT de Supabase
  RETURN (
    SELECT taller_id
    FROM public.usuarios
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- --------------------------------------------
-- 2. TABLA: ordenes_reparacion
-- --------------------------------------------

-- Habilitar RLS
ALTER TABLE ordenes_reparacion ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes (si existen)
DROP POLICY IF EXISTS "Los talleres solo ven sus propias órdenes" ON ordenes_reparacion;
DROP POLICY IF EXISTS "Los talleres solo crean sus propias órdenes" ON ordenes_reparacion;
DROP POLICY IF EXISTS "Los talleres solo actualizan sus propias órdenes" ON ordenes_reparacion;
DROP POLICY IF EXISTS "Los talleres solo eliminan sus propias órdenes" ON ordenes_reparacion;

-- Política SELECT: Los talleres solo ven sus propias órdenes
CREATE POLICY "Los talleres solo ven sus propias órdenes"
ON ordenes_reparacion
FOR SELECT
USING (
  taller_id = auth.get_user_taller_id()
);

-- Política INSERT: Los talleres solo crean órdenes en su propio taller
CREATE POLICY "Los talleres solo crean sus propias órdenes"
ON ordenes_reparacion
FOR INSERT
WITH CHECK (
  taller_id = auth.get_user_taller_id()
);

-- Política UPDATE: Los talleres solo actualizan sus propias órdenes
CREATE POLICY "Los talleres solo actualizan sus propias órdenes"
ON ordenes_reparacion
FOR UPDATE
USING (
  taller_id = auth.get_user_taller_id()
)
WITH CHECK (
  taller_id = auth.get_user_taller_id()
);

-- Política DELETE: Los talleres solo eliminan sus propias órdenes
-- NOTA: En realidad usamos soft delete, pero dejamos esta política por seguridad
CREATE POLICY "Los talleres solo eliminan sus propias órdenes"
ON ordenes_reparacion
FOR DELETE
USING (
  taller_id = auth.get_user_taller_id()
);

-- --------------------------------------------
-- 3. TABLA: lineas_orden
-- --------------------------------------------

-- Habilitar RLS
ALTER TABLE lineas_orden ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes (si existen)
DROP POLICY IF EXISTS "Los talleres solo ven líneas de sus propias órdenes" ON lineas_orden;
DROP POLICY IF EXISTS "Los talleres solo crean líneas en sus propias órdenes" ON lineas_orden;
DROP POLICY IF EXISTS "Los talleres solo actualizan líneas de sus propias órdenes" ON lineas_orden;
DROP POLICY IF EXISTS "Los talleres solo eliminan líneas de sus propias órdenes" ON lineas_orden;

-- Política SELECT: Solo ven líneas de órdenes de su taller
CREATE POLICY "Los talleres solo ven líneas de sus propias órdenes"
ON lineas_orden
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM ordenes_reparacion
    WHERE ordenes_reparacion.id = lineas_orden.orden_id
      AND ordenes_reparacion.taller_id = auth.get_user_taller_id()
  )
);

-- Política INSERT: Solo crean líneas en órdenes de su taller
CREATE POLICY "Los talleres solo crean líneas en sus propias órdenes"
ON lineas_orden
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM ordenes_reparacion
    WHERE ordenes_reparacion.id = lineas_orden.orden_id
      AND ordenes_reparacion.taller_id = auth.get_user_taller_id()
  )
);

-- Política UPDATE: Solo actualizan líneas de órdenes de su taller
CREATE POLICY "Los talleres solo actualizan líneas de sus propias órdenes"
ON lineas_orden
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM ordenes_reparacion
    WHERE ordenes_reparacion.id = lineas_orden.orden_id
      AND ordenes_reparacion.taller_id = auth.get_user_taller_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM ordenes_reparacion
    WHERE ordenes_reparacion.id = lineas_orden.orden_id
      AND ordenes_reparacion.taller_id = auth.get_user_taller_id()
  )
);

-- Política DELETE: Solo eliminan líneas de órdenes de su taller
CREATE POLICY "Los talleres solo eliminan líneas de sus propias órdenes"
ON lineas_orden
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM ordenes_reparacion
    WHERE ordenes_reparacion.id = lineas_orden.orden_id
      AND ordenes_reparacion.taller_id = auth.get_user_taller_id()
  )
);

-- --------------------------------------------
-- 4. ÍNDICES DE RENDIMIENTO
-- --------------------------------------------

-- Índice para mejorar el rendimiento de filtros por taller_id
CREATE INDEX IF NOT EXISTS idx_ordenes_taller_id
ON ordenes_reparacion(taller_id)
WHERE deleted_at IS NULL;

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_ordenes_estado
ON ordenes_reparacion(estado, taller_id)
WHERE deleted_at IS NULL;

-- Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente
ON ordenes_reparacion(cliente_id, taller_id)
WHERE deleted_at IS NULL;

-- Índice para búsquedas por vehículo
CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo
ON ordenes_reparacion(vehiculo_id, taller_id)
WHERE deleted_at IS NULL;

-- Índice para búsquedas por número de orden
CREATE INDEX IF NOT EXISTS idx_ordenes_numero
ON ordenes_reparacion(numero_orden, taller_id)
WHERE deleted_at IS NULL;

-- Índice para líneas de orden
CREATE INDEX IF NOT EXISTS idx_lineas_orden_id
ON lineas_orden(orden_id);

-- --------------------------------------------
-- 5. TRIGGERS PARA AUDITORÍA
-- --------------------------------------------

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ordenes_reparacion
DROP TRIGGER IF EXISTS update_ordenes_updated_at ON ordenes_reparacion;
CREATE TRIGGER update_ordenes_updated_at
  BEFORE UPDATE ON ordenes_reparacion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 6. COMENTARIOS PARA DOCUMENTACIÓN
-- --------------------------------------------

COMMENT ON POLICY "Los talleres solo ven sus propias órdenes" ON ordenes_reparacion IS
'Política RLS: Asegura que cada taller solo pueda ver sus propias órdenes mediante filtro por taller_id';

COMMENT ON POLICY "Los talleres solo ven líneas de sus propias órdenes" ON lineas_orden IS
'Política RLS: Asegura que cada taller solo pueda ver líneas de sus propias órdenes mediante JOIN con ordenes_reparacion';

COMMENT ON FUNCTION auth.get_user_taller_id() IS
'Función helper: Obtiene el taller_id del usuario autenticado desde su JWT. Usada en todas las políticas RLS de multi-tenancy';

-- --------------------------------------------
-- 7. VERIFICACIÓN DE SEGURIDAD
-- --------------------------------------------

-- Para verificar que las políticas están activas, ejecutar:
-- SELECT * FROM pg_policies WHERE tablename IN ('ordenes_reparacion', 'lineas_orden');

-- Para probar la seguridad:
-- 1. Crear dos usuarios de talleres diferentes
-- 2. Intentar acceder a órdenes del otro taller
-- 3. Debería retornar 0 resultados (no error, solo resultados vacíos)
