-- Tabla de facturas
CREATE TABLE IF NOT EXISTS facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  numero VARCHAR(20) NOT NULL,
  serie VARCHAR(5) NOT NULL,
  fecha TIMESTAMP NOT NULL,
  fecha_vencimiento TIMESTAMP NOT NULL,
  
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_nif VARCHAR(20) NOT NULL,
  cliente_direccion TEXT,
  cliente_codigo_postal VARCHAR(10),
  cliente_ciudad VARCHAR(100),
  cliente_provincia VARCHAR(100),
  
  taller_nombre VARCHAR(255) NOT NULL,
  taller_nif VARCHAR(20) NOT NULL,
  taller_direccion TEXT,
  taller_codigo_postal VARCHAR(10),
  taller_ciudad VARCHAR(100),
  taller_provincia VARCHAR(100),
  taller_telefono VARCHAR(20),
  taller_email VARCHAR(100),
  taller_web VARCHAR(255),
  
  base_imponible DECIMAL(10, 2) NOT NULL,
  total_impuestos DECIMAL(10, 2) NOT NULL,
  total_factura DECIMAL(10, 2) NOT NULL,
  
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('factura', 'presupuesto')),
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('borrador', 'emitida', 'pagada', 'anulada')),
  orden_trabajo_id UUID REFERENCES ordenes_trabajo(id) ON DELETE SET NULL,
  
  notas TEXT,
  condiciones_pago TEXT,
  
  numero_verifactu VARCHAR(100),
  url_verifactu TEXT,
  estado_verifactu VARCHAR(50),
  
  firmado BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  UNIQUE(taller_id, serie, numero)
);

-- Tabla de items de factura
CREATE TABLE IF NOT EXISTS factura_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad DECIMAL(10, 2) NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  impuesto DECIMAL(5, 2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de configuración de facturas
CREATE TABLE IF NOT EXISTS configuracion_facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id UUID NOT NULL UNIQUE REFERENCES talleres(id) ON DELETE CASCADE,
  
  serie_facturas VARCHAR(5) DEFAULT 'FA',
  serie_presupuestos VARCHAR(5) DEFAULT 'PR',
  numero_proximo_factura INTEGER DEFAULT 1,
  numero_proximo_presupuesto INTEGER DEFAULT 1,
  
  porcentaje_iva DECIMAL(5, 2) DEFAULT 21.00,
  retenciones_profesionales BOOLEAN DEFAULT FALSE,
  porcentaje_retenciones DECIMAL(5, 2),
  
  condiciones_pago TEXT,
  notas_factura TEXT,
  
  logo_url TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_facturas_taller ON facturas(taller_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_tipo ON facturas(tipo);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha);
CREATE INDEX IF NOT EXISTS idx_factura_items_factura ON factura_items(factura_id);

-- Políticas de seguridad (RLS)
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE factura_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their taller facturas" ON facturas
  FOR SELECT USING (
    taller_id IN (
      SELECT id FROM talleres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert facturas in their taller" ON facturas
  FOR INSERT WITH CHECK (
    taller_id IN (
      SELECT id FROM talleres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their facturas" ON facturas
  FOR UPDATE USING (
    taller_id IN (
      SELECT id FROM talleres WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their facturas" ON facturas
  FOR DELETE USING (
    taller_id IN (
      SELECT id FROM talleres WHERE user_id = auth.uid()
    )
  );
