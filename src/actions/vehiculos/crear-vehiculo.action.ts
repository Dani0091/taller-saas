'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CrearVehiculoUseCase } from '@/application/use-cases/vehiculos'
import { SupabaseVehiculoRepository } from '@/infrastructure/repositories/supabase/vehiculo.repository'
import type { CrearVehiculoDTO, VehiculoResponseDTO } from '@/application/dtos/vehiculo.dto'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function crearVehiculoAction(dto: CrearVehiculoDTO): Promise<ActionResult<VehiculoResponseDTO>> {
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
    const useCase = new CrearVehiculoUseCase(vehiculoRepository)
    const vehiculo = await useCase.execute(dto, usuario.taller_id)

    revalidatePath('/vehiculos')
    return { success: true, data: vehiculo }
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al crear el vehículo' }
  }
}
