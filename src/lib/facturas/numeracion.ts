/**
 * @fileoverview Punto único de llamada a la RPC de numeración de facturas
 * @description Usado por api/facturas/emitir, rapida y cobro-rapido.
 * factura.repository.ts usa la variante de 3 parámetros y no pasa por aquí.
 *
 * v4 (propuesta A06, aplicada en producción el 2026-11-08) solo numera para
 * el taller del usuario (por auth_id, como las RLS) y además exige que no esté
 * marcado activo = false, cosa que el resto de la app no comprueba. Si v4
 * rechaza el acceso o no existe, se usa v3 y se deja un error en el log:
 * nadie que factura hoy deja de poder hacerlo y el caso queda a la vista.
 * Las dos comparten contador y formato.
 *
 * Formato y protección contra el truncado de LPAD: ver numeracion-formato.ts.
 */

import type { createClient } from '@/lib/supabase/server'
import { interpretarRespuestaNumeracion } from './numeracion-formato'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export const RPC_NUMERACION = 'asignar_numero_factura_v4'
export const RPC_NUMERACION_ANTERIOR = 'asignar_numero_factura_v3'

/** v4 no instalada (PostgREST) o acceso rechazado por v4. */
function usarRpcAnterior(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === 'PGRST202' || /Sin acceso a la numeración/.test(error.message ?? '')
}

export type NumeracionResult =
  | { ok: true; numeroCompleto: string }
  | { ok: false; errorMessage?: string }

/**
 * Asigna el siguiente número de la serie de forma atómica (FOR UPDATE en la RPC).
 * Formato PREFIJO-NNN, p. ej. FA-008; desde 1000, FA-1000 (v3 truncaba a
 * FA-100 y aquí se corrige igualmente).
 */
export async function asignarNumeroFactura(
  supabase: SupabaseServerClient,
  tallerId: string,
  prefijo: string
): Promise<NumeracionResult> {
  const parametros = { p_taller_id: tallerId, p_prefijo: prefijo }
  let { data, error } = await supabase.rpc(RPC_NUMERACION, parametros)

  if (usarRpcAnterior(error)) {
    // v4 rechaza antes de tocar el contador: no se ha consumido ningún número
    console.error(`[numeracion] ${RPC_NUMERACION} no disponible (${error?.message}); se usa ${RPC_NUMERACION_ANTERIOR} (taller ${tallerId})`)
    ;({ data, error } = await supabase.rpc(RPC_NUMERACION_ANTERIOR, parametros))
  }

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
