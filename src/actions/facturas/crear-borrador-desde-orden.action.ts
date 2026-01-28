'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CrearBorradorDesdeOrdenUseCase } from '@/application/use-cases'
import { SupabaseFacturaRepository } from '@/infrastructure/repositories/supabase/factura.repository'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories/supabase/orden.repository'
import { CrearBorradorDesdeOrdenSchema } from '@/application/dtos/factura.dto'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { CrearBorradorDesdeOrdenDTO, FacturaResponseDTO } from '@/application/dtos'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Crear Borrador desde Orden
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function crearBorradorDesdeOrdenAction(
  dto: CrearBorradorDesdeOrdenDTO
): Promise<ActionResult<FacturaResponseDTO>> {
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
    const validacion = CrearBorradorDesdeOrdenSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Datos inválidos: ${errores.join(', ')}` }
    }

    // 3. EJECUTAR USE CASE
    const facturaRepository = new SupabaseFacturaRepository()
    const ordenRepository = new SupabaseOrdenRepository()
    const useCase = new CrearBorradorDesdeOrdenUseCase(facturaRepository, ordenRepository)
    const factura = await useCase.execute(validacion.data, usuario.taller_id, usuario.id)

    // 4. REVALIDAR CACHE
    revalidatePath('/facturas')
    revalidatePath('/ordenes')
    revalidatePath(`/ordenes/${validacion.data.ordenId}`)
    revalidatePath('/dashboard')

    return { success: true, data: factura }

  } catch (error: any) {
    // 5. ERROR MAPPING (traducir errores técnicos a mensajes de usuario)
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return { success: false, error: domainError.message }
  }
}
