'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CrearClienteUseCase } from '@/application/use-cases'
import { SupabaseClienteRepository } from '@/infrastructure/repositories/supabase/cliente.repository'
import { CrearClienteSchema } from '@/application/dtos/cliente.dto'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { CrearClienteDTO, ClienteResponseDTO } from '@/application/dtos'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Crear Cliente
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function crearClienteAction(dto: CrearClienteDTO): Promise<ActionResult<ClienteResponseDTO>> {
  try {
    // 1. AUTENTICACIÓN
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, taller_id')
      .eq('auth_id', user.id)
      .single()

    if (usuarioError || !usuario) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // 2. VALIDACIÓN DE DTO (primera capa de defensa)
    const validacion = CrearClienteSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Datos inválidos: ${errores.join(', ')}` }
    }

    // 3. EJECUTAR USE CASE
    const clienteRepository = new SupabaseClienteRepository()
    const useCase = new CrearClienteUseCase(clienteRepository)
    const cliente = await useCase.execute(validacion.data, usuario.taller_id)

    // 4. REVALIDAR CACHE
    revalidatePath('/clientes')
    revalidatePath('/dashboard')

    return { success: true, data: cliente }

  } catch (error: any) {
    // 5. ERROR MAPPING (traducir errores técnicos a mensajes de usuario)
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return { success: false, error: domainError.message }
  }
}
