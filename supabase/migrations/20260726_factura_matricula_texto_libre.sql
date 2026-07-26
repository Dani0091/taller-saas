-- Permite facturar por matrícula en texto libre cuando no se vincula un
-- vehiculo_id (alta rápida sin crear un registro de vehículo completo).
-- Mismo patrón ya usado en facturas_simplificadas.

ALTER TABLE facturas ADD COLUMN IF NOT EXISTS matricula TEXT;

COMMENT ON COLUMN facturas.matricula IS
'Matrícula en texto libre cuando la factura no está vinculada a un vehiculo_id. Si vehiculo_id existe, la matrícula se obtiene de vehiculos y este campo queda en null.';
