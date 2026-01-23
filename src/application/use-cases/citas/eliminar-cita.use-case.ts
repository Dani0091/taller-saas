/**
 * @fileoverview Use Case: Eliminar Cita
 * @description Elimina una cita (soft delete)
 */

import { ICitaRepository } from '@/application/ports'
import { NotFoundError } from '@/domain/errors'

export class EliminarCitaUseCase {
  constructor(private readonly citaRepository: ICitaRepository) {}

  async execute(id: string, tallerId: string): Promise<void> {
    // 1. Verificar que la cita existe
    const cita = await this.citaRepository.obtenerPorId(id, tallerId)
    if (!cita) {
      throw new NotFoundError('cita', id)
    }

    // 2. Eliminar (soft delete)
    await this.citaRepository.eliminar(id, tallerId)
  }
}
