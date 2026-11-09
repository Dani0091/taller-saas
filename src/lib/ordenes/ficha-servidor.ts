/**
 * @fileoverview Escrituras de la ficha de orden en el servidor
 * @description La ficha (detalle-orden-sheet) escribía directamente en
 * Supabase desde el navegador, con RLS como única protección. Estas
 * funciones las usan las rutas api/ordenes/ficha: campos permitidos,
 * vínculos del mismo taller, órdenes facturadas intocables y totales
 * calculados aquí desde las líneas guardadas.
 */

import type { createClient } from '@/lib/supabase/server'
import { ESTADOS_ORDEN } from '@/lib/constants'
import { CAMPOS_EDITABLES_ORDEN } from '@/lib/ordenes/validar-orden'
import { redondearImporte } from '@/lib/ordenes/version-presupuesto'
import { siguienteNumeroOrden } from '@/lib/ordenes/numero-orden'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Lo que la ficha puede fijar. Además de los campos de api/ordenes, los
 * propios de la ficha (autorización del cliente, IVA de la orden, entrega
 * prevista, observaciones). Los importes no: se calculan desde las líneas.
 */
const IMPORTES = ['subtotal_mano_obra', 'subtotal_piezas', 'iva_amount', 'total_con_iva']
export const CAMPOS_FICHA: readonly string[] = [
  ...CAMPOS_EDITABLES_ORDEN.filter((c) => !IMPORTES.includes(c)),
  'observaciones_cliente', 'presupuesto_aprobado_por_cliente', 'fecha_prevista_entrega', 'iva_porcentaje',
]

const ESTADOS_VALIDOS: readonly string[] = ESTADOS_ORDEN.map((e) => e.value)

export type CamposFicha = { ok: true; datos: Record<string, unknown> } | { ok: false; error: string }

/**
 * Deja solo los campos de la ficha. El estado tiene que ser uno de la lista
 * o el que ya tenía la orden (órdenes antiguas con otros estados siguen
 * pudiendo guardarse sin cambiarlo).
 */
export function filtrarCamposFicha(entrada: unknown, estadoActual?: string | null): CamposFicha {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return { ok: false, error: 'Datos de la orden inválidos' }
  }
  const origen = entrada as Record<string, unknown>
  const datos: Record<string, unknown> = {}
  for (const campo of CAMPOS_FICHA) {
    if (campo in origen && origen[campo] !== undefined) datos[campo] = origen[campo]
  }
  for (const id of ['cliente_id', 'vehiculo_id', 'operario_id']) {
    if (id in datos) datos[id] = datos[id] || null
  }
  if ('estado' in datos) {
    const estado = datos.estado
    if (typeof estado !== 'string' || (!ESTADOS_VALIDOS.includes(estado) && estado !== estadoActual)) {
      return { ok: false, error: 'Estado de la orden no válido' }
    }
  }
  if ('iva_porcentaje' in datos) {
    const iva = Number(datos.iva_porcentaje)
    if (!Number.isFinite(iva) || iva < 0 || iva > 100) return { ok: false, error: 'IVA de la orden no válido' }
    datos.iva_porcentaje = iva
  }
  return { ok: true, datos }
}

export const TIPOS_LINEA = ['mano_obra', 'pieza', 'servicio', 'suplido', 'reembolso'] as const

export interface LineaEntrada {
  tipo: string
  descripcion: string
  cantidad: number
  precio_unitario: number
}

/** Valida una línea nueva. Devuelve el mensaje de error o null. */
export function errorLinea(l: unknown): string | null {
  if (!l || typeof l !== 'object') return 'Línea inválida'
  const linea = l as Record<string, unknown>
  if (!TIPOS_LINEA.includes(linea.tipo as (typeof TIPOS_LINEA)[number])) return 'Tipo de línea no válido'
  if (typeof linea.descripcion !== 'string' || !linea.descripcion.trim()) return 'La línea necesita una descripción'
  return errorImportesLinea(linea)
}

/** Cantidad y precio, si vienen: números finitos y no negativos. */
export function errorImportesLinea(linea: Record<string, unknown>): string | null {
  for (const campo of ['cantidad', 'precio_unitario']) {
    if (!(campo in linea)) continue
    const n = linea[campo]
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return `${campo} no válido`
  }
  return null
}

export type OrdenDelTaller = { id: string; estado: string | null; iva_porcentaje: number | null }

/** La orden si es del taller y no está facturada; si no, el error HTTP. */
export async function ordenEditable(
  supabase: SupabaseServerClient,
  tallerId: string,
  ordenId: unknown
): Promise<{ orden: OrdenDelTaller } | { error: string; status: 400 | 404 | 409 }> {
  if (typeof ordenId !== 'string' || !ordenId) return { error: 'ID de orden requerido', status: 400 }
  const { data: orden } = await supabase
    .from('ordenes_reparacion')
    .select('id, estado, iva_porcentaje')
    .eq('id', ordenId)
    .eq('taller_id', tallerId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!orden) return { error: 'Orden no encontrada', status: 404 }
  if (orden.estado === 'facturado') return { error: 'Orden facturada: ya no se puede modificar', status: 409 }
  return { orden }
}

/**
 * Recalcula y guarda los importes de la orden desde sus líneas, con el IVA
 * de la orden (o el del taller). Los suplidos no llevan IVA. Mismo cálculo
 * que calcularTotalesOrdenAction, que es lo que la ficha muestra.
 */
export async function guardarTotalesOrden(supabase: SupabaseServerClient, tallerId: string, ordenId: string) {
  const [{ data: orden }, { data: lineas }, { data: config }] = await Promise.all([
    supabase.from('ordenes_reparacion').select('iva_porcentaje').eq('id', ordenId).eq('taller_id', tallerId).single(),
    supabase.from('lineas_orden').select('tipo, cantidad, precio_unitario').eq('orden_id', ordenId),
    supabase.from('taller_config').select('porcentaje_iva').eq('taller_id', tallerId).maybeSingle(),
  ])
  const iva = orden?.iva_porcentaje ?? config?.porcentaje_iva ?? 21
  const t = (lineas ?? []).reduce(
    (acc, l) => {
      const base = Number(l.cantidad) * Number(l.precio_unitario)
      const cuota = base * ((l.tipo === 'suplido' ? 0 : Number(iva)) / 100)
      return {
        manoObra: acc.manoObra + (l.tipo === 'mano_obra' ? base : 0),
        piezas: acc.piezas + (l.tipo === 'pieza' ? base : 0),
        iva: acc.iva + cuota,
        total: acc.total + base + cuota,
      }
    },
    { manoObra: 0, piezas: 0, iva: 0, total: 0 }
  )
  const { error } = await supabase
    .from('ordenes_reparacion')
    .update({
      subtotal_mano_obra: redondearImporte(t.manoObra),
      subtotal_piezas: redondearImporte(t.piezas),
      iva_amount: redondearImporte(t.iva),
      total_con_iva: redondearImporte(t.total),
    })
    .eq('id', ordenId)
    .eq('taller_id', tallerId)
    .neq('estado', 'facturado')
  if (error) throw error
}

const INTENTOS_NUMERO = 5

/**
 * Inserta la orden con el siguiente número OR-NNNN. Parte de la última orden
 * con ese formato (otras numeraciones no lo reinician a OR-0001) y, si el
 * número ya existe (UNIQUE taller_id + numero_orden), prueba el siguiente.
 */
export async function insertarOrdenNumerada(
  supabase: SupabaseServerClient,
  tallerId: string,
  datos: Record<string, unknown>
): Promise<{ id: string; numero_orden: string } | null> {
  const { data: ultima } = await supabase
    .from('ordenes_reparacion')
    .select('numero_orden')
    .eq('taller_id', tallerId)
    .like('numero_orden', 'OR-%')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let numero = siguienteNumeroOrden(ultima?.numero_orden)
  for (let intento = 0; intento < INTENTOS_NUMERO; intento++) {
    if (intento > 0) numero = siguienteNumeroOrden(numero)
    const { data, error } = await supabase
      .from('ordenes_reparacion')
      .insert({ ...datos, taller_id: tallerId, numero_orden: numero })
      .select('id, numero_orden')
      .single()
    if (data) return data
    if (error?.code !== '23505') throw error
  }
  return null
}
