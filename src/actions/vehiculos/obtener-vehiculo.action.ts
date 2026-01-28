'use server'

import { createClient } from '@/lib/supabase/server'
import { ObtenerVehiculoUseCase } from '@/application/use-cases/vehiculos'
import { SupabaseVehiculoRepository } from '@/infrastructure/repositories/supabase/vehiculo.repository'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { VehiculoResponseDTO } from '@/application/dtos/vehiculo.dto'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Obtener Vehículo
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function obtenerVehiculoAction(id: string): Promise<ActionResult<VehiculoResponseDTO>> {
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
    const vehiculoRepository = new SupabaseVehiculoRepository()
    const useCase = new ObtenerVehiculoUseCase(vehiculoRepository)
    const vehiculo = await useCase.execute(id, usuario.taller_id)

    return { success: true, data: vehiculo }

  } catch (error: any) {
    // 3. ERROR MAPPING (traducir errores técnicos a mensajes de usuario)
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return { success: false, error: domainError.message }
  }
}
