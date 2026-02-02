/**
 * @fileoverview Server Action: Cerrar Sesión
 * @description Cierra la sesión del usuario de forma segura
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type ActionResult = { success: true } | { success: false; error: string }

/**
 * Server Action: Cerrar Sesión
 * Invalida la sesión del usuario y redirige al login
 */
export async function cerrarSesionAction(): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('❌ Error en cerrarSesion:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })

    return {
      success: false,
      error: error.message || error.details || error.hint || 'Error al cerrar sesión'
    }
  }
}
