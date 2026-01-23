/**
 * @fileoverview Server Action: Emitir Factura
 * @description Server Action de Next.js para emitir facturas
 *
 * RESPONSABILIDAD: Bridge entre UI y Use Case
 * - Valida autenticación
 * - Obtiene datos del usuario/taller
 * - Delega lógica al Use Case
 * - Maneja errores y retorna respuestas
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { EmitirFacturaUseCase } from '@/application/use-cases'
import { SupabaseFacturaRepository } from '@/infrastructure/repositories/supabase/factura.repository'
import type { EmitirFacturaDTO, FacturaResponseDTO } from '@/application/dtos'

/**
 * Resultado de la acción (éxito o error)
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Server Action: Emite una factura en borrador
 */
export async function emitirFacturaAction(
  dto: EmitirFacturaDTO
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
    const useCase = new EmitirFacturaUseCase(facturaRepository)

    // 4. Ejecutar Use Case
    const factura = await useCase.execute(dto, usuario.taller_id, usuario.id)

    // 5. Revalidar rutas que muestran facturas
    revalidatePath('/facturas')
    revalidatePath(`/facturas/${factura.id}`)

    // 6. Retornar resultado
    return { success: true, data: factura }

  } catch (error: any) {
    console.error('Error en emitirFacturaAction:', error)
    return {
      success: false,
      error: error.message || 'Error al emitir la factura'
    }
  }
}
