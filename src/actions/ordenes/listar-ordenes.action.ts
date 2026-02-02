'use server'

import { createClient } from '@/lib/supabase/server'
import { ListarOrdenesUseCase } from '@/application/use-cases/ordenes'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories/supabase/orden.repository'
import { FiltrosOrdenSchema } from '@/application/dtos/orden.dto'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { FiltrosOrdenDTO, OrdenPaginatedResponseDTO } from '@/application/dtos/orden.dto'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

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

    const usuario = await obtenerUsuarioConFallback()

    if (!usuario) {
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
    console.error('❌ Error en listarOrdenes:', {
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
      error: domainError.message || 'Error alListar ordenes'
    }
  }
}
