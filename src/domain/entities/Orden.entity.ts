/**
 * @fileoverview Entity: Orden de Reparación
 * @description Representa una orden de reparación en el taller
 *
 * REGLAS DE NEGOCIO:
 * - Una orden siempre tiene un cliente
 * - El vehículo es opcional inicialmente (puede asignarse después)
 * - Una orden puede tener 0 o más líneas
 * - El total se calcula automáticamente desde las líneas
 * - Una orden facturada no se puede modificar
 * - Una orden solo se puede facturar si está finalizada
 *
 * NOTA: Esta es una entidad de dominio PURA, sin dependencias de BD o UI
 */

import { Precio, Kilometraje } from '@/domain/value-objects'
import { BusinessRuleError, ValidationError } from '@/domain/errors'
import { EstadoOrden, AccionImprevisto } from '@/domain/types'
import { LineaOrdenEntity } from './LineaOrden.entity'

export interface OrdenProps {
  id: string
  tallerId: string
  numeroOrden?: string
  clienteId: string
  vehiculoId?: string
  operarioId?: string
  facturaId?: string
  descripcionProblema?: string
  diagnostico?: string
  trabajosRealizados?: string
  notas?: string
  presupuestoAprobadoPorCliente: boolean
  tiempoEstimadoHoras?: number
  tiempoRealHoras?: number
  kilometrosEntrada?: Kilometraje
  nivelCombustible?: string
  renunciaPresupuesto: boolean
  accionImprevisto: AccionImprevisto
  recogerPiezas: boolean
  danosCarroceria?: string
  costeDiarioEstancia?: Precio
  fotosEntrada?: string[]
  fotosSalida?: string[]
  fotosDiagnostico?: string[]
  estado: EstadoOrden
  lineas: LineaOrdenEntity[]
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  deletedBy?: string
}

export class OrdenEntity {
  private readonly id: string
  private readonly tallerId: string
  private numeroOrden?: string
  private readonly clienteId: string
  private readonly vehiculoId?: string
  private operarioId?: string
  private facturaId?: string
  private descripcionProblema?: string
  private diagnostico?: string
  private trabajosRealizados?: string
  private notas?: string
  private presupuestoAprobadoPorCliente: boolean
  private tiempoEstimadoHoras?: number
  private tiempoRealHoras?: number
  private kilometrosEntrada?: Kilometraje
  private nivelCombustible?: string
  private renunciaPresupuesto: boolean
  private accionImprevisto: AccionImprevisto
  private recogerPiezas: boolean
  private danosCarroceria?: string
  private costeDiarioEstancia?: Precio
  private fotosEntrada: string[]
  private fotosSalida: string[]
  private fotosDiagnostico: string[]
  private estado: EstadoOrden
  private lineas: LineaOrdenEntity[]
  private readonly createdAt: Date
  private updatedAt: Date
  private deletedAt?: Date
  private deletedBy?: string

  private constructor(props: OrdenProps) {
    this.id = props.id
    this.tallerId = props.tallerId
    this.numeroOrden = props.numeroOrden
    this.clienteId = props.clienteId
    this.vehiculoId = props.vehiculoId
    this.operarioId = props.operarioId
    this.facturaId = props.facturaId
    this.descripcionProblema = props.descripcionProblema
    this.diagnostico = props.diagnostico
    this.trabajosRealizados = props.trabajosRealizados
    this.notas = props.notas
    this.presupuestoAprobadoPorCliente = props.presupuestoAprobadoPorCliente
    this.tiempoEstimadoHoras = props.tiempoEstimadoHoras
    this.tiempoRealHoras = props.tiempoRealHoras
    this.kilometrosEntrada = props.kilometrosEntrada
    this.nivelCombustible = props.nivelCombustible
    this.renunciaPresupuesto = props.renunciaPresupuesto
    this.accionImprevisto = props.accionImprevisto
    this.recogerPiezas = props.recogerPiezas
    this.danosCarroceria = props.danosCarroceria
    this.costeDiarioEstancia = props.costeDiarioEstancia
    this.fotosEntrada = props.fotosEntrada || []
    this.fotosSalida = props.fotosSalida || []
    this.fotosDiagnostico = props.fotosDiagnostico || []
    this.estado = props.estado
    this.lineas = props.lineas
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
    this.deletedAt = props.deletedAt
    this.deletedBy = props.deletedBy
  }

  /**
   * Crea una nueva orden validando las reglas de negocio
   */
  public static create(props: OrdenProps): OrdenEntity {
    // Validar cliente
    if (!props.clienteId || props.clienteId.trim().length === 0) {
      throw new ValidationError('El cliente es obligatorio', 'clienteId')
    }

    // Validar taller
    if (!props.tallerId || props.tallerId.trim().length === 0) {
      throw new ValidationError('El taller es obligatorio', 'tallerId')
    }

    // Validar vehículo SI se proporciona (no es obligatorio pero si viene debe ser válido)
    if (props.vehiculoId && props.vehiculoId.trim().length === 0) {
      throw new ValidationError('Si se proporciona un vehículo, no puede estar vacío', 'vehiculoId')
    }

    return new OrdenEntity(props)
  }

  // ==================== GETTERS ====================

  public getId(): string {
    return this.id
  }

  public getTallerId(): string {
    return this.tallerId
  }

  public getNumeroOrden(): string | undefined {
    return this.numeroOrden
  }

  public getClienteId(): string {
    return this.clienteId
  }

  public getVehiculoId(): string | undefined {
    return this.vehiculoId
  }

  public getEstado(): EstadoOrden {
    return this.estado
  }

  public getLineas(): readonly LineaOrdenEntity[] {
    return this.lineas
  }

  public getFacturaId(): string | undefined {
    return this.facturaId
  }

  public isFacturada(): boolean {
    return this.estado === EstadoOrden.FACTURADO && !!this.facturaId
  }

  public isEliminada(): boolean {
    return !!this.deletedAt
  }

  // ==================== LÓGICA DE NEGOCIO: CÁLCULOS ====================

  /**
   * Calcula el subtotal de mano de obra
   */
  public calcularSubtotalManoObra(): Precio {
    return this.lineas
      .filter(linea => linea.isManoObra())
      .reduce(
        (total, linea) => total.add(linea.calcularSubtotal()),
        Precio.zero()
      )
  }

  /**
   * Calcula el subtotal de piezas
   */
  public calcularSubtotalPiezas(): Precio {
    return this.lineas
      .filter(linea => linea.isPieza())
      .reduce(
        (total, linea) => total.add(linea.calcularSubtotal()),
        Precio.zero()
      )
  }

  /**
   * Calcula el subtotal general (sin IVA)
   */
  public calcularSubtotalGeneral(): Precio {
    return this.lineas.reduce(
      (total, linea) => total.add(linea.calcularSubtotal()),
      Precio.zero()
    )
  }

  /**
   * Calcula el IVA
   * NOTA: El porcentaje de IVA debería venir de la configuración del taller
   */
  public calcularIVA(porcentajeIVA: number = 21): Precio {
    const subtotal = this.calcularSubtotalGeneral()
    return subtotal.calcularIVA(porcentajeIVA)
  }

  /**
   * Calcula el total con IVA
   */
  public calcularTotal(porcentajeIVA: number = 21): Precio {
    const subtotal = this.calcularSubtotalGeneral()
    const iva = this.calcularIVA(porcentajeIVA)
    return subtotal.add(iva)
  }

  /**
   * Obtiene el desglose completo de costes
   */
  public obtenerDesglose(porcentajeIVA: number = 21) {
    return {
      subtotalManoObra: this.calcularSubtotalManoObra(),
      subtotalPiezas: this.calcularSubtotalPiezas(),
      subtotalGeneral: this.calcularSubtotalGeneral(),
      iva: this.calcularIVA(porcentajeIVA),
      total: this.calcularTotal(porcentajeIVA),
      porcentajeIVA
    }
  }

  // ==================== LÓGICA DE NEGOCIO: VALIDACIONES ====================

  /**
   * Verifica si la orden puede ser facturada
   */
  public puedeFacturarse(): boolean {
    return (
      this.estado === EstadoOrden.FINALIZADO &&
      this.lineas.length > 0 &&
      !this.isFacturada()
    )
  }

  /**
   * Verifica si la orden puede ser modificada
   */
  public puedeModificarse(): boolean {
    return !this.isFacturada() && !this.isEliminada()
  }

  /**
   * Verifica si la orden puede ser eliminada
   */
  public puedeEliminarse(): boolean {
    return !this.isFacturada() && !this.isEliminada()
  }

  // ==================== LÓGICA DE NEGOCIO: MUTACIONES ====================

  /**
   * Cambia el estado de la orden
   */
  public cambiarEstado(nuevoEstado: EstadoOrden): void {
    if (!this.puedeModificarse()) {
      throw new BusinessRuleError('No se puede modificar una orden facturada o eliminada')
    }

    // Validar transiciones de estado
    if (nuevoEstado === EstadoOrden.FACTURADO && !this.puedeFacturarse()) {
      throw new BusinessRuleError(
        'Solo se pueden facturar órdenes finalizadas con al menos una línea'
      )
    }

    this.estado = nuevoEstado
    this.updatedAt = new Date()
  }

  /**
   * Agrega una línea a la orden
   */
  public agregarLinea(linea: LineaOrdenEntity): void {
    if (!this.puedeModificarse()) {
      throw new BusinessRuleError('No se pueden agregar líneas a una orden facturada o eliminada')
    }

    this.lineas.push(linea)
    this.updatedAt = new Date()
  }

  /**
   * Elimina una línea de la orden
   */
  public eliminarLinea(lineaId: string): void {
    if (!this.puedeModificarse()) {
      throw new BusinessRuleError('No se pueden eliminar líneas de una orden facturada o eliminada')
    }

    const index = this.lineas.findIndex(l => l.getId() === lineaId)
    if (index === -1) {
      throw new ValidationError('Línea no encontrada', 'lineaId')
    }

    this.lineas.splice(index, 1)
    this.updatedAt = new Date()
  }

  /**
   * Asigna un operario a la orden
   */
  public asignarOperario(operarioId: string): void {
    if (!this.puedeModificarse()) {
      throw new BusinessRuleError('No se puede asignar operario a una orden facturada o eliminada')
    }

    this.operarioId = operarioId
    this.updatedAt = new Date()
  }

  /**
   * Marca la orden como facturada
   */
  public marcarFacturada(facturaId: string): void {
    if (!this.puedeFacturarse()) {
      throw new BusinessRuleError('La orden no puede ser facturada')
    }

    this.facturaId = facturaId
    this.estado = EstadoOrden.FACTURADO
    this.updatedAt = new Date()
  }

  /**
   * Marca la orden como eliminada (soft delete)
   */
  public eliminar(userId: string): void {
    if (!this.puedeEliminarse()) {
      throw new BusinessRuleError('No se puede eliminar una orden facturada')
    }

    this.deletedAt = new Date()
    this.deletedBy = userId
    this.updatedAt = new Date()
  }

  // ==================== SERIALIZACIÓN ====================

  /**
   * Convierte la entidad a objeto plano (para persistencia)
   */
  public toPlainObject() {
    return {
      id: this.id,
      taller_id: this.tallerId,
      numero_orden: this.numeroOrden,
      cliente_id: this.clienteId,
      vehiculo_id: this.vehiculoId,
      operario_id: this.operarioId,
      factura_id: this.facturaId,
      descripcion_problema: this.descripcionProblema,
      diagnostico: this.diagnostico,
      trabajos_realizados: this.trabajosRealizados,
      notas: this.notas,
      presupuesto_aprobado_por_cliente: this.presupuestoAprobadoPorCliente,
      tiempo_estimado_horas: this.tiempoEstimadoHoras,
      tiempo_real_horas: this.tiempoRealHoras,
      kilometros_entrada: this.kilometrosEntrada?.toNumber(),
      nivel_combustible: this.nivelCombustible,
      renuncia_presupuesto: this.renunciaPresupuesto,
      accion_imprevisto: this.accionImprevisto,
      recoger_piezas: this.recogerPiezas,
      danos_carroceria: this.danosCarroceria,
      coste_diario_estancia: this.costeDiarioEstancia?.toNumber(),
      fotos_entrada: JSON.stringify(this.fotosEntrada),
      fotos_salida: JSON.stringify(this.fotosSalida),
      fotos_diagnostico: JSON.stringify(this.fotosDiagnostico),
      estado: this.estado,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      deleted_at: this.deletedAt?.toISOString(),
      deleted_by: this.deletedBy
    }
  }

  /**
   * Convierte a DTO para la UI
   */
  public toDTO(porcentajeIVA: number = 21) {
    const desglose = this.obtenerDesglose(porcentajeIVA)

    return {
      id: this.id,
      tallerId: this.tallerId,
      numeroOrden: this.numeroOrden,
      clienteId: this.clienteId,
      vehiculoId: this.vehiculoId,
      operarioId: this.operarioId,
      facturaId: this.facturaId,
      descripcionProblema: this.descripcionProblema,
      diagnostico: this.diagnostico,
      trabajosRealizados: this.trabajosRealizados,
      notas: this.notas,
      presupuestoAprobado: this.presupuestoAprobadoPorCliente,
      tiempoEstimado: this.tiempoEstimadoHoras,
      tiempoReal: this.tiempoRealHoras,
      kilometrosEntrada: this.kilometrosEntrada?.toNumber(),
      estado: this.estado,
      lineas: this.lineas.map(l => l.toDTO()),
      subtotalManoObra: desglose.subtotalManoObra.toNumber(),
      subtotalManoObraFormateado: desglose.subtotalManoObra.format(),
      subtotalPiezas: desglose.subtotalPiezas.toNumber(),
      subtotalPiezasFormateado: desglose.subtotalPiezas.format(),
      subtotal: desglose.subtotalGeneral.toNumber(),
      subtotalFormateado: desglose.subtotalGeneral.format(),
      iva: desglose.iva.toNumber(),
      ivaFormateado: desglose.iva.format(),
      total: desglose.total.toNumber(),
      totalFormateado: desglose.total.format(),
      puedeFacturarse: this.puedeFacturarse(),
      puedeModificarse: this.puedeModificarse(),
      isFacturada: this.isFacturada(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    }
  }
}
