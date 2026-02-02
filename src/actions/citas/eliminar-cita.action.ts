'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type VoidActionResult = { success: true } | { success: false; error: string }

/**
 * Server Action: Eliminar Cita
 * Patrón simplificado: Auth → Validación → BD → Revalidate
 */
export async function eliminarCitaAction(id: string): Promise<VoidActionResult> {
  try {
    // 1. AUTENTICACIÓN CON FALLBACK
    const usuario = await obtenerUsuarioConFallback()
    if (!usuario) {
      return { success: false, error: 'No autenticado' }
    }

    // 2. VALIDACIÓN BÁSICA DE ID
    if (!id || id.trim().length === 0) {
      return { success: false, error: 'El ID de la cita es obligatorio' }
    }

    // 3. ELIMINAR CITA (soft delete)
    const supabase = await createClient()
    const { error } = await supabase
      .from('citas')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: usuario.id
      })
      .eq('id', id)
      .eq('taller_id', usuario.taller_id)

    if (error) {
      console.error('Error eliminando cita:', error)
      return { success: false, error: 'Error al eliminar la cita' }
    }

    // 4. REVALIDAR CACHE
    revalidatePath('/citas')
    revalidatePath('/calendario')
    revalidatePath('/dashboard')

    return { success: true }

  } catch (error: any) {
    console.error('Error en eliminarCitaAction:', error)
    return { success: false, error: error.message || 'Error al eliminar la cita' }
  }
}
