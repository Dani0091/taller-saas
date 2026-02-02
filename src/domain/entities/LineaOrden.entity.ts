/**
 * @fileoverview Entity: Línea de Orden
 * @description Representa una línea individual de una orden de reparación
 *
 * REGLAS DE NEGOCIO:
 * - Una línea siempre pertenece a una orden
 * - La cantidad debe ser mayor a 0
 * - El precio puede ser 0 (ej. servicio gratuito)
 * - El subtotal se calcula automáticamente
 *
 * NOTA: Esta es una entidad de dominio PURA, sin dependencias de BD o UI
 */

import { Precio } from '@/domain/value-objects'
import { ValidationError } from '@/domain/errors'
import { TipoLinea, EstadoLineaOrden } from '@/domain/types'

export interface LineaOrdenProps {
  id: string
  ordenId: string
  tipo: TipoLinea
  descripcion: string
  cantidad: number
  precioUnitario: Precio
  estado: EstadoLineaOrden
}

export class LineaOrdenEntity {
  private readonly id: string
  private readonly ordenId: string
  private tipo: TipoLinea
  private descripcion: string
  private cantidad: number
  private precioUnitario: Precio
  private estado: EstadoLineaOrden

  private constructor(props: LineaOrdenProps) {
    this.id = props.id
    this.ordenId = props.ordenId
    this.tipo = props.tipo
    this.descripcion = props.descripcion
    this.cantidad = props.cantidad
    this.precioUnitario = props.precioUnitario
    this.estado = props.estado
  }

  /**
   * Crea una nueva línea de orden validando las reglas de negocio
   */
  public static create(props: LineaOrdenProps): LineaOrdenEntity {
    // Validar descripción
    if (!props.descripcion || props.descripcion.trim().length === 0) {
      throw new ValidationError('La descripción es obligatoria', 'descripcion')
    }

    if (props.descripcion.trim().length > 500) {
      throw new ValidationError(
        'La descripción no puede exceder 500 caracteres',
        'descripcion'
      )
    }

    // Validar cantidad
    if (props.cantidad <= 0) {
      throw new ValidationError('La cantidad debe ser mayor a 0', 'cantidad')
    }

    if (props.cantidad > 10000) {
      throw new ValidationError(
        'La cantidad excede el límite razonable (10,000)',
        'cantidad'
      )
    }

    return new LineaOrdenEntity(props)
  }

  // ==================== GETTERS ====================

  public getId(): string {
    return this.id
  }

  public getOrdenId(): string {
    return this.ordenId
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

  public getEstado(): EstadoLineaOrden {
    return this.estado
  }

  // ==================== LÓGICA DE NEGOCIO ====================

  /**
   * Calcula el subtotal de la línea (cantidad × precio)
   */
  public calcularSubtotal(): Precio {
    return this.precioUnitario.multiply(this.cantidad)
  }

  /**
   * Verifica si es mano de obra
   */
  public isManoObra(): boolean {
    return this.tipo === TipoLinea.MANO_OBRA
  }

  /**
   * Verifica si es pieza
   */
  public isPieza(): boolean {
    return this.tipo === TipoLinea.PIEZA
  }

  /**
   * Verifica si está presupuestado
   */
  public isPresupuestado(): boolean {
    return this.estado === EstadoLineaOrden.PRESUPUESTADO
  }

  /**
   * Verifica si está confirmado
   */
  public isConfirmado(): boolean {
    return this.estado === EstadoLineaOrden.CONFIRMADO
  }

  // ==================== MUTADORES (REGLAS DE NEGOCIO) ====================

  /**
   * Actualiza la cantidad
   */
  public actualizarCantidad(nuevaCantidad: number): void {
    if (nuevaCantidad <= 0) {
      throw new ValidationError('La cantidad debe ser mayor a 0', 'cantidad')
    }

    if (nuevaCantidad > 10000) {
      throw new ValidationError(
        'La cantidad excede el límite razonable (10,000)',
        'cantidad'
      )
    }

    this.cantidad = nuevaCantidad
  }

  /**
   * Actualiza el precio unitario
   */
  public actualizarPrecio(nuevoPrecio: Precio): void {
    this.precioUnitario = nuevoPrecio
  }

  /**
   * Actualiza la descripción
   */
  public actualizarDescripcion(nuevaDescripcion: string): void {
    if (!nuevaDescripcion || nuevaDescripcion.trim().length === 0) {
      throw new ValidationError('La descripción es obligatoria', 'descripcion')
    }

    if (nuevaDescripcion.trim().length > 500) {
      throw new ValidationError(
        'La descripción no puede exceder 500 caracteres',
        'descripcion'
      )
    }

    this.descripcion = nuevaDescripcion.trim()
  }

  /**
   * Cambia el estado de la línea
   */
  public cambiarEstado(nuevoEstado: EstadoLineaOrden): void {
    this.estado = nuevoEstado
  }

  /**
   * Confirma la línea (marca como confirmada)
   */
  public confirmar(): void {
    this.estado = EstadoLineaOrden.CONFIRMADO
  }

  /**
   * Marca la línea como recibida (para piezas)
   */
  public marcarRecibida(): void {
    if (!this.isPieza()) {
      throw new ValidationError(
        'Solo las piezas pueden marcarse como recibidas',
        'estado'
      )
    }
    this.estado = EstadoLineaOrden.RECIBIDO
  }

  // ==================== SERIALIZACIÓN ====================

  /**
   * Convierte la entidad a objeto plano (para persistencia)
   */
  public toPlainObject() {
    return {
      id: this.id,
      orden_id: this.ordenId,
      tipo: this.tipo,
      descripcion: this.descripcion,
      cantidad: this.cantidad,
      precio_unitario: this.precioUnitario.toNumber(),
      estado: this.estado,
      subtotal: this.calcularSubtotal().toNumber()
    }
  }

  /**
   * Convierte a DTO para la UI
   */
  public toDTO() {
    return {
      id: this.id,
      ordenId: this.ordenId,
      tipo: this.tipo,
      descripcion: this.descripcion,
      cantidad: this.cantidad,
      precioUnitario: this.precioUnitario.toNumber(),
      precioUnitarioFormateado: this.precioUnitario.format(),
      estado: this.estado,
      subtotal: this.calcularSubtotal().toNumber(),
      subtotalFormateado: this.calcularSubtotal().format(),
      isManoObra: this.isManoObra(),
      isPieza: this.isPieza()
    }
  }
}
