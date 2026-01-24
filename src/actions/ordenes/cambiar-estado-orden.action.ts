'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CambiarEstadoOrdenUseCase } from '@/application/use-cases/ordenes'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories/supabase/orden.repository'
import { CambiarEstadoOrdenSchema } from '@/application/dtos/orden.dto'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { CambiarEstadoOrdenDTO, OrdenResponseDTO } from '@/application/dtos/orden.dto'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Cambiar Estado de Orden
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function cambiarEstadoOrdenAction(
  id: string,
  dto: CambiarEstadoOrdenDTO
): Promise<ActionResult<OrdenResponseDTO>> {
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
    const validacion = CambiarEstadoOrdenSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      return { success: false, error: `Datos inválidos: ${errores.join(', ')}` }
    }

    // 3. EJECUTAR USE CASE
    const ordenRepository = new SupabaseOrdenRepository()
    const useCase = new CambiarEstadoOrdenUseCase(ordenRepository)
    const ordenActualizada = await useCase.execute(
      id,
      validacion.data,
      usuario.taller_id,
      usuario.id
    )

    // 4. REVALIDAR CACHE
    revalidatePath('/ordenes')
    revalidatePath(`/ordenes/${id}`)
    revalidatePath('/dashboard')

    return { success: true, data: ordenActualizada }

  } catch (error: any) {
    // 5. ERROR MAPPING (traducir errores técnicos a mensajes de usuario)
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return { success: false, error: domainError.message }
  }
}
