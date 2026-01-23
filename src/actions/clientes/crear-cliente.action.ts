'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CrearClienteUseCase } from '@/application/use-cases'
import { SupabaseClienteRepository } from '@/infrastructure/repositories/supabase/cliente.repository'
import type { CrearClienteDTO, ClienteResponseDTO } from '@/application/dtos'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function crearClienteAction(dto: CrearClienteDTO): Promise<ActionResult<ClienteResponseDTO>> {
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

    const clienteRepository = new SupabaseClienteRepository()
    const useCase = new CrearClienteUseCase(clienteRepository)
    const cliente = await useCase.execute(dto, usuario.taller_id)

    revalidatePath('/clientes')
    return { success: true, data: cliente }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al crear el cliente' }
  }
}
