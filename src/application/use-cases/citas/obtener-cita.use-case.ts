/**
 * @fileoverview Use Case: Obtener Cita
 * @description Obtiene una cita por su ID
 */

import { ICitaRepository } from '@/application/ports'
import { CitaResponseDTO } from '@/application/dtos/cita.dto'
import { NotFoundError } from '@/domain/errors'

export class ObtenerCitaUseCase {
  constructor(private readonly citaRepository: ICitaRepository) {}

  async execute(id: string, tallerId: string): Promise<CitaResponseDTO> {
    const cita = await this.citaRepository.obtenerPorId(id, tallerId)

    if (!cita) {
      throw new NotFoundError('cita', id)
    }

    return cita.toDTO()
  }
}
