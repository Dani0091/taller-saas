-- ============================================
-- TALLERAGIL - SCHEMA COMPLETO DE BASE DE DATOS
-- ============================================
-- Ejecutar este archivo COMPLETO en Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/[TU_PROYECTO]/sql/new
-- ============================================

-- ============================================
-- PARTE 1: TABLAS PRINCIPALES
-- ============================================

-- 1. TALLERES (empresas/negocios)
CREATE TABLE IF NOT EXISTS talleres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    cif VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USUARIOS (empleados del taller)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre VARCHAR(255),
    rol VARCHAR(50) DEFAULT 'operario',
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255),
    nif VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    provincia VARCHAR(100),
    codigo_postal VARCHAR(10),
    pais VARCHAR(100) DEFAULT 'España',
    notas TEXT,
    estado VARCHAR(20) DEFAULT 'activo',
    tipo_cliente VARCHAR(50) DEFAULT 'particular',
    iban VARCHAR(34),
    forma_pago VARCHAR(50) DEFAULT 'efectivo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. VEHÍCULOS
CREATE TABLE IF NOT EXISTS vehiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    matricula VARCHAR(20) NOT NULL,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    año INTEGER,
    color VARCHAR(50),
    kilometros INTEGER,
    vin VARCHAR(17),
    bastidor_vin VARCHAR(50),
    numero_motor VARCHAR(50),
    tipo_combustible VARCHAR(50),
    carroceria VARCHAR(50),
    potencia_cv INTEGER,
    cilindrada INTEGER,
    emisiones VARCHAR(50),
    fecha_matriculacion DATE,
    fotos JSONB,
    documentos JSONB,
    historial_reparaciones JSONB,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ÓRDENES DE REPARACIÓN
CREATE TABLE IF NOT EXISTS ordenes_reparacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    numero_orden VARCHAR(50) NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    operario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    estado VARCHAR(50) DEFAULT 'recibido',
    descripcion_problema TEXT,
    diagnostico TEXT,
    trabajos_realizados TEXT,
    fecha_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_salida_estimada TIMESTAMP WITH TIME ZONE,
    fecha_salida_real TIMESTAMP WITH TIME ZONE,
    tiempo_estimado_horas DECIMAL(10,2),
    tiempo_real_horas DECIMAL(10,2),
    subtotal_mano_obra DECIMAL(12,2) DEFAULT 0,
    subtotal_piezas DECIMAL(12,2) DEFAULT 0,
    iva_amount DECIMAL(12,2) DEFAULT 0,
    total_con_iva DECIMAL(12,2) DEFAULT 0,
    presupuesto_aprobado_por_cliente BOOLEAN DEFAULT FALSE,
    notas TEXT,
    fotos_entrada TEXT,
    fotos_salida TEXT,
    -- Campos formulario físico
    nivel_combustible VARCHAR(10),
    renuncia_presupuesto BOOLEAN DEFAULT FALSE,
    accion_imprevisto VARCHAR(20) DEFAULT 'avisar',
    recoger_piezas BOOLEAN DEFAULT FALSE,
    danos_carroceria TEXT,
    coste_diario_estancia DECIMAL(10,2),
    kilometros_entrada INTEGER,
    -- Campos presupuesto público
    token_publico UUID DEFAULT gen_random_uuid(),
    fecha_envio_presupuesto TIMESTAMP WITH TIME ZONE,
    fecha_aceptacion_cliente TIMESTAMP WITH TIME ZONE,
    ip_aceptacion VARCHAR(45),
    firma_cliente TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. LÍNEAS DE ORDEN (detalle de trabajos/piezas)
CREATE TABLE IF NOT EXISTS lineas_orden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES ordenes_reparacion(id) ON DELETE CASCADE,
    tipo VARCHAR(50) DEFAULT 'mano_obra',
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(10,2) DEFAULT 1,
    precio_unitario DECIMAL(12,2) DEFAULT 0,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    iva_porcentaje DECIMAL(5,2) DEFAULT 21,
    importe_total DECIMAL(12,2) DEFAULT 0,
    horas DECIMAL(10,2),
    operario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    operario_nombre VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. FACTURAS
CREATE TABLE IF NOT EXISTS facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    numero_factura VARCHAR(50) NOT NULL,
    numero_serie VARCHAR(20) DEFAULT 'A',
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,
    base_imponible DECIMAL(12,2) DEFAULT 0,
    iva DECIMAL(12,2) DEFAULT 0,
    iva_porcentaje DECIMAL(5,2) DEFAULT 21,
    total DECIMAL(12,2) DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'borrador',
    metodo_pago VARCHAR(50),
    notas TEXT,
    condiciones_pago TEXT,
    verifactu_numero VARCHAR(100),
    verifactu_url TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. LÍNEAS DE FACTURA
CREATE TABLE IF NOT EXISTS lineas_factura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(10,2) DEFAULT 1,
    precio_unitario DECIMAL(12,2) DEFAULT 0,
    iva_porcentaje DECIMAL(5,2) DEFAULT 21,
    importe_total DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CONFIGURACIÓN DEL TALLER
CREATE TABLE IF NOT EXISTS taller_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taller_id UUID NOT NULL UNIQUE REFERENCES talleres(id) ON DELETE CASCADE,
    tarifa_hora DECIMAL(10,2) DEFAULT 45.00,
    incluye_iva BOOLEAN DEFAULT FALSE,
    porcentaje_iva DECIMAL(5,2) DEFAULT 21,
    tarifa_con_iva BOOLEAN DEFAULT FALSE,
    nombre_empresa VARCHAR(255),
    cif VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    -- Campos adicionales facturación
    serie_factura VARCHAR(10) DEFAULT 'A',
    numero_factura_inicial INTEGER DEFAULT 1,
    iban VARCHAR(34),
    condiciones_pago TEXT DEFAULT 'Pago a 30 días',
    notas_factura TEXT,
    -- Colores marca
    color_primario VARCHAR(7) DEFAULT '#0ea5e9',
    color_secundario VARCHAR(7) DEFAULT '#f97316',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PARTE 2: ÍNDICES PARA RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_taller ON usuarios(taller_id);
CREATE INDEX IF NOT EXISTS idx_clientes_taller ON clientes(taller_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nif ON clientes(nif);
CREATE INDEX IF NOT EXISTS idx_vehiculos_taller ON vehiculos(taller_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_matricula ON vehiculos(matricula);
CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON vehiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_taller ON ordenes_reparacion(taller_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_cliente ON ordenes_reparacion(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo ON ordenes_reparacion(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_reparacion(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha ON ordenes_reparacion(fecha_entrada DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ordenes_token_publico ON ordenes_reparacion(token_publico);
CREATE INDEX IF NOT EXISTS idx_lineas_orden ON lineas_orden(orden_id);
CREATE INDEX IF NOT EXISTS idx_facturas_taller ON facturas(taller_id);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_lineas_factura ON lineas_factura(factura_id);

-- ============================================
-- PARTE 3: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE talleres ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_reparacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_orden ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE taller_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 4: POLÍTICAS DE SEGURIDAD
-- ============================================

-- TALLERES: Solo usuarios autenticados pueden ver/modificar su propio taller
CREATE POLICY IF NOT EXISTS "Usuarios ven su taller" ON talleres
    FOR SELECT USING (
        id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Usuarios modifican su taller" ON talleres
    FOR ALL USING (
        id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- USUARIOS: Solo pueden ver usuarios del mismo taller
CREATE POLICY IF NOT EXISTS "Ver usuarios del taller" ON usuarios
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Gestionar usuarios del taller" ON usuarios
    FOR ALL USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- CLIENTES: Solo del mismo taller
CREATE POLICY IF NOT EXISTS "Ver clientes del taller" ON clientes
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Gestionar clientes del taller" ON clientes
    FOR ALL USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- VEHÍCULOS: Solo del mismo taller
CREATE POLICY IF NOT EXISTS "Ver vehiculos del taller" ON vehiculos
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Gestionar vehiculos del taller" ON vehiculos
    FOR ALL USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- ÓRDENES: Solo del mismo taller
CREATE POLICY IF NOT EXISTS "Ver ordenes del taller" ON ordenes_reparacion
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Gestionar ordenes del taller" ON ordenes_reparacion
    FOR ALL USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- LÍNEAS ORDEN: A través de la orden padre
CREATE POLICY IF NOT EXISTS "Ver lineas del taller" ON lineas_orden
    FOR SELECT USING (
        orden_id IN (
            SELECT id FROM ordenes_reparacion
            WHERE taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
        )
    );

CREATE POLICY IF NOT EXISTS "Gestionar lineas del taller" ON lineas_orden
    FOR ALL USING (
        orden_id IN (
            SELECT id FROM ordenes_reparacion
            WHERE taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
        )
    );

-- FACTURAS: Solo del mismo taller
CREATE POLICY IF NOT EXISTS "Ver facturas del taller" ON facturas
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Gestionar facturas del taller" ON facturas
    FOR ALL USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- LÍNEAS FACTURA: A través de la factura padre
CREATE POLICY IF NOT EXISTS "Ver lineas factura del taller" ON lineas_factura
    FOR SELECT USING (
        factura_id IN (
            SELECT id FROM facturas
            WHERE taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
        )
    );

CREATE POLICY IF NOT EXISTS "Gestionar lineas factura del taller" ON lineas_factura
    FOR ALL USING (
        factura_id IN (
            SELECT id FROM facturas
            WHERE taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
        )
    );

-- CONFIGURACIÓN: Solo del mismo taller
CREATE POLICY IF NOT EXISTS "Ver config del taller" ON taller_config
    FOR SELECT USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

CREATE POLICY IF NOT EXISTS "Gestionar config del taller" ON taller_config
    FOR ALL USING (
        taller_id IN (SELECT taller_id FROM usuarios WHERE email = auth.jwt()->>'email')
    );

-- ============================================
-- PARTE 5: FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_talleres_updated_at ON talleres;
CREATE TRIGGER update_talleres_updated_at BEFORE UPDATE ON talleres
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehiculos_updated_at ON vehiculos;
CREATE TRIGGER update_vehiculos_updated_at BEFORE UPDATE ON vehiculos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ordenes_updated_at ON ordenes_reparacion;
CREATE TRIGGER update_ordenes_updated_at BEFORE UPDATE ON ordenes_reparacion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lineas_orden_updated_at ON lineas_orden;
CREATE TRIGGER update_lineas_orden_updated_at BEFORE UPDATE ON lineas_orden
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_facturas_updated_at ON facturas;
CREATE TRIGGER update_facturas_updated_at BEFORE UPDATE ON facturas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_taller_config_updated_at ON taller_config;
CREATE TRIGGER update_taller_config_updated_at BEFORE UPDATE ON taller_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- Ejecutar esto para verificar que todo se creó correctamente:

SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
