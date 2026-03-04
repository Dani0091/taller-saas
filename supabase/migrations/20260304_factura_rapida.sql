-- ============================================================
-- MIGRACIÓN: Factura Rápida Standalone
-- Fecha: 2026-03-04
-- Idempotente: segura para re-ejecutar (IF NOT EXISTS / ON CONFLICT)
-- NO modifica tablas existentes. Solo añade nuevas.
-- ============================================================

-- ============================================================
-- PARTE 1: Tabla plantillas_rapidas
-- ============================================================
-- Plantillas predefinidas para agilizar la emisión de FS.
-- lineas_items: [{concepto, descripcion, cantidad, precio_unitario}]

CREATE TABLE IF NOT EXISTS plantillas_rapidas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id             UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  nombre                TEXT NOT NULL,
  descripcion_operacion TEXT,
  lineas_items          JSONB NOT NULL DEFAULT '[]',
  precio_total_estimado NUMERIC(10,2) NOT NULL DEFAULT 0,
  activa                BOOLEAN NOT NULL DEFAULT true,
  orden_display         INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plantillas_rapidas_taller
  ON plantillas_rapidas(taller_id)
  WHERE activa = true;

-- RLS
ALTER TABLE plantillas_rapidas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'plantillas_rapidas' AND policyname = 'plantillas_rapidas_taller_policy'
  ) THEN
    CREATE POLICY plantillas_rapidas_taller_policy ON plantillas_rapidas
      USING (taller_id = public.get_my_taller_id())
      WITH CHECK (taller_id = public.get_my_taller_id());
  END IF;
END;
$$;

COMMENT ON TABLE plantillas_rapidas IS
  'Plantillas de operaciones frecuentes para emisión rápida de facturas FS.';

-- ============================================================
-- PARTE 2: Tabla facturas_simplificadas
-- ============================================================
-- Facturas emitidas en el acto, sin necesidad de orden previa.
-- Serie: FS. Límite sin identificación cliente: 400 € (umbral interno taller).
-- Incluye encadenamiento VeriFACTU propio de la serie FS.

CREATE TABLE IF NOT EXISTS facturas_simplificadas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id               UUID NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
  numero_factura          TEXT UNIQUE,
  fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
  matricula               TEXT NOT NULL,
  vehiculo_id             UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
  cliente_id              UUID REFERENCES clientes(id) ON DELETE SET NULL,
  lineas_items            JSONB NOT NULL DEFAULT '[]',
  base_imponible          NUMERIC(10,2) NOT NULL,
  iva_porcentaje          NUMERIC(5,2) NOT NULL DEFAULT 21,
  iva                     NUMERIC(10,2) NOT NULL,
  total                   NUMERIC(10,2) NOT NULL,
  metodo_pago             TEXT NOT NULL DEFAULT 'E',  -- E=efectivo, T=tarjeta, B=bizum
  huella_hash             TEXT,
  encadenamiento_anterior TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturas_simplificadas_taller
  ON facturas_simplificadas(taller_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_facturas_simplificadas_vehiculo
  ON facturas_simplificadas(vehiculo_id)
  WHERE vehiculo_id IS NOT NULL;

-- RLS
ALTER TABLE facturas_simplificadas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'facturas_simplificadas' AND policyname = 'facturas_simplificadas_taller_policy'
  ) THEN
    CREATE POLICY facturas_simplificadas_taller_policy ON facturas_simplificadas
      USING (taller_id = public.get_my_taller_id())
      WITH CHECK (taller_id = public.get_my_taller_id());
  END IF;
END;
$$;

COMMENT ON TABLE facturas_simplificadas IS
  'Facturas simplificadas FS emitidas sin orden previa (Factura Rápida).
   Límite sin cliente identificado: 400 EUR (umbral R&S). Encadenamiento VeriFACTU propio.';

-- ============================================================
-- PARTE 3: Serie FS en series_factura
-- ============================================================
-- Insertar para cada taller existente. ON CONFLICT DO NOTHING = idempotente.

INSERT INTO series_factura (taller_id, nombre, prefijo, año, ultimo_numero)
SELECT id, 'Facturas Simplificadas', 'FS', 2026, 0
FROM talleres
ON CONFLICT (taller_id, prefijo) DO NOTHING;

-- ============================================================
-- PARTE 4: Plantillas por defecto
-- ============================================================
-- Insertadas solo si el taller no tiene ninguna plantilla todavía.
-- ON CONFLICT en (taller_id, nombre) para idempotencia.

DO $$
DECLARE
  v_taller_id UUID;
BEGIN
  FOR v_taller_id IN SELECT id FROM talleres LOOP
    -- Pinchazo
    INSERT INTO plantillas_rapidas
      (taller_id, nombre, descripcion_operacion, lineas_items, precio_total_estimado, orden_display)
    VALUES (
      v_taller_id,
      'Pinchazo',
      'Reparación de pinchazo / cambio de rueda',
      '[{"concepto":"Reparación pinchazo","descripcion":"Desmontaje, reparación y montaje","cantidad":1,"precio_unitario":20.66}]'::jsonb,
      25.00,
      1
    )
    ON CONFLICT DO NOTHING;

    -- Carga de batería
    INSERT INTO plantillas_rapidas
      (taller_id, nombre, descripcion_operacion, lineas_items, precio_total_estimado, orden_display)
    VALUES (
      v_taller_id,
      'Carga Batería',
      'Carga y comprobación de batería',
      '[{"concepto":"Carga de batería","descripcion":"Carga completa y test de batería","cantidad":1,"precio_unitario":33.06}]'::jsonb,
      40.00,
      2
    )
    ON CONFLICT DO NOTHING;

    -- Revisión aceite
    INSERT INTO plantillas_rapidas
      (taller_id, nombre, descripcion_operacion, lineas_items, precio_total_estimado, orden_display)
    VALUES (
      v_taller_id,
      'Revisión Aceite',
      'Cambio de aceite y filtro',
      '[{"concepto":"Mano de obra","descripcion":"Cambio de aceite y filtro","cantidad":0.5,"precio_unitario":60.00},{"concepto":"Aceite 5W40 (4L)","descripcion":"Aceite sintético homologado","cantidad":1,"precio_unitario":28.93}]'::jsonb,
      65.00,
      3
    )
    ON CONFLICT DO NOTHING;

    -- Pre-ITV
    INSERT INTO plantillas_rapidas
      (taller_id, nombre, descripcion_operacion, lineas_items, precio_total_estimado, orden_display)
    VALUES (
      v_taller_id,
      'Pre-ITV',
      'Revisión pre-inspección técnica',
      '[{"concepto":"Revisión pre-ITV","descripcion":"Inspección general: luces, frenos, suspension y fluidos","cantidad":1,"precio_unitario":28.93}]'::jsonb,
      35.00,
      4
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Plantillas por defecto insertadas correctamente.';
END;
$$;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
