'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { EliminarCitaUseCase } from '@/application/use-cases/citas'
import { SupabaseCitaRepository } from '@/infrastructure/repositories/supabase/cita.repository'

type ActionResult<void> = { success: true } | { success: false; error: string }

export async function eliminarCitaAction(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: usuario } = await supabase.from('usuarios').select('id, taller_id').eq('auth_id', user.id).single()
    if (!usuario) return { success: false, error: 'Usuario no encontrado' }

    const useCase = new EliminarCitaUseCase(new SupabaseCitaRepository())
    await useCase.execute(id, usuario.taller_id)

    revalidatePath('/citas')
    revalidatePath('/calendario')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al eliminar la cita' }
  }
}
