'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ActualizarClienteUseCase } from '@/application/use-cases'
import { SupabaseClienteRepository } from '@/infrastructure/repositories/supabase/cliente.repository'
import type { ActualizarClienteDTO, ClienteResponseDTO } from '@/application/dtos'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function actualizarClienteAction(id: string, dto: ActualizarClienteDTO): Promise<ActionResult<ClienteResponseDTO>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: usuario } = await supabase.from('usuarios').select('taller_id').eq('auth_id', user.id).single()
    if (!usuario) return { success: false, error: 'Usuario no encontrado' }

    const useCase = new ActualizarClienteUseCase(new SupabaseClienteRepository())
    const cliente = await useCase.execute(id, dto, usuario.taller_id)

    revalidatePath('/clientes')
    revalidatePath(`/clientes/${id}`)
    return { success: true, data: cliente }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al actualizar el cliente' }
  }
}
