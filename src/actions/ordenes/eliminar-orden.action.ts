'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { EliminarOrdenUseCase } from '@/application/use-cases/ordenes'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories/supabase/orden.repository'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type VoidActionResult = { success: true } | { success: false; error: string }

/**
 * Server Action: Eliminar Orden
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function eliminarOrdenAction(id: string): Promise<VoidActionResult> {
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

    // 2. VALIDACIÓN BÁSICA DE ID
    if (!id || id.trim().length === 0) {
      return { success: false, error: 'El ID de la orden es obligatorio' }
    }

    // 3. EJECUTAR USE CASE
    const ordenRepository = new SupabaseOrdenRepository()
    const useCase = new EliminarOrdenUseCase(ordenRepository)
    await useCase.execute(id, usuario.taller_id, usuario.id)

    // 4. REVALIDAR CACHE
    revalidatePath('/ordenes')
    revalidatePath('/dashboard')

    return { success: true }

  } catch (error: any) {
    // 5. ERROR MAPPING (traducir errores técnicos a mensajes de usuario)
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return { success: false, error: domainError.message }
  }
}
