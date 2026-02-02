/**
 * @fileoverview Use Case: Eliminar Vehículo
 * @description Elimina un vehículo (soft delete)
 */

import { IVehiculoRepository } from '@/application/ports'
import { NotFoundError } from '@/domain/errors'

export class EliminarVehiculoUseCase {
  constructor(private readonly vehiculoRepository: IVehiculoRepository) {}

  async execute(id: string, tallerId: string): Promise<void> {
    // 1. Verificar que el vehículo existe
    const vehiculo = await this.vehiculoRepository.obtenerPorId(id, tallerId)
    if (!vehiculo) {
      throw new NotFoundError('vehiculo', id)
    }

    // 2. Eliminar (soft delete)
    await this.vehiculoRepository.eliminar(id, tallerId)
  }
}
