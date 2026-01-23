/**
 * @fileoverview Use Case: Obtener Vehículo
 * @description Obtiene un vehículo por su ID
 */

import { IVehiculoRepository } from '@/application/ports'
import { VehiculoResponseDTO } from '@/application/dtos/vehiculo.dto'
import { NotFoundError } from '@/domain/errors'

export class ObtenerVehiculoUseCase {
  constructor(private readonly vehiculoRepository: IVehiculoRepository) {}

  async execute(id: string, tallerId: string): Promise<VehiculoResponseDTO> {
    const vehiculo = await this.vehiculoRepository.obtenerPorId(id, tallerId)

    if (!vehiculo) {
      throw new NotFoundError('vehiculo', id)
    }

    return vehiculo.toDTO()
  }
}
