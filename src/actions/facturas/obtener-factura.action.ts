/**
 * @fileoverview Server Action: Obtener Factura
 * @description Server Action para obtener una factura por ID
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { ObtenerFacturaUseCase } from '@/application/use-cases'
import { SupabaseFacturaRepository } from '@/infrastructure/repositories/supabase/factura.repository'
import type { FacturaResponseDTO } from '@/application/dtos'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Server Action: Obtiene una factura por su ID
 */
export async function obtenerFacturaAction(
  facturaId: string
): Promise<ActionResult<FacturaResponseDTO>> {
  try {
    // 1. Obtener cliente de Supabase
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    // 2. Obtener datos del usuario
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, taller_id')
      .eq('auth_id', user.id)
      .single()

    if (usuarioError || !usuario) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // 3. Crear repositorio e instanciar Use Case
    const facturaRepository = new SupabaseFacturaRepository()
    const useCase = new ObtenerFacturaUseCase(facturaRepository)

    // 4. Ejecutar Use Case
    const factura = await useCase.execute(facturaId, usuario.taller_id)

    // 5. Retornar resultado
    return { success: true, data: factura }

  } catch (error: any) {
    console.error('Error en obtenerFacturaAction:', error)
    return {
      success: false,
      error: error.message || 'Error al obtener la factura'
    }
  }
}
