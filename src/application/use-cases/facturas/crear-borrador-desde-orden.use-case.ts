/**
 * @fileoverview Use Case: Crear Borrador de Factura desde Orden
 * @description Crea un borrador de factura a partir de una orden de reparación
 *
 * RESPONSABILIDAD ÚNICA: Bridge entre módulo de Órdenes y Facturas
 * - Obtiene la orden finalizada
 * - Valida que pueda facturarse
 * - Crea una factura con las líneas de la orden
 * - Vincula orden con factura
 *
 * VENTAJA: Automatiza la facturación de órdenes completadas
 */

import { IFacturaRepository, IOrdenRepository } from '@/application/ports'
import { CrearBorradorDesdeOrdenDTO, CrearBorradorDesdeOrdenSchema, FacturaResponseDTO } from '@/application/dtos'
import { FacturaEntity, LineaFacturaEntity } from '@/domain/entities'
import { Precio, Retencion, NIF } from '@/domain/value-objects'
import { EstadoFactura, TipoFactura, TipoLineaFactura, TipoLinea } from '@/domain/types'
import { ValidationError, NotFoundError, BusinessRuleError } from '@/domain/errors'

export class CrearBorradorDesdeOrdenUseCase {
  constructor(
    private readonly facturaRepository: IFacturaRepository,
    private readonly ordenRepository: IOrdenRepository
  ) {}

  async execute(
    dto: CrearBorradorDesdeOrdenDTO,
    tallerId: string,
    userId: string
  ): Promise<FacturaResponseDTO> {
    // 1. Validar DTO de entrada
    const validacion = CrearBorradorDesdeOrdenSchema.safeParse(dto)
    if (!validacion.success) {
      const errores = validacion.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new ValidationError(`Datos inválidos: ${errores.join(', ')}`)
    }

    const datosValidados = validacion.data

    // 2. Obtener la orden
    const orden = await this.ordenRepository.obtenerPorId(datosValidados.ordenId, tallerId)

    if (!orden) {
      throw new NotFoundError('orden', datosValidados.ordenId)
    }

    // 3. Verificar que la orden puede facturarse
    if (!orden.puedeFacturarse()) {
      throw new BusinessRuleError(
        'La orden no puede facturarse. Debe estar finalizada y tener líneas.'
      )
    }

    // 4. Verificar que no esté ya facturada
    if (orden.isFacturada()) {
      throw new BusinessRuleError('La orden ya tiene una factura asociada')
    }

    // 5. Convertir líneas de orden a líneas de factura
    const lineas: LineaFacturaEntity[] = []
    const lineasOrden = orden.getLineas()

    for (const lineaOrden of lineasOrden) {
      // Mapear tipo de línea
      const tipoLinea = this.mapearTipoLinea(lineaOrden.getTipo())

      const lineaFactura = LineaFacturaEntity.create({
        id: this.generarId(),
        facturaId: '', // Se asignará después
        tipo: tipoLinea,
        descripcion: lineaOrden.getDescripcion(),
        cantidad: lineaOrden.getCantidad(),
        precioUnitario: lineaOrden.getPrecioUnitario(),
        descuentoPorcentaje: 0,
        ivaPorcentaje: 21 // IVA estándar por defecto
      })

      lineas.push(lineaFactura)
    }

    // 6. Procesar NIF del cliente si se proporciona
    let clienteNIF: NIF | undefined
    if (datosValidados.clienteNIF) {
      try {
        clienteNIF = NIF.create(datosValidados.clienteNIF)
      } catch (error) {
        throw new ValidationError('NIF del cliente inválido', 'clienteNIF')
      }
    }

    // 7. Crear retención
    const retencion = datosValidados.porcentajeRetencion
      ? Retencion.create(datosValidados.porcentajeRetencion)
      : Retencion.ninguna()

    // 8. Calcular fecha de vencimiento
    const fechaEmision = new Date()
    const fechaVencimiento = datosValidados.fechaVencimiento
      ? new Date(datosValidados.fechaVencimiento)
      : this.calcularFechaVencimiento(fechaEmision, 30) // 30 días por defecto

    // 9. Crear entity de factura
    const factura = FacturaEntity.create({
      id: this.generarId(),
      tallerId,
      tipo: TipoFactura.NORMAL,
      estado: EstadoFactura.BORRADOR,
      ordenId: orden.getId(),
      clienteId: orden.getClienteId(),
      clienteNIF,
      fechaEmision,
      fechaVencimiento,
      lineas,
      retencion,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    })

    // 10. Asignar el facturaId a las líneas
    lineas.forEach(linea => {
      (linea as any).facturaId = factura.getId()
    })

    // 11. Persistir en el repositorio
    const facturaCreada = await this.facturaRepository.crear(factura, tallerId)

    // 12. Retornar DTO de respuesta
    return facturaCreada.toDTO()
  }

  /**
   * Mapea tipos de línea de orden a tipos de línea de factura
   */
  private mapearTipoLinea(tipoOrden: TipoLinea): TipoLineaFactura {
    const map: Record<string, TipoLineaFactura> = {
      [TipoLinea.MANO_OBRA]: TipoLineaFactura.MANO_OBRA,
      [TipoLinea.PIEZA]: TipoLineaFactura.PIEZA,
      [TipoLinea.SUPLIDO]: TipoLineaFactura.SUPLIDO,
      [TipoLinea.REEMBOLSO]: TipoLineaFactura.SUPLIDO,
      [TipoLinea.SERVICIO]: TipoLineaFactura.OTRO
    }

    return map[tipoOrden] || TipoLineaFactura.OTRO
  }

  /**
   * Calcula la fecha de vencimiento sumando días a la fecha de emisión
   */
  private calcularFechaVencimiento(fechaEmision: Date, dias: number): Date {
    const fecha = new Date(fechaEmision)
    fecha.setDate(fecha.getDate() + dias)
    return fecha
  }

  /**
   * Genera un ID único (UUID v4)
   */
  private generarId(): string {
    return crypto.randomUUID()
  }
}
