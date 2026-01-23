'use server'

import { createClient } from '@/lib/supabase/server'
import { ListarVehiculosUseCase } from '@/application/use-cases/vehiculos'
import { SupabaseVehiculoRepository } from '@/infrastructure/repositories/supabase/vehiculo.repository'
import type { FiltrosVehiculoDTO, VehiculosPaginadosDTO } from '@/application/dtos/vehiculo.dto'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function listarVehiculosAction(
  filtros?: FiltrosVehiculoDTO
): Promise<ActionResult<VehiculosPaginadosDTO>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'No autenticado' }

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, taller_id')
      .eq('auth_id', user.id)
      .single()

    if (usuarioError || !usuario) return { success: false, error: 'Usuario no encontrado' }

    const vehiculoRepository = new SupabaseVehiculoRepository()
    const useCase = new ListarVehiculosUseCase(vehiculoRepository)
    const vehiculos = await useCase.execute(filtros || {}, usuario.taller_id)

    return { success: true, data: vehiculos }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al listar los vehículos' }
  }
}
