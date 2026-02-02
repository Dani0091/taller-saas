'use server'

import { createClient } from '@/lib/supabase/server'
import { ObtenerCitaUseCase } from '@/application/use-cases/citas'
import { SupabaseCitaRepository } from '@/infrastructure/repositories/supabase/cita.repository'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { CitaResponseDTO } from '@/application/dtos/cita.dto'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Obtener Cita
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function obtenerCitaAction(id: string): Promise<ActionResult<CitaResponseDTO>> {
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
    const citaRepository = new SupabaseCitaRepository()
    const useCase = new ObtenerCitaUseCase(citaRepository)
    const cita = await useCase.execute(id, usuario.taller_id)

    return { success: true, data: cita }

  } catch (error: any) {
    console.error('❌ Error en obtenerCita:', {
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
      error: domainError.message || 'Error alObtener cita'
    }
  }
}
