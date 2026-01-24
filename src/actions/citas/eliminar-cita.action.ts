'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { EliminarCitaUseCase } from '@/application/use-cases/citas'
import { SupabaseCitaRepository } from '@/infrastructure/repositories/supabase/cita.repository'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'

type ActionResult<void> = { success: true } | { success: false; error: string }

/**
 * Server Action: Eliminar Cita
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function eliminarCitaAction(id: string): Promise<ActionResult<void>> {
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

    // 2. VALIDACIÓN BÁSICA DE ID
    if (!id || id.trim().length === 0) {
      return { success: false, error: 'El ID de la cita es obligatorio' }
    }

    // 3. EJECUTAR USE CASE
    const citaRepository = new SupabaseCitaRepository()
    const useCase = new EliminarCitaUseCase(citaRepository)
    await useCase.execute(id, usuario.taller_id, usuario.id)

    // 4. REVALIDAR CACHE
    revalidatePath('/citas')
    revalidatePath('/calendario')
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
