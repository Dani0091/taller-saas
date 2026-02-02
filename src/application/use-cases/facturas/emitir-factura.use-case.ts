/**
 * @fileoverview Use Case: Emitir Factura
 * @description Emite una factura (cambia de borrador a emitida)
 *
 * RESPONSABILIDAD ÚNICA: Orquestar la emisión de una factura
 * - Valida que la factura pueda emitirse
 * - Asigna número de factura mediante RPC (atómico)
 * - Cambia el estado a EMITIDA
 * - Registra auditoría (usuario que emitió)
 *
 * CRÍTICO: Una vez emitida, la factura es INMUTABLE (normativa fiscal española)
 */

import { IFacturaRepository } from '@/application/ports'
import { EmitirFacturaDTO, EmitirFacturaSchema, FacturaResponseDTO } from '@/application/dtos'
import { ValidationError, NotFoundError, BusinessRuleError } from '@/domain/errors'

export class EmitirFacturaUseCase {
  constructor(private readonly facturaRepository: IFacturaRepository) {}

  async execute(
    dto: EmitirFacturaDTO,
    tallerId: string,
    userId: string
  ): Promise<FacturaResponseDTO> {
    // 1. Validar DTO de entrada
    const validacion = EmitirFacturaSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Obtener la factura
    const factura = await this.facturaRepository.obtenerPorId(
      datosValidados.facturaId,
      tallerId
    )

    if (!factura) {
      throw new NotFoundError('factura', datosValidados.facturaId)
    }

    // 3. Verificar que se puede emitir (Entity valida las reglas)
    if (!factura.puedeEmitirse()) {
      throw new BusinessRuleError(
        'La factura no puede ser emitida. Debe estar en borrador y tener al menos una línea.'
      )
    }

    // 4. Asignar número de factura si no tiene
    let numeroFactura = factura.getNumeroFactura()

    if (!numeroFactura) {
      const serie = datosValidados.serie
      const año = datosValidados.año || new Date().getFullYear()

      // Asignar número mediante RPC atómico (FOR UPDATE)
      const { numeroCompleto } = await this.facturaRepository.asignarNumeroFactura(
        factura.getId(),
        serie,
        año,
        tallerId
      )

      // Recargar la factura para obtener el número asignado
      const facturaConNumero = await this.facturaRepository.obtenerPorId(
        factura.getId(),
        tallerId
      )

      if (!facturaConNumero) {
        throw new Error('Error al recargar factura después de asignar número')
      }

      // Actualizar referencia local
      numeroFactura = facturaConNumero.getNumeroFactura()
    }

    // 5. Emitir la factura (Entity maneja la lógica)
    factura.asignarNumero(numeroFactura!, userId)
    factura.emitir(userId)

    // 6. Persistir cambios
    const facturaEmitida = await this.facturaRepository.emitir(factura, userId, tallerId)

    // 7. Retornar DTO de respuesta
    return facturaEmitida.toDTO()
  }
}
