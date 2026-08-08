# RLS pendiente — auditoría 2026-08-06

Documentado tras auditoría de seguridad, sin aplicar (decisión: documentar ahora, arreglar más tarde).

## El problema

Row Level Security está **desactivado** en 6 tablas core, verificado vía `pg_class.relrowsecurity` en el proyecto vivo (`nimvxyhwjdfdlyjtofce`):

- `clientes`
- `ordenes_reparacion`
- `vehiculos`
- `lineas_orden`
- `detalles_factura`
- `talleres`

Con RLS desactivado, **cualquiera con la anon key pública** (que no es secreta — viene embebida en el bundle JS de cualquier app Supabase) puede leer o escribir **cualquier fila de estas tablas, de cualquier taller**, directamente vía la API de Supabase, sin pasar por la app ni por su lógica de autenticación.

`facturas`, `usuarios`, `google_calendar_tokens` y `google_calendar_events` sí tienen RLS activo correctamente — el patrón funciona, solo está aplicado de forma inconsistente.

## Por qué no es un simple `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

En `clientes` y `ordenes_reparacion` ya existen políticas correctas, con scope por taller (usando funciones como `get_my_taller_id()`/`is_same_taller()`) — pero **también** hay políticas antiguas, permisivas, con `qual: true` aplicándose a `public` (ej. "Allow select clientes"). Postgres combina políticas permisivas del mismo tipo de comando con OR — así que activar RLS sin antes eliminar esas políticas obsoletas dejaría las tablas tan expuestas como ahora, solo que con la falsa sensación de estar arregladas.

## Plan de arreglo (cuando se decida ejecutar)

Por cada una de las 6 tablas:

1. `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = '<tabla>';` — listar políticas actuales.
2. Identificar y `DROP POLICY` las políticas permisivas obsoletas (`qual: true` o equivalentes).
3. Confirmar que las políticas correctas restantes cubren SELECT/INSERT/UPDATE/DELETE según corresponda (algunas tablas solo tenían política de SELECT).
4. `ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;`
5. **Antes de dar por cerrada cada tabla**: probar los flujos reales de la app contra datos reales (listar órdenes, crear cliente, etc.) — una política mal escrita falla silenciosamente (devuelve 0 filas) en vez de dar error, así que "no hay error" no es prueba suficiente.

## Esfuerzo estimado

~1-2 horas, la mayor parte en probar cuidadosamente cada tabla tras el cambio, no en escribir el SQL en sí.

## Contexto

Encontrado originalmente por el advisor automático de Supabase MCP durante una consulta de esquema de rutina (no buscado explícitamente), confirmado con detalle vía auditoría dedicada de `pg_policies`. Ningún dato existente se ha visto afectado — la integridad de datos actual está limpia (verificado: cero registros huérfanos, cero taller_id inconsistentes). El riesgo es de exposición futura, no de corrupción ya ocurrida.
