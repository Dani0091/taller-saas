/**
 * @fileoverview Server Action: Crear Borrador de Factura
 * @description Server Action de Next.js para crear borradores de facturas
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CrearBorradorFacturaUseCase } from '@/application/use-cases'
import { SupabaseFacturaRepository } from '@/infrastructure/repositories/supabase/factura.repository'
import type { CrearBorradorFacturaDTO, FacturaResponseDTO } from '@/application/dtos'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Server Action: Crea un nuevo borrador de factura
 */
export async function crearBorradorFacturaAction(
  dto: CrearBorradorFacturaDTO
): Promise<ActionResult<FacturaResponseDTO>> {
  try {
    // 1. Obtener cliente de Supabase (verifica autenticación)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'No autenticado' }
    }

    // 2. Obtener datos del usuario (taller_id)
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
    const useCase = new CrearBorradorFacturaUseCase(facturaRepository)

    // 4. Ejecutar Use Case
    const factura = await useCase.execute(dto, usuario.taller_id, usuario.id)

    // 5. Revalidar rutas
    revalidatePath('/facturas')

    // 6. Retornar resultado
    return { success: true, data: factura }

  } catch (error: any) {
    console.error('Error en crearBorradorFacturaAction:', error)
    return {
      success: false,
      error: error.message || 'Error al crear el borrador de factura'
    }
  }
}
