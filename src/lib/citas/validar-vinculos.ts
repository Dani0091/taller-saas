/**
 * @fileoverview Cliente, vehículo y orden de una cita: del mismo taller
 * @description Antes la API guardaba cualquier id recibido, también de otro
 * taller. Devuelve el mensaje de error o null si todo es válido.
 */

import type { createClient } from '@/lib/supabase/server'
import { validarVinculosTaller } from '@/lib/ordenes/validar-orden'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function validarVinculosCita(
  supabase: SupabaseServerClient,
  tallerId: string,
  datos: Record<string, unknown>
): Promise<string | null> {
  // '' equivale a "sin cliente/vehículo/orden"
  const vacioANull = (v: unknown) => (v === '' ? null : v)

  const error = await validarVinculosTaller(supabase, tallerId, {
    cliente_id: vacioANull(datos.cliente_id),
    vehiculo_id: vacioANull(datos.vehiculo_id),
  })
  if (error) return error

  const ordenId = vacioANull(datos.orden_id)
  if (ordenId === undefined || ordenId === null) return null
  if (typeof ordenId !== 'string') return 'orden_id inválido'
  const { data } = await supabase.from('ordenes_reparacion').select('id').eq('id', ordenId).eq('taller_id', tallerId).maybeSingle()
  return data ? null : 'orden_id no pertenece a este taller'
}
