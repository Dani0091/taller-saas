/**
 * @fileoverview Entity: Línea de Factura
 * @description Representa una línea individual de una factura
 *
 * REGLAS DE NEGOCIO:
 * - Similar a LineaOrden pero con impuestos específicos
 * - Cantidad y precio siempre positivos
 * - Puede tener descuentos aplicados
 *
 * NOTA: Esta es una entidad de dominio PURA, sin dependencias de BD o UI
 */

import { Precio } from '@/domain/value-objects'
import { ValidationError } from '@/domain/errors'
import { TipoLineaFactura } from '@/domain/types'

export interface LineaFacturaProps {
  id: string
  facturaId: string
  tipo: TipoLineaFactura
  descripcion: string
  referencia?: string
  cantidad: number
  precioUnitario: Precio
  descuentoPorcentaje?: number // Porcentaje de descuento (0-100)
  descuentoImporte?: Precio // Descuento fijo en euros
  ivaPorcentaje: number // Porcentaje de IVA (normalmente 21%)
}

export class LineaFacturaEntity {
  private readonly id: string
  private readonly facturaId: string
  private tipo: TipoLineaFactura
  private referencia?: string
  private descripcion: string
  private cantidad: number
  private precioUnitario: Precio
  private descuentoPorcentaje: number
  private descuentoImporte?: Precio
  private ivaPorcentaje: number

  private constructor(props: LineaFacturaProps) {
    this.id = props.id
    this.facturaId = props.facturaId
    this.tipo = props.tipo
    this.referencia = props.referencia
    this.descripcion = props.descripcion
    this.cantidad = props.cantidad
    this.precioUnitario = props.precioUnitario
    this.descuentoPorcentaje = props.descuentoPorcentaje || 0
    this.descuentoImporte = props.descuentoImporte
    this.ivaPorcentaje = props.ivaPorcentaje
  }

  public static create(props: LineaFacturaProps): LineaFacturaEntity {
    // Validar descripción
    if (!props.descripcion || props.descripcion.trim().length === 0) {
      throw new ValidationError('La descripción es obligatoria', 'descripcion')
    }

    // Validar cantidad
    if (props.cantidad <= 0) {
      throw new ValidationError('La cantidad debe ser mayor a 0', 'cantidad')
    }

    // Validar descuento porcentaje
    if (props.descuentoPorcentaje !== undefined && (props.descuentoPorcentaje < 0 || props.descuentoPorcentaje > 100)) {
      throw new ValidationError('El descuento debe estar entre 0 y 100', 'descuentoPorcentaje')
    }

    // Validar IVA
    if (props.ivaPorcentaje < 0 || props.ivaPorcentaje > 100) {
      throw new ValidationError('El IVA debe estar entre 0 y 100', 'ivaPorcentaje')
    }

    return new LineaFacturaEntity(props)
  }

  // ==================== GETTERS ====================

  public getId(): string {
    return this.id
  }

  public getFacturaId(): string {
    return this.facturaId
  }

  public getTipo(): TipoLineaFactura {
    return this.tipo
  }

  public getReferencia(): string | undefined {
    return this.referencia
  }

  public getDescripcion(): string {
    return this.descripcion
  }

  public getCantidad(): number {
    return this.cantidad
  }

  public getPrecioUnitario(): Precio {
    return this.precioUnitario
  }

  public getDescuentoPorcentaje(): number {
    return this.descuentoPorcentaje
  }

  public getDescuentoImporte(): Precio | undefined {
    return this.descuentoImporte
  }

  public getIvaPorcentaje(): number {
    return this.ivaPorcentaje
  }

  // ==================== LÓGICA DE NEGOCIO ====================

  /**
   * Calcula el subtotal sin descuento (cantidad × precio)
   */
  public calcularSubtotal(): Precio {
    return this.precioUnitario.multiply(this.cantidad)
  }

  /**
   * Calcula el importe del descuento
   */
  public calcularDescuento(): Precio {
    // Si hay descuento fijo, usar ese
    if (this.descuentoImporte) {
      return this.descuentoImporte
    }

    // Si hay descuento porcentual, calcularlo
    if (this.descuentoPorcentaje === 0) {
      return Precio.zero()
    }
    const subtotal = this.calcularSubtotal()
    return Precio.create((subtotal.valor * this.descuentoPorcentaje) / 100)
  }

  /**
   * Calcula la base imponible (subtotal - descuento)
   */
  public calcularBaseImponible(): Precio {
    const subtotal = this.calcularSubtotal()
    const descuentoImporte = this.calcularDescuento()
    return Precio.create(subtotal.valor - descuentoImporte.valor)
  }

  /**
   * Calcula el importe del impuesto
   */
  public calcularImpuesto(): Precio {
    const base = this.calcularBaseImponible()
    return base.calcularIVA(this.ivaPorcentaje)
  }

  /**
   * Calcula el total de la línea (base + impuesto)
   */
  public calcularTotal(): Precio {
    const base = this.calcularBaseImponible()
    const impuestoImporte = this.calcularImpuesto()
    return base.add(impuestoImporte)
  }

  /**
   * Verifica si tiene descuento aplicado
   */
  public tieneDescuento(): boolean {
    return this.descuentoPorcentaje > 0 || (this.descuentoImporte !== undefined && this.descuentoImporte.valor > 0)
  }

  // ==================== SERIALIZACIÓN ====================

  public toPlainObject() {
    return {
      id: this.id,
      factura_id: this.facturaId,
      tipo: this.tipo,
      referencia: this.referencia,
      descripcion: this.descripcion,
      cantidad: this.cantidad,
      precio_unitario: this.precioUnitario.toNumber(),
      descuento_porcentaje: this.descuentoPorcentaje,
      descuento_importe: this.descuentoImporte?.toNumber() || 0,
      iva_porcentaje: this.ivaPorcentaje,
      subtotal: this.calcularSubtotal().toNumber(),
      descuento_calculado: this.calcularDescuento().toNumber(),
      base_imponible: this.calcularBaseImponible().toNumber(),
      impuesto_importe: this.calcularImpuesto().toNumber(),
      importe_total: this.calcularTotal().toNumber()
    }
  }

  public toDTO() {
    return {
      id: this.id,
      facturaId: this.facturaId,
      tipo: this.tipo,
      referencia: this.referencia,
      descripcion: this.descripcion,
      cantidad: this.cantidad,
      precioUnitario: this.precioUnitario.toNumber(),
      precioUnitarioFormateado: this.precioUnitario.format(),
      descuentoPorcentaje: this.descuentoPorcentaje,
      descuentoImporte: this.descuentoImporte?.toNumber(),
      descuentoImporteFormateado: this.descuentoImporte?.format(),
      ivaPorcentaje: this.ivaPorcentaje,
      subtotal: this.calcularSubtotal().toNumber(),
      subtotalFormateado: this.calcularSubtotal().format(),
      descuentoCalculado: this.calcularDescuento().toNumber(),
      descuentoCalculadoFormateado: this.calcularDescuento().format(),
      baseImponible: this.calcularBaseImponible().toNumber(),
      baseImponibleFormateada: this.calcularBaseImponible().format(),
      impuestoImporte: this.calcularImpuesto().toNumber(),
      impuestoImporteFormateado: this.calcularImpuesto().format(),
      total: this.calcularTotal().toNumber(),
      totalFormateado: this.calcularTotal().format()
    }
  }
}
