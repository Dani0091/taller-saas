/**
 * @fileoverview Helper: Obtener Usuario con Fallback
 * @description Obtiene usuario por auth_id, con fallback a email y auto-reparación
 *
 * PATRÓN HÍBRIDO:
 * 1. Intenta obtener por auth_id (nuevo)
 * 2. Si falla, intenta por email (legacy)
 * 3. Si encuentra por email, repara el registro añadiendo auth_id
 */

'use server'

import { createClient } from '@/lib/supabase/server'

export interface UsuarioConTaller {
  id: string
  email: string
  nombre: string | null
  rol: string
  taller_id: string
  activo: boolean
  auth_id: string | null
  talleres?: {
    nombre: string
  }
}

/**
 * Obtiene usuario con fallback automático y auto-reparación
 *
 * @returns Usuario encontrado o null
 */
export async function obtenerUsuarioConFallback(): Promise<UsuarioConTaller | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError?.message)
      return null
    }

    // INTENTO 1: Buscar por auth_id (método nuevo)
    const { data: usuarioPorAuthId } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, taller_id, activo, auth_id, talleres(nombre)')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (usuarioPorAuthId) {
      console.log('✅ Usuario encontrado por auth_id:', usuarioPorAuthId.email)
      return usuarioPorAuthId as UsuarioConTaller
    }

    // INTENTO 2: Buscar por email (método legacy)
    console.log('⚠️ Usuario no encontrado por auth_id, intentando por email...')

    const { data: usuarioPorEmail } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, taller_id, activo, auth_id, talleres(nombre)')
      .eq('email', user.email)
      .maybeSingle()

    if (!usuarioPorEmail) {
      console.error('❌ Usuario no encontrado ni por auth_id ni por email:', user.email)
      return null
    }

    // REPARACIÓN AUTOMÁTICA: Vincular auth_id
    if (!usuarioPorEmail.auth_id) {
      console.log('🔧 Reparando usuario: añadiendo auth_id...')

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ auth_id: user.id })
        .eq('id', usuarioPorEmail.id)

      if (updateError) {
        console.error('⚠️ No se pudo reparar auth_id:', updateError.message)
      } else {
        console.log('✅ Usuario reparado: auth_id vinculado')
        usuarioPorEmail.auth_id = user.id
      }
    }

    return usuarioPorEmail as UsuarioConTaller

  } catch (error: any) {
    console.error('❌ Error obteniendo usuario:', error.message)
    return null
  }
}

/**
 * Obtiene el taller_id del usuario autenticado
 * Usa el mismo patrón de fallback
 */
export async function obtenerTallerIdDelUsuario(): Promise<string | null> {
  const usuario = await obtenerUsuarioConFallback()
  return usuario?.taller_id || null
}
