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
import { TipoLinea } from '@/domain/types'

export interface LineaFacturaProps {
  id: string
  facturaId: string
  tipo: TipoLinea
  descripcion: string
  cantidad: number
  precioUnitario: Precio
  descuento?: number // Porcentaje de descuento (0-100)
  impuesto: number // Porcentaje de impuesto (normalmente IVA 21%)
}

export class LineaFacturaEntity {
  private readonly id: string
  private readonly facturaId: string
  private tipo: TipoLinea
  private descripcion: string
  private cantidad: number
  private precioUnitario: Precio
  private descuento: number
  private impuesto: number

  private constructor(props: LineaFacturaProps) {
    this.id = props.id
    this.facturaId = props.facturaId
    this.tipo = props.tipo
    this.descripcion = props.descripcion
    this.cantidad = props.cantidad
    this.precioUnitario = props.precioUnitario
    this.descuento = props.descuento || 0
    this.impuesto = props.impuesto
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

    // Validar descuento
    if (props.descuento !== undefined && (props.descuento < 0 || props.descuento > 100)) {
      throw new ValidationError('El descuento debe estar entre 0 y 100', 'descuento')
    }

    // Validar impuesto
    if (props.impuesto < 0 || props.impuesto > 100) {
      throw new ValidationError('El impuesto debe estar entre 0 y 100', 'impuesto')
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

  public getTipo(): TipoLinea {
    return this.tipo
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

  public getDescuento(): number {
    return this.descuento
  }

  public getImpuesto(): number {
    return this.impuesto
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
    if (this.descuento === 0) {
      return Precio.zero()
    }
    const subtotal = this.calcularSubtotal()
    return Precio.create((subtotal.valor * this.descuento) / 100)
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
    return base.calcularIVA(this.impuesto)
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
    return this.descuento > 0
  }

  // ==================== SERIALIZACIÓN ====================

  public toPlainObject() {
    return {
      id: this.id,
      factura_id: this.facturaId,
      tipo: this.tipo,
      descripcion: this.descripcion,
      cantidad: this.cantidad,
      precio_unitario: this.precioUnitario.toNumber(),
      descuento: this.descuento,
      impuesto: this.impuesto,
      subtotal: this.calcularSubtotal().toNumber(),
      descuento_importe: this.calcularDescuento().toNumber(),
      base_imponible: this.calcularBaseImponible().toNumber(),
      impuesto_importe: this.calcularImpuesto().toNumber(),
      total: this.calcularTotal().toNumber()
    }
  }

  public toDTO() {
    return {
      id: this.id,
      facturaId: this.facturaId,
      tipo: this.tipo,
      descripcion: this.descripcion,
      cantidad: this.cantidad,
      precioUnitario: this.precioUnitario.toNumber(),
      precioUnitarioFormateado: this.precioUnitario.format(),
      descuento: this.descuento,
      impuesto: this.impuesto,
      subtotal: this.calcularSubtotal().toNumber(),
      subtotalFormateado: this.calcularSubtotal().format(),
      descuentoImporte: this.calcularDescuento().toNumber(),
      descuentoImporteFormateado: this.calcularDescuento().format(),
      baseImponible: this.calcularBaseImponible().toNumber(),
      baseImponibleFormateada: this.calcularBaseImponible().format(),
      impuestoImporte: this.calcularImpuesto().toNumber(),
      impuestoImporteFormateado: this.calcularImpuesto().format(),
      total: this.calcularTotal().toNumber(),
      totalFormateado: this.calcularTotal().format()
    }
  }
}
