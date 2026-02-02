'use server'

import { createClient } from '@/lib/supabase/server'
import { ObtenerFacturaUseCase } from '@/application/use-cases'
import { SupabaseFacturaRepository } from '@/infrastructure/repositories/supabase/factura.repository'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { AppError } from '@/domain/errors/AppError'
import type { FacturaResponseDTO } from '@/application/dtos'
import { obtenerUsuarioConFallback } from '@/lib/auth/obtener-usuario-fallback'

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

    const usuario = await obtenerUsuarioConFallback()

    if (!usuario) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // 2. EJECUTAR USE CASE
    const facturaRepository = new SupabaseFacturaRepository()
    const useCase = new ObtenerFacturaUseCase(facturaRepository)
    const factura = await useCase.execute(facturaId, usuario.taller_id)

    return { success: true, data: factura }

  } catch (error: any) {
    console.error('❌ Error en obtenerFactura:', {
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
      error: domainError.message || 'Error alObtener factura'
    }
  }
}
