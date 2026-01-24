'use server'

import { createClient } from '@/lib/supabase/server'
import { ObtenerFacturaUseCase } from '@/application/use-cases'
import { SupabaseFacturaRepository } from '@/infrastructure/repositories/supabase/factura.repository'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { FacturaResponseDTO } from '@/application/dtos'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Server Action: Obtener Factura
 * Patrón blindado: Auth → Validación → Use Case → Error Mapping
 */
export async function obtenerFacturaAction(
  facturaId: string
): Promise<ActionResult<FacturaResponseDTO>> {
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

    // 2. EJECUTAR USE CASE
    const facturaRepository = new SupabaseFacturaRepository()
    const useCase = new ObtenerFacturaUseCase(facturaRepository)
    const factura = await useCase.execute(facturaId, usuario.taller_id)

    return { success: true, data: factura }

  } catch (error: any) {
    // 3. ERROR MAPPING (traducir errores técnicos a mensajes de usuario)
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }

    const domainError = SupabaseErrorMapper.toDomainError(error)
    return { success: false, error: domainError.message }
  }
}
