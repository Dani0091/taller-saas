-- ============================================
-- MIGRACIÓN: Fix RLS de detalles_factura
-- ============================================
-- PROBLEMA: La política RLS usa auth.jwt() ->> 'email' (obsoleto)
-- en vez de auth.get_user_taller_id() (correcto)
--
-- SOLUCIÓN: Reemplazar la política con versiones por operación
-- usando auth.get_user_taller_id()
-- ============================================

-- Eliminar política antigua
DROP POLICY IF EXISTS "Usuarios pueden gestionar detalles de su taller" ON public.detalles_factura;

-- Política SELECT: Ver detalles de facturas del propio taller
CREATE POLICY "Usuarios ven detalles de su taller"
  ON public.detalles_factura
  FOR SELECT
  USING (
    factura_id IN (
      SELECT id FROM public.facturas
      WHERE taller_id = auth.get_user_taller_id()
    )
  );

-- Política INSERT: Crear detalles solo en facturas del propio taller
CREATE POLICY "Usuarios crean detalles en su taller"
  ON public.detalles_factura
  FOR INSERT
  WITH CHECK (
    factura_id IN (
      SELECT id FROM public.facturas
      WHERE taller_id = auth.get_user_taller_id()
    )
  );

-- Política UPDATE: Solo detalles de borradores
CREATE POLICY "Solo detalles de borradores pueden modificarse"
  ON public.detalles_factura
  FOR UPDATE
  USING (
    factura_id IN (
      SELECT id FROM public.facturas
      WHERE taller_id = auth.get_user_taller_id()
        AND estado = 'borrador'
    )
  );

-- Política DELETE: Solo detalles de borradores
CREATE POLICY "Solo detalles de borradores pueden eliminarse"
  ON public.detalles_factura
  FOR DELETE
  USING (
    factura_id IN (
      SELECT id FROM public.facturas
      WHERE taller_id = auth.get_user_taller_id()
        AND estado = 'borrador'
    )
  );

-- ============================================
-- FIX: Sincronizar campo 'serie' con 'prefijo' en series existentes
-- ============================================
UPDATE series_facturacion
SET serie = prefijo,
    año = COALESCE(año, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
WHERE serie IS NULL AND prefijo IS NOT NULL;
