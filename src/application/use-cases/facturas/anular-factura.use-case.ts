/**
 * @fileoverview Use Case: Anular Factura
 * @description Anula una factura emitida (requiere motivo)
 *
 * RESPONSABILIDAD ÚNICA: Orquestar la anulación de una factura
 * - Valida que la factura pueda anularse
 * - Registra el motivo de anulación (obligatorio legalmente)
 * - Cambia el estado a ANULADA
 * - Registra auditoría (usuario que anuló)
 *
 * IMPORTANTE: Facturas anuladas NO se eliminan (normativa fiscal)
 * Se debe crear una factura rectificativa para reflejar la anulación
 */

import { IFacturaRepository } from '@/application/ports'
import { AnularFacturaDTO, AnularFacturaSchema, FacturaResponseDTO } from '@/application/dtos'
import { ValidationError, NotFoundError, BusinessRuleError } from '@/domain/errors'

export class AnularFacturaUseCase {
  constructor(private readonly facturaRepository: IFacturaRepository) {}

  async execute(
    dto: AnularFacturaDTO,
    tallerId: string,
    userId: string
  ): Promise<FacturaResponseDTO> {
    // 1. Validar DTO de entrada
    const validacion = AnularFacturaSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Anular mediante repositorio (maneja toda la lógica)
    const facturaAnulada = await this.facturaRepository.anular(
      datosValidados.facturaId,
      datosValidados.motivo,
      userId,
      tallerId
    )

    // 3. Retornar DTO de respuesta
    return facturaAnulada.toDTO()
  }
}
