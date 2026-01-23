/**
 * @fileoverview Use Case: Cambiar Estado de Orden
 * @description Cambia el estado de una orden de reparación
 *
 * RESPONSABILIDAD ÚNICA: Gestionar transiciones de estado
 * - Valida el nuevo estado
 * - Verifica que la orden existe
 * - Aplica reglas de negocio (ej. solo finalizada puede facturarse)
 * - Persiste el cambio
 */

import { IOrdenRepository } from '@/application/ports'
import { CambiarEstadoOrdenDTO, CambiarEstadoOrdenSchema, OrdenResponseDTO } from '@/application/dtos'
import { NotFoundError, ValidationError } from '@/domain/errors'

export class CambiarEstadoOrdenUseCase {
  constructor(private readonly ordenRepository: IOrdenRepository) {}

  async execute(
    ordenId: string,
    dto: CambiarEstadoOrdenDTO,
    tallerId: string,
    userId: string
  ): Promise<OrdenResponseDTO> {
    // 1. Validar DTO de entrada
    const validacion = CambiarEstadoOrdenSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Obtener la orden existente
    const orden = await this.ordenRepository.obtenerPorId(ordenId, tallerId)
    if (!orden) {
      throw new NotFoundError('orden', ordenId)
    }

    // 3. Cambiar el estado (la entity valida las reglas de negocio)
    orden.cambiarEstado(datosValidados.estado)

    // 4. Persistir en el repositorio
    const ordenActualizada = await this.ordenRepository.actualizar(orden, tallerId)

    // 5. Retornar DTO de respuesta
    return ordenActualizada.toDTO()
  }
}
