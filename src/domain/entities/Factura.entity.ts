/**
 * @fileoverview Entity: Factura
 * @description Representa una factura emitida por el taller
 *
 * REGLAS DE NEGOCIO CRÍTICAS:
 * - Una factura emitida NO se puede modificar (inmutabilidad fiscal)
 * - Una factura NO se puede eliminar, solo anular
 * - La numeración es secuencial por serie y año
 * - Las retenciones (IRPF) se calculan sobre la base imponible
 * - Integración con Verifactu para firma digital
 *
 * TRANSICIONES DE ESTADO:
 * BORRADOR → EMITIDA → PAGADA
 *                    ↓
 *                  ANULADA
 */

import { Precio, NumeroFactura, Retencion, NIF } from '@/domain/value-objects'
import { BusinessRuleError, ValidationError } from '@/domain/errors'
import { EstadoFactura, TipoFactura, EstadoVerifactu } from '@/domain/types'
import { LineaFacturaEntity } from './LineaFactura.entity'

export interface FacturaProps {
  id: string
  tallerId: string
  numeroFactura?: NumeroFactura
  tipo: TipoFactura
  estado: EstadoFactura
  ordenId?: string  // Si viene de una orden de trabajo
  clienteId: string
  clienteNIF?: NIF
  fechaEmision: Date
  fechaVencimiento?: Date
  lineas: LineaFacturaEntity[]
  retencion?: Retencion
  // Verifactu
  numeroVerifactu?: string
  urlVerifactu?: string
  estadoVerifactu?: EstadoVerifactu
  // Anulación
  facturaAnuladaId?: string  // Si anula a otra factura
  motivoAnulacion?: string
  // Auditoría
  createdAt: Date
  updatedAt: Date
  createdBy: string
  emitidaBy?: string
  anuladaBy?: string
}

export class FacturaEntity {
  private readonly id: string
  private readonly tallerId: string
  private numeroFactura?: NumeroFactura
  private readonly tipo: TipoFactura
  private estado: EstadoFactura
  private readonly ordenId?: string
  private readonly clienteId: string
  private readonly clienteNIF?: NIF
  private readonly fechaEmision: Date
  private readonly fechaVencimiento?: Date
  private readonly lineas: LineaFacturaEntity[]
  private readonly retencion: Retencion
  // Verifactu
  private numeroVerifactu?: string
  private urlVerifactu?: string
  private estadoVerifactu: EstadoVerifactu
  // Anulación
  private readonly facturaAnuladaId?: string
  private motivoAnulacion?: string
  // Auditoría
  private readonly createdAt: Date
  private updatedAt: Date
  private readonly createdBy: string
  private emitidaBy?: string
  private anuladaBy?: string

  private constructor(props: FacturaProps) {
    this.id = props.id
    this.tallerId = props.tallerId
    this.numeroFactura = props.numeroFactura
    this.tipo = props.tipo
    this.estado = props.estado
    this.ordenId = props.ordenId
    this.clienteId = props.clienteId
    this.clienteNIF = props.clienteNIF
    this.fechaEmision = props.fechaEmision
    this.fechaVencimiento = props.fechaVencimiento
    this.lineas = props.lineas
    this.retencion = props.retencion || Retencion.ninguna()
    this.numeroVerifactu = props.numeroVerifactu
    this.urlVerifactu = props.urlVerifactu
    this.estadoVerifactu = props.estadoVerifactu || EstadoVerifactu.PENDIENTE
    this.facturaAnuladaId = props.facturaAnuladaId
    this.motivoAnulacion = props.motivoAnulacion
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
    this.createdBy = props.createdBy
    this.emitidaBy = props.emitidaBy
    this.anuladaBy = props.anuladaBy
  }

  public static create(props: FacturaProps): FacturaEntity {
    // Validaciones básicas
    if (!props.clienteId) {
      throw new ValidationError('El cliente es obligatorio', 'clienteId')
    }

    if (!props.tallerId) {
      throw new ValidationError('El taller es obligatorio', 'tallerId')
    }

    return new FacturaEntity(props)
  }

  // ==================== GETTERS ====================

  public getId(): string {
    return this.id
  }

  public getTallerId(): string {
    return this.tallerId
  }

  public getNumeroFactura(): NumeroFactura | undefined {
    return this.numeroFactura
  }

  public getEstado(): EstadoFactura {
    return this.estado
  }

  public getLineas(): readonly LineaFacturaEntity[] {
    return this.lineas
  }

  public isEmitida(): boolean {
    return this.estado === EstadoFactura.EMITIDA ||
           this.estado === EstadoFactura.PAGADA
  }

  public isAnulada(): boolean {
    return this.estado === EstadoFactura.ANULADA
  }

  public isBorrador(): boolean {
    return this.estado === EstadoFactura.BORRADOR
  }

  // ==================== LÓGICA DE NEGOCIO: CÁLCULOS ====================

  /**
   * Calcula la base imponible total (suma de bases de líneas)
   */
  public calcularBaseImponible(): Precio {
    return this.lineas.reduce(
      (total, linea) => total.add(linea.calcularBaseImponible()),
      Precio.zero()
    )
  }

  /**
   * Calcula el total de impuestos (IVA)
   */
  public calcularTotalImpuestos(): Precio {
    return this.lineas.reduce(
      (total, linea) => total.add(linea.calcularImpuesto()),
      Precio.zero()
    )
  }

  /**
   * Calcula el importe de retención (IRPF)
   */
  public calcularImporteRetencion(): Precio {
    if (!this.retencion.hayRetencion()) {
      return Precio.zero()
    }
    const base = this.calcularBaseImponible()
    return this.retencion.calcularImporte(base)
  }

  /**
   * Calcula el total de la factura (base + impuestos - retención)
   */
  public calcularTotal(): Precio {
    const base = this.calcularBaseImponible()
    const impuestos = this.calcularTotalImpuestos()
    const retencion = this.calcularImporteRetencion()

    return Precio.create(base.valor + impuestos.valor - retencion.valor)
  }

  /**
   * Obtiene el desglose completo de la factura
   */
  public obtenerDesglose() {
    return {
      baseImponible: this.calcularBaseImponible(),
      totalImpuestos: this.calcularTotalImpuestos(),
      importeRetencion: this.calcularImporteRetencion(),
      total: this.calcularTotal(),
      porcentajeRetencion: this.retencion.getPorcentaje()
    }
  }

  // ==================== LÓGICA DE NEGOCIO: VALIDACIONES ====================

  /**
   * Verifica si se puede emitir la factura
   */
  public puedeEmitirse(): boolean {
    return (
      this.isBorrador() &&
      this.lineas.length > 0 &&
      !this.isAnulada()
    )
  }

  /**
   * Verifica si se puede modificar la factura
   */
  public puedeModificarse(): boolean {
    return this.isBorrador() && !this.isAnulada()
  }

  /**
   * Verifica si se puede anular la factura
   */
  public puedeAnularse(): boolean {
    return this.isEmitida() && !this.isAnulada()
  }

  /**
   * Verifica si está vencida (solo para emitidas y no pagadas)
   */
  public isVencida(): boolean {
    if (this.estado !== EstadoFactura.EMITIDA) {
      return false
    }

    if (!this.fechaVencimiento) {
      return false
    }

    return new Date() > this.fechaVencimiento
  }

  // ==================== LÓGICA DE NEGOCIO: MUTACIONES ====================

  /**
   * Asigna un número de factura (se hace al emitir)
   */
  public asignarNumero(numero: NumeroFactura, userId: string): void {
    if (!this.puedeEmitirse()) {
      throw new BusinessRuleError('Solo se puede asignar número a facturas en borrador')
    }

    this.numeroFactura = numero
    this.updatedAt = new Date()
  }

  /**
   * Emite la factura (cambia estado a EMITIDA)
   */
  public emitir(userId: string): void {
    if (!this.puedeEmitirse()) {
      throw new BusinessRuleError('La factura no puede ser emitida')
    }

    if (!this.numeroFactura) {
      throw new BusinessRuleError('La factura debe tener un número asignado antes de emitirse')
    }

    this.estado = EstadoFactura.EMITIDA
    this.emitidaBy = userId
    this.updatedAt = new Date()
  }

  /**
   * Marca la factura como pagada
   */
  public marcarPagada(userId: string): void {
    if (this.estado !== EstadoFactura.EMITIDA) {
      throw new BusinessRuleError('Solo se pueden marcar como pagadas las facturas emitidas')
    }

    this.estado = EstadoFactura.PAGADA
    this.updatedAt = new Date()
  }

  /**
   * Anula la factura (debe crear factura rectificativa)
   */
  public anular(motivo: string, userId: string): void {
    if (!this.puedeAnularse()) {
      throw new BusinessRuleError('La factura no puede ser anulada')
    }

    if (!motivo || motivo.trim().length === 0) {
      throw new ValidationError('El motivo de anulación es obligatorio', 'motivo')
    }

    this.estado = EstadoFactura.ANULADA
    this.motivoAnulacion = motivo
    this.anuladaBy = userId
    this.updatedAt = new Date()
  }

  /**
   * Actualiza el estado de Verifactu
   */
  public actualizarVerifactu(
    numeroVerifactu: string,
    urlVerifactu: string,
    estadoVerifactu: EstadoVerifactu
  ): void {
    this.numeroVerifactu = numeroVerifactu
    this.urlVerifactu = urlVerifactu
    this.estadoVerifactu = estadoVerifactu
    this.updatedAt = new Date()
  }

  // ==================== SERIALIZACIÓN ====================

  public toPlainObject() {
    return {
      id: this.id,
      taller_id: this.tallerId,
      numero_factura: this.numeroFactura?.toString(),
      tipo: this.tipo,
      estado: this.estado,
      orden_id: this.ordenId,
      cliente_id: this.clienteId,
      cliente_nif: this.clienteNIF?.toString(),
      fecha_emision: this.fechaEmision.toISOString(),
      fecha_vencimiento: this.fechaVencimiento?.toISOString(),
      porcentaje_retencion: this.retencion.toNumber(),
      numero_verifactu: this.numeroVerifactu,
      url_verifactu: this.urlVerifactu,
      estado_verifactu: this.estadoVerifactu,
      factura_anulada_id: this.facturaAnuladaId,
      motivo_anulacion: this.motivoAnulacion,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      created_by: this.createdBy,
      emitida_by: this.emitidaBy,
      anulada_by: this.anuladaBy
    }
  }

  public toDTO() {
    const desglose = this.obtenerDesglose()

    return {
      id: this.id,
      tallerId: this.tallerId,
      numeroFactura: this.numeroFactura?.toString(),
      tipo: this.tipo,
      estado: this.estado,
      ordenId: this.ordenId,
      clienteId: this.clienteId,
      clienteNIF: this.clienteNIF?.toString(),
      fechaEmision: this.fechaEmision.toISOString(),
      fechaVencimiento: this.fechaVencimiento?.toISOString(),
      lineas: this.lineas.map(l => l.toDTO()),
      baseImponible: desglose.baseImponible.toNumber(),
      baseImponibleFormateada: desglose.baseImponible.format(),
      totalImpuestos: desglose.totalImpuestos.toNumber(),
      totalImpuestosFormateado: desglose.totalImpuestos.format(),
      importeRetencion: desglose.importeRetencion.toNumber(),
      importeRetencionFormateado: desglose.importeRetencion.format(),
      porcentajeRetencion: desglose.porcentajeRetencion,
      total: desglose.total.toNumber(),
      totalFormateado: desglose.total.format(),
      numeroVerifactu: this.numeroVerifactu,
      urlVerifactu: this.urlVerifactu,
      estadoVerifactu: this.estadoVerifactu,
      motivoAnulacion: this.motivoAnulacion,
      puedeEmitirse: this.puedeEmitirse(),
      puedeModificarse: this.puedeModificarse(),
      puedeAnularse: this.puedeAnularse(),
      isVencida: this.isVencida(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    }
  }
}
