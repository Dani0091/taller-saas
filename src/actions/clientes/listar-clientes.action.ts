'use server'

import { createClient } from '@/lib/supabase/server'
import { ListarClientesUseCase } from '@/application/use-cases'
import { SupabaseClienteRepository } from '@/infrastructure/repositories/supabase/cliente.repository'
import type { FiltrosClienteDTO, ClientesPaginadosDTO } from '@/application/dtos'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function listarClientesAction(filtros: FiltrosClienteDTO): Promise<ActionResult<ClientesPaginadosDTO>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: usuario } = await supabase.from('usuarios').select('taller_id').eq('auth_id', user.id).single()
    if (!usuario) return { success: false, error: 'Usuario no encontrado' }

    const useCase = new ListarClientesUseCase(new SupabaseClienteRepository())
    const resultado = await useCase.execute(filtros, usuario.taller_id)

    return { success: true, data: resultado }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al listar clientes' }
  }
}
