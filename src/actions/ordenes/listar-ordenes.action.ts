'use server'

import { createClient } from '@/lib/supabase/server'
import { ListarOrdenesUseCase } from '@/application/use-cases/ordenes'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories/supabase/orden.repository'
import { FiltrosOrdenSchema } from '@/application/dtos/orden.dto'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { FiltrosOrdenDTO, OrdenPaginatedResponseDTO } from '@/application/dtos/orden.dto'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Listar Órdenes
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function listarOrdenesAction(
  filtros?: FiltrosOrdenDTO
): Promise<ActionResult<OrdenPaginatedResponseDTO>> {
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
    const filtrosValidados = filtros || {}
    const validacion = FiltrosOrdenSchema.safeParse(filtrosValidados)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Filtros inválidos: ${errores.join(', ')}` }
    }

    // 3. EJECUTAR USE CASE
    const ordenRepository = new SupabaseOrdenRepository()
    const useCase = new ListarOrdenesUseCase(ordenRepository)
    const ordenesPaginadas = await useCase.execute(validacion.data, usuario.taller_id)

    return { success: true, data: ordenesPaginadas }

  } catch (error: any) {
    // 4. ERROR MAPPING (traducir errores técnicos a mensajes de usuario)
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return { success: false, error: domainError.message }
  }
}
