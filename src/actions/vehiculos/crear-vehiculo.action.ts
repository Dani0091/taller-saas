'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CrearVehiculoUseCase } from '@/application/use-cases/vehiculos'
import { SupabaseVehiculoRepository } from '@/infrastructure/repositories/supabase/vehiculo.repository'
import { CrearVehiculoSchema } from '@/application/dtos/vehiculo.dto'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { CrearVehiculoDTO, VehiculoResponseDTO } from '@/application/dtos/vehiculo.dto'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Crear Vehículo
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function crearVehiculoAction(dto: CrearVehiculoDTO): Promise<ActionResult<VehiculoResponseDTO>> {
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
    const validacion = CrearVehiculoSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Datos inválidos: ${errores.join(', ')}` }
    }

    // 3. EJECUTAR USE CASE
    const vehiculoRepository = new SupabaseVehiculoRepository()
    const useCase = new CrearVehiculoUseCase(vehiculoRepository)
    const vehiculo = await useCase.execute(validacion.data, usuario.taller_id)

    // 4. REVALIDAR CACHE
    revalidatePath('/vehiculos')
    revalidatePath('/dashboard')

    return { success: true, data: vehiculo }

  } catch (error: any) {
    console.error('❌ Error en crearVehiculo:', {
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
      error: domainError.message || 'Error alCrear vehiculo'
    }
  }
}
