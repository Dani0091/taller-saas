'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ActualizarClienteUseCase } from '@/application/use-cases'
import { SupabaseClienteRepository } from '@/infrastructure/repositories/supabase/cliente.repository'
import { ActualizarClienteSchema } from '@/application/dtos/cliente.dto'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { ActualizarClienteDTO, ClienteResponseDTO } from '@/application/dtos'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Actualizar Cliente
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function actualizarClienteAction(
  id: string,
  dto: ActualizarClienteDTO
): Promise<ActionResult<ClienteResponseDTO>> {
  try {
    // 1. AUTENTICACIÓN
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    const usuario = await obtenerUsuarioConFallback()

    if (!usuario) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // 2. VALIDACIÓN DE DTO (primera capa de defensa)
    const validacion = ActualizarClienteSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Datos inválidos: ${errores.join(', ')}` }
    }

    // 3. EJECUTAR USE CASE
    const clienteRepository = new SupabaseClienteRepository()
    const useCase = new ActualizarClienteUseCase(clienteRepository)
    const cliente = await useCase.execute(id, validacion.data, usuario.taller_id)

    // 4. REVALIDAR CACHE
    revalidatePath('/clientes')
    revalidatePath(`/clientes/${id}`)
    revalidatePath('/dashboard')

    return { success: true, data: cliente }

  } catch (error: any) {
    console.error('❌ Error en actualizarCliente:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })

    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return {
      success: false,
      error: domainError.message || 'Error alActualizar cliente'
    }
  }
}
