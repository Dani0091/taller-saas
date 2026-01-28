'use server'

import { createClient } from '@/lib/supabase/server'
import { ObtenerClienteUseCase } from '@/application/use-cases'
import { SupabaseClienteRepository } from '@/infrastructure/repositories/supabase/cliente.repository'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { ClienteResponseDTO } from '@/application/dtos'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Obtener Cliente
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function obtenerClienteAction(id: string): Promise<ActionResult<ClienteResponseDTO>> {
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
    const clienteRepository = new SupabaseClienteRepository()
    const useCase = new ObtenerClienteUseCase(clienteRepository)
    const cliente = await useCase.execute(id, usuario.taller_id)

    return { success: true, data: cliente }

  } catch (error: any) {
    // 3. ERROR MAPPING (traducir errores técnicos a mensajes de usuario)
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return { success: false, error: domainError.message }
  }
}
