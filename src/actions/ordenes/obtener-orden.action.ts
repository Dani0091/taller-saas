'use server'

import { createClient } from '@/lib/supabase/server'
import { ObtenerOrdenUseCase } from '@/application/use-cases/ordenes'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories/supabase/orden.repository'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { OrdenResponseDTO } from '@/application/dtos/orden.dto'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Obtener Orden
 */
export async function obtenerOrdenAction(id: string): Promise<ActionResult<OrdenResponseDTO>> {
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

    // 2. EJECUTAR USE CASE
    const ordenRepository = new SupabaseOrdenRepository()
    const useCase = new ObtenerOrdenUseCase(ordenRepository)
    const orden = await useCase.execute(id, usuario.taller_id)

    return { success: true, data: orden }

  } catch (error: any) {
    console.error('❌ Error en obtenerOrden:', {
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
      error: domainError.message || 'Error alObtener orden'
    }
  }
}
