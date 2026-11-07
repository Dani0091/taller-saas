/**
 * @fileoverview taller_id del usuario autenticado para rutas API
 * @description Extraído sin cambios de las copias locales de
 * api/vehiculos, api/clientes/obtener y api/clientes/actualizar.
 */

import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type UsuarioTallerResult =
  | { tallerId: string }
  | { error: string; status: 401 | 403 }

/**
 * Obtiene el taller_id del usuario autenticado.
 * 401 sin sesión, 403 si el perfil no existe o no tiene taller.
 */
export async function getUsuarioTaller(supabase: SupabaseServerClient): Promise<UsuarioTallerResult> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autorizado', status: 401 }
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('taller_id')
    .eq('email', user.email)
    .single()

  if (!usuario?.taller_id) {
    return { error: 'Usuario sin taller asignado', status: 403 }
  }

  return { tallerId: usuario.taller_id }
}
