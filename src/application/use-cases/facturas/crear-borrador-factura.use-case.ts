/**
 * @fileoverview Use Case: Crear Borrador de Factura
 * @description Crea una nueva factura en estado borrador
 *
 * RESPONSABILIDAD ÚNICA: Orquestar la creación de un borrador de factura
 * - Valida el DTO de entrada
 * - Crea la entity con sus líneas
 * - Persiste en el repositorio
 * - Retorna el DTO de respuesta
 *
 * VENTAJA: Los borradores se pueden modificar libremente hasta que se emitan
 */

import { IFacturaRepository } from '@/application/ports'
import { CrearBorradorFacturaDTO, CrearBorradorFacturaSchema, FacturaResponseDTO } from '@/application/dtos'
import { FacturaEntity, LineaFacturaEntity } from '@/domain/entities'
import { Precio, Retencion, NIF } from '@/domain/value-objects'
import { EstadoFactura, TipoLineaFactura } from '@/domain/types'
import { ValidationError } from '@/domain/errors'

export class CrearBorradorFacturaUseCase {
  constructor(private readonly facturaRepository: IFacturaRepository) {}

  async execute(
    dto: CrearBorradorFacturaDTO,
    tallerId: string,
    userId: string
  ): Promise<FacturaResponseDTO> {
    // 1. Validar DTO de entrada
    const validacion = CrearBorradorFacturaSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Crear líneas de factura
    const lineas: LineaFacturaEntity[] = []
    if (datosValidados.lineas && datosValidados.lineas.length > 0) {
      for (const lineaDTO of datosValidados.lineas) {
        const linea = LineaFacturaEntity.create({
          id: this.generarId(),
          facturaId: '', // Se asignará después de crear la factura
          tipo: lineaDTO.tipo,
          descripcion: lineaDTO.descripcion,
          referencia: lineaDTO.referencia,
          cantidad: lineaDTO.cantidad,
          precioUnitario: Precio.create(lineaDTO.precioUnitario),
          descuentoPorcentaje: lineaDTO.descuentoPorcentaje,
          descuentoImporte: lineaDTO.descuentoImporte
            ? Precio.create(lineaDTO.descuentoImporte)
            : undefined,
          ivaPorcentaje: lineaDTO.ivaPorcentaje
        })
        lineas.push(linea)
      }
    }

    // 3. Procesar NIF del cliente si se proporciona
    let clienteNIF: NIF | undefined
    if (datosValidados.clienteNIF) {
      try {
        clienteNIF = NIF.create(datosValidados.clienteNIF)
      } catch (error) {
        throw new ValidationError('NIF del cliente inválido', 'clienteNIF')
      }
    }

    // 4. Crear retención si se especifica
    const retencion = datosValidados.porcentajeRetencion
      ? Retencion.create(datosValidados.porcentajeRetencion)
      : Retencion.ninguna()

    // 5. Procesar fechas
    const fechaEmision = datosValidados.fechaEmision
      ? new Date(datosValidados.fechaEmision)
      : new Date()

    const fechaVencimiento = datosValidados.fechaVencimiento
      ? new Date(datosValidados.fechaVencimiento)
      : undefined

    // 6. Crear entity de factura
    const factura = FacturaEntity.create({
      id: this.generarId(),
      tallerId,
      tipo: datosValidados.tipo,
      estado: EstadoFactura.BORRADOR,
      ordenId: datosValidados.ordenId,
      clienteId: datosValidados.clienteId,
      clienteNIF,
      fechaEmision,
      fechaVencimiento,
      lineas,
      retencion,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    })

    // 7. Asignar el facturaId a las líneas
    lineas.forEach(linea => {
      // Hack: acceder a la propiedad privada para asignar el facturaId
      (linea as any).facturaId = factura.getId()
    })

    // 8. Persistir en el repositorio
    const facturaCreada = await this.facturaRepository.crear(factura, tallerId)

    // 9. Retornar DTO de respuesta
    return facturaCreada.toDTO()
  }

  /**
   * Genera un ID único (UUID v4)
   */
  private generarId(): string {
    return crypto.randomUUID()
  }
}
