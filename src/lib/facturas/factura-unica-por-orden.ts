/**
 * @fileoverview Una sola factura por orden ante peticiones simultáneas
 * @description cobro-rapido y desde-orden comprueban "¿ya hay factura?" y luego
 * insertan: dos peticiones a la vez pasaban la comprobación y creaban dos
 * facturas (y consumían dos números). Tras insertar su borrador, cada petición
 * mira cuál es la primera factura de la orden; si no es la suya, retira su
 * borrador recién creado (aún sin número) y responde 409.
 *
 * El orden (created_at, id) es el mismo para todas las peticiones, así que
 * como mucho una sigue adelante. La garantía completa la daría un índice
 * único en BD (propuesta SQL aparte).
 */

import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function esPrimeraFacturaDeOrden(
  supabase: SupabaseServerClient,
  ordenId: string,
  facturaId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('facturas')
    .select('id')
    .eq('orden_id', ordenId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
  return data?.[0]?.id === facturaId
}

/** Retira un borrador sin número creado por esta misma petición. */
export async function retirarBorradorPropio(supabase: SupabaseServerClient, facturaId: string): Promise<void> {
  await supabase.from('detalles_factura').delete().eq('factura_id', facturaId)
  await supabase.from('facturas').delete().eq('id', facturaId).eq('estado', 'borrador').is('numero_factura', null)
}
