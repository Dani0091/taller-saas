/**
 * @fileoverview Server Action: Crear Borrador desde Orden
 * @description Server Action para crear factura desde orden de reparación
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CrearBorradorDesdeOrdenUseCase } from '@/application/use-cases'
import { SupabaseFacturaRepository } from '@/infrastructure/repositories/supabase/factura.repository'
import { SupabaseOrdenRepository } from '@/infrastructure/repositories/supabase/orden.repository'
import type { CrearBorradorDesdeOrdenDTO, FacturaResponseDTO } from '@/application/dtos'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Server Action: Crea borrador de factura desde una orden
 */
export async function crearBorradorDesdeOrdenAction(
  dto: CrearBorradorDesdeOrdenDTO
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

    // 3. Crear repositorios e instanciar Use Case
    const facturaRepository = new SupabaseFacturaRepository()
    const ordenRepository = new SupabaseOrdenRepository()
    const useCase = new CrearBorradorDesdeOrdenUseCase(facturaRepository, ordenRepository)

    // 4. Ejecutar Use Case
    const factura = await useCase.execute(dto, usuario.taller_id, usuario.id)

    // 5. Revalidar rutas
    revalidatePath('/facturas')
    revalidatePath('/ordenes')
    revalidatePath(`/ordenes/${dto.ordenId}`)

    // 6. Retornar resultado
    return { success: true, data: factura }

  } catch (error: any) {
    console.error('Error en crearBorradorDesdeOrdenAction:', error)
    return {
      success: false,
      error: error.message || 'Error al crear factura desde orden'
    }
  }
}
