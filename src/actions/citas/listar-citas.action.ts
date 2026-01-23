'use server'

import { createClient } from '@/lib/supabase/server'
import { ListarCitasUseCase } from '@/application/use-cases/citas'
import { SupabaseCitaRepository } from '@/infrastructure/repositories/supabase/cita.repository'
import type { FiltrosCitaDTO, CitasPaginadasDTO } from '@/application/dtos/cita.dto'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function listarCitasAction(
  filtros?: FiltrosCitaDTO
): Promise<ActionResult<CitasPaginadasDTO>> {
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
    const useCase = new ListarCitasUseCase(citaRepository)
    const citas = await useCase.execute(filtros || {}, usuario.taller_id)

    return { success: true, data: citas }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al listar las citas' }
  }
}
