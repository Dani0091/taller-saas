'use server'

import { createClient } from '@/lib/supabase/server'
import { ListarCitasUseCase } from '@/application/use-cases/citas'
import { SupabaseCitaRepository } from '@/infrastructure/repositories/supabase/cita.repository'
import { FiltrosCitaSchema } from '@/application/dtos/cita.dto'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { FiltrosCitaDTO, CitasPaginadasDTO } from '@/application/dtos/cita.dto'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Listar Citas
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function listarCitasAction(
  filtros?: FiltrosCitaDTO
): Promise<ActionResult<CitasPaginadasDTO>> {
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
    const validacion = FiltrosCitaSchema.safeParse(filtrosValidados)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Filtros inválidos: ${errores.join(', ')}` }
    }

    // 3. EJECUTAR USE CASE
    const citaRepository = new SupabaseCitaRepository()
    const useCase = new ListarCitasUseCase(citaRepository)
    const citas = await useCase.execute(validacion.data, usuario.taller_id)

    return { success: true, data: citas }

  } catch (error: any) {
    // 4. ERROR MAPPING (traducir errores técnicos a mensajes de usuario)
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return { success: false, error: domainError.message }
  }
}
