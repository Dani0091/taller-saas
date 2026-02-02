/**
 * @fileoverview Use Case: Eliminar Orden
 * @description Elimina una orden (soft delete)
 *
 * RESPONSABILIDAD ÚNICA: Gestionar la eliminación de órdenes
 * - Verifica que la orden existe
 * - Aplica reglas de negocio (no se puede eliminar si está facturada)
 * - Realiza soft delete
 */

import { IOrdenRepository } from '@/application/ports'
import { NotFoundError, ValidationError } from '@/domain/errors'

export class EliminarOrdenUseCase {
  constructor(private readonly ordenRepository: IOrdenRepository) {}

  async execute(ordenId: string, tallerId: string, userId: string): Promise<void> {
    // 1. Validar ID
    if (!ordenId || ordenId.trim().length === 0) {
      throw new ValidationError('El ID de la orden es obligatorio', 'ordenId')
    }

    if (!userId || userId.trim().length === 0) {
      throw new ValidationError('El ID del usuario es obligatorio', 'userId')
    }

    // 2. Obtener la orden existente
    const orden = await this.ordenRepository.obtenerPorId(ordenId, tallerId)
    if (!orden) {
      throw new NotFoundError('orden', ordenId)
    }

    // 3. Verificar que se puede eliminar (regla de negocio en la entity)
    orden.eliminar(userId)

    // 4. Persistir la eliminación en el repositorio
    await this.ordenRepository.eliminar(ordenId, tallerId, userId)
  }
}
