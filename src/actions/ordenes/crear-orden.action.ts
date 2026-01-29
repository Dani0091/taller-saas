'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CrearOrdenUseCase } from '@/application/use-cases/ordenes'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories/supabase/orden.repository'
import { CrearOrdenSchema } from '@/application/dtos/orden.dto'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { CrearOrdenDTO, OrdenResponseDTO } from '@/application/dtos/orden.dto'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Crear Orden
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function crearOrdenAction(dto: CrearOrdenDTO): Promise<ActionResult<OrdenResponseDTO>> {
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
    const validacion = CrearOrdenSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Datos inválidos: ${errores.join(', ')}` }
    }

    // 3. EJECUTAR USE CASE
    const ordenRepository = new SupabaseOrdenRepository()
    const useCase = new CrearOrdenUseCase(ordenRepository)
    const orden = await useCase.execute(validacion.data, usuario.taller_id, usuario.id)

    // 4. REVALIDAR CACHE
    revalidatePath('/ordenes')
    revalidatePath('/dashboard')

    return { success: true, data: orden }

  } catch (error: any) {
    console.error('❌ Error en crearOrden:', {
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
      error: domainError.message || 'Error alCrear orden'
    }
  }
}
