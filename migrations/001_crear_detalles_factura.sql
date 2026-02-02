-- =====================================================
-- MIGRACIÓN: Crear tabla detalles_factura
-- =====================================================
-- PROBLEMA: El sistema de facturas está intentando usar
-- la tabla 'lineas_factura' que NO existe en Supabase.
--
-- SOLUCIÓN: Crear tabla 'detalles_factura' con los
-- campos necesarios para almacenar las líneas de factura.
-- =====================================================

-- Crear tabla detalles_factura
CREATE TABLE IF NOT EXISTS public.detalles_factura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  numero_linea INTEGER NOT NULL DEFAULT 1,
  concepto TEXT NOT NULL,
  descripcion TEXT,
  cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0,
  base_imponible NUMERIC(10, 2) NOT NULL DEFAULT 0,
  iva_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 21.00,
  iva_importe NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_linea NUMERIC(10, 2) NOT NULL DEFAULT 0,
  importe_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tipo_linea TEXT DEFAULT 'servicio',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint para evitar duplicados
  UNIQUE(factura_id, numero_linea)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_detalles_factura_factura_id
  ON public.detalles_factura(factura_id);

CREATE INDEX IF NOT EXISTS idx_detalles_factura_numero_linea
  ON public.detalles_factura(factura_id, numero_linea);

-- Comentarios para documentación
COMMENT ON TABLE public.detalles_factura IS 'Líneas de detalle de las facturas';
COMMENT ON COLUMN public.detalles_factura.factura_id IS 'Referencia a la factura padre';
COMMENT ON COLUMN public.detalles_factura.numero_linea IS 'Número de línea dentro de la factura';
COMMENT ON COLUMN public.detalles_factura.concepto IS 'Concepto breve de la línea';
COMMENT ON COLUMN public.detalles_factura.descripcion IS 'Descripción detallada (opcional)';
COMMENT ON COLUMN public.detalles_factura.cantidad IS 'Cantidad de unidades';
COMMENT ON COLUMN public.detalles_factura.precio_unitario IS 'Precio por unidad sin IVA';
COMMENT ON COLUMN public.detalles_factura.base_imponible IS 'Base imponible de la línea (cantidad * precio_unitario)';
COMMENT ON COLUMN public.detalles_factura.iva_porcentaje IS 'Porcentaje de IVA aplicado';
COMMENT ON COLUMN public.detalles_factura.iva_importe IS 'Importe del IVA';
COMMENT ON COLUMN public.detalles_factura.total_linea IS 'Total de la línea sin IVA';
COMMENT ON COLUMN public.detalles_factura.importe_total IS 'Total de la línea con IVA';
COMMENT ON COLUMN public.detalles_factura.tipo_linea IS 'Tipo: servicio, pieza, mano_obra, etc.';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.detalles_factura ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios solo pueden ver/editar detalles de facturas de su taller
CREATE POLICY "Usuarios pueden gestionar detalles de su taller"
  ON public.detalles_factura
  FOR ALL
  USING (
    factura_id IN (
      SELECT id FROM public.facturas
      WHERE taller_id = (
        SELECT taller_id FROM public.usuarios
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_detalles_factura_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_detalles_factura_updated_at
  BEFORE UPDATE ON public.detalles_factura
  FOR EACH ROW
  EXECUTE FUNCTION public.update_detalles_factura_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detalles_factura TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detalles_factura TO service_role;
