/**
 * @fileoverview Punto único de llamada a la RPC de numeración de facturas
 * @description Usado por api/facturas/emitir, rapida y cobro-rapido.
 * Al aplicar supabase/propuestas/A06 (v4), el cambio es solo RPC_NUMERACION.
 * factura.repository.ts usa la variante de 3 parámetros y no pasa por aquí.
 *
 * Formato y protección contra el truncado de LPAD: ver numeracion-formato.ts.
 */

import type { createClient } from '@/lib/supabase/server'
import { interpretarRespuestaNumeracion } from './numeracion-formato'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export const RPC_NUMERACION = 'asignar_numero_factura_v3'

export type NumeracionResult =
  | { ok: true; numeroCompleto: string }
  | { ok: false; errorMessage?: string }

/**
 * Asigna el siguiente número de la serie de forma atómica (FOR UPDATE en la RPC).
 * Producción (v3): PREFIJO-NNN, p. ej. FA-008. Desde 1000 se corrige el
 * truncado: FA-1000 en vez de FA-100.
 */
export async function asignarNumeroFactura(
  supabase: SupabaseServerClient,
  tallerId: string,
  prefijo: string
): Promise<NumeracionResult> {
  const { data, error } = await supabase.rpc(RPC_NUMERACION, {
    p_taller_id: tallerId,
    p_prefijo: prefijo,
  })

  if (error || !data) {
    return { ok: false, errorMessage: error?.message }
  }

  const respuesta = interpretarRespuestaNumeracion(data)

  if (!respuesta.valido) {
    // El número ya está consumido en la serie: queda un hueco, pero nunca un duplicado.
    console.error(`[numeracion] ${respuesta.motivo} (taller ${tallerId}, prefijo ${prefijo})`)
    return { ok: false, errorMessage: respuesta.motivo }
  }

  if (respuesta.corregidoTruncado) {
    console.warn(`[numeracion] LPAD truncado corregido → ${respuesta.numeroCompleto} (taller ${tallerId})`)
  }

  return { ok: true, numeroCompleto: respuesta.numeroCompleto }
}
