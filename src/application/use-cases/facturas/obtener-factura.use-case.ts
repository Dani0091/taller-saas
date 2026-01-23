/**
 * @fileoverview Use Case: Obtener Factura
 * @description Obtiene una factura por su ID
 *
 * RESPONSABILIDAD ÚNICA: Obtener y retornar una factura
 * - Valida que el ID sea válido
 * - Obtiene la factura del repositorio
 * - Verifica seguridad multi-tenant
 * - Retorna el DTO completo
 */

import { IFacturaRepository } from '@/application/ports'
import { FacturaResponseDTO } from '@/application/dtos'
import { ValidationError, NotFoundError } from '@/domain/errors'

export class ObtenerFacturaUseCase {
  constructor(private readonly facturaRepository: IFacturaRepository) {}

  async execute(facturaId: string, tallerId: string): Promise<FacturaResponseDTO> {
    // 1. Validar ID
    if (!facturaId || facturaId.trim().length === 0) {
      throw new ValidationError('El ID de factura es obligatorio', 'facturaId')
    }

    // 2. Obtener factura del repositorio
    const factura = await this.facturaRepository.obtenerPorId(facturaId, tallerId)

    if (!factura) {
      throw new NotFoundError('factura', facturaId)
    }

    // 3. Retornar DTO de respuesta
    return factura.toDTO()
  }
}
