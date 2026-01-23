'use server'

import { createClient } from '@/lib/supabase/server'
import { ObtenerCitaUseCase } from '@/application/use-cases/citas'
import { SupabaseCitaRepository } from '@/infrastructure/repositories/supabase/cita.repository'
import type { CitaResponseDTO } from '@/application/dtos/cita.dto'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function obtenerCitaAction(id: string): Promise<ActionResult<CitaResponseDTO>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'No autenticado' }

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, taller_id')
      .eq('auth_id', user.id)
      .single()

    if (usuarioError || !usuario) return { success: false, error: 'Usuario no encontrado' }

    const citaRepository = new SupabaseCitaRepository()
    const useCase = new ObtenerCitaUseCase(citaRepository)
    const cita = await useCase.execute(id, usuario.taller_id)

    return { success: true, data: cita }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al obtener la cita' }
  }
}
