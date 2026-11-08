/**
 * @fileoverview Validación de datos de órdenes que llegan del cliente
 * @description Usado por api/ordenes (POST y PATCH). Evita la asignación
 * masiva de columnas de control (token_publico, taller_id, deleted_at,
 * fecha_aceptacion_cliente…) y los vínculos con registros de otro taller.
 */

import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/** Columnas que el cliente puede fijar al crear o editar una orden. */
export const CAMPOS_EDITABLES_ORDEN = [
  'estado', 'cliente_id', 'vehiculo_id', 'operario_id',
  'descripcion_problema', 'diagnostico', 'trabajos_realizados',
  'fecha_entrada', 'fecha_salida_estimada', 'fecha_salida_real',
  'tiempo_estimado_horas', 'tiempo_real_horas',
  'subtotal_mano_obra', 'subtotal_piezas', 'iva_amount', 'total_con_iva',
  'notas', 'fotos_entrada', 'fotos_salida',
  'kilometros_entrada', 'kilometros_salida', 'nivel_combustible',
  'danos_carroceria', 'renuncia_presupuesto', 'recoger_piezas',
  'accion_imprevisto', 'coste_diario_estancia', 'fotos_diagnostico',
] as const

// presupuesto_aprobado_por_cliente y fecha_aceptacion_cliente solo los fija la
// aceptación pública del presupuesto (api/presupuesto/[token]).

/** Solo al crear: el número de orden lo genera el formulario. */
const CAMPOS_SOLO_CREAR = ['numero_orden'] as const

/** 'facturado' solo lo pone la emisión de factura (cobro rápido / desde orden). */
const ESTADOS_RESERVADOS = ['facturado']

export type OrdenValidada =
  | { ok: true; datos: Record<string, unknown> }
  | { ok: false; error: string }

/**
 * Filtra el cuerpo recibido dejando solo columnas permitidas.
 * Cadenas vacías en ids se convierten en null (el formulario envía '').
 */
export function filtrarCamposOrden(body: unknown, modo: 'crear' | 'editar'): OrdenValidada {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Cuerpo de la petición inválido' }
  }
  const entrada = body as Record<string, unknown>
  const permitidos: readonly string[] =
    modo === 'crear' ? [...CAMPOS_EDITABLES_ORDEN, ...CAMPOS_SOLO_CREAR] : CAMPOS_EDITABLES_ORDEN

  const datos: Record<string, unknown> = {}
  for (const campo of permitidos) {
    if (campo in entrada) datos[campo] = entrada[campo]
  }

  for (const id of ['cliente_id', 'vehiculo_id', 'operario_id']) {
    if (id in datos) datos[id] = datos[id] || null
  }

  if (typeof datos.estado === 'string' && ESTADOS_RESERVADOS.includes(datos.estado)) {
    return { ok: false, error: `El estado "${datos.estado}" solo se asigna al emitir la factura` }
  }

  if (modo === 'crear' && (typeof datos.numero_orden !== 'string' || !datos.numero_orden.trim())) {
    return { ok: false, error: 'numero_orden es obligatorio' }
  }

  return { ok: true, datos }
}

/**
 * Comprueba que cliente, vehículo y operario (si vienen) pertenecen al taller.
 * Devuelve el mensaje de error o null si todo es válido.
 */
export async function validarVinculosTaller(
  supabase: SupabaseServerClient,
  tallerId: string,
  datos: Record<string, unknown>
): Promise<string | null> {
  const comprobaciones: Array<[string, 'clientes' | 'vehiculos' | 'usuarios']> = [
    ['cliente_id', 'clientes'],
    ['vehiculo_id', 'vehiculos'],
    ['operario_id', 'usuarios'],
  ]

  for (const [campo, tabla] of comprobaciones) {
    const id = datos[campo]
    if (id === undefined || id === null) continue
    if (typeof id !== 'string') return `${campo} inválido`

    const { data } = await supabase.from(tabla).select('id').eq('id', id).eq('taller_id', tallerId).maybeSingle()
    if (!data) return `${campo} no pertenece a este taller`
  }
  return null
}
