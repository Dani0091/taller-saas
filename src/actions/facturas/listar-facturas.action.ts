/**
 * @fileoverview Server Action: Listar Facturas
 * @description Server Action para listar facturas con filtros
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { ListarFacturasUseCase } from '@/application/use-cases'
import { SupabaseFacturaRepository } from '@/infrastructure/repositories/supabase/factura.repository'
import type { FiltrosFacturaDTO, FacturasPaginadasDTO } from '@/application/dtos'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Server Action: Lista facturas con filtros y paginación
 */
export async function listarFacturasAction(
  filtros: FiltrosFacturaDTO
): Promise<ActionResult<FacturasPaginadasDTO>> {
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
    const useCase = new ListarFacturasUseCase(facturaRepository)

    // 4. Ejecutar Use Case
    const resultado = await useCase.execute(filtros, usuario.taller_id)

    // 5. Retornar resultado
    return { success: true, data: resultado }

  } catch (error: any) {
    console.error('Error en listarFacturasAction:', error)
    return {
      success: false,
      error: error.message || 'Error al listar facturas'
    }
  }
}
