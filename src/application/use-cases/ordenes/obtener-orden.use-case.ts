/**
 * @fileoverview Use Case: Obtener Orden
 * @description Obtiene una orden específica por su ID
 *
 * RESPONSABILIDAD ÚNICA: Recuperar una orden completa
 * - Valida el ID
 * - Verifica seguridad (multi-tenancy)
 * - Retorna la orden con todas sus líneas
 */

import { IOrdenRepository } from '@/application/ports'
import { OrdenResponseDTO } from '@/application/dtos'
import { NotFoundError, ValidationError } from '@/domain/errors'

export class ObtenerOrdenUseCase {
  constructor(private readonly ordenRepository: IOrdenRepository) {}

  async execute(ordenId: string, tallerId: string): Promise<OrdenResponseDTO> {
    // 1. Validar ID
    if (!ordenId || ordenId.trim().length === 0) {
      throw new ValidationError('El ID de la orden es obligatorio', 'ordenId')
    }

    // 2. Obtener orden del repositorio
    const orden = await this.ordenRepository.obtenerPorId(ordenId, tallerId)

    // 3. Verificar que existe
    if (!orden) {
      throw new NotFoundError('orden', ordenId)
    }

    // 4. Retornar DTO completo
    return orden.toDTO()
  }
}
