/**
 * @fileoverview Entity: Cita
 * @description Representa una cita/evento en el calendario del taller
 *
 * REGLAS DE NEGOCIO:
 * - El título es obligatorio
 * - La fecha de inicio es obligatoria
 * - La fecha de fin debe ser posterior a la fecha de inicio
 * - Si no es "todo el día", debe tener fecha fin
 * - El color debe ser un código hexadecimal válido
 * - Una cita puede estar asociada a un cliente, vehículo y/u orden
 *
 * NOTA: Esta es una entidad de dominio PURA, sin dependencias de BD o UI
 */

import { ValidationError } from '@/domain/errors'
import { TipoCita, EstadoCita } from '@/domain/types'

export interface CitaProps {
  id: string
  tallerId: string
  titulo: string
  descripcion?: string
  tipo: TipoCita
  fechaInicio: Date
  fechaFin?: Date
  todoElDia: boolean
  clienteId?: string
  vehiculoId?: string
  ordenId?: string
  estado: EstadoCita
  notificarCliente: boolean
  recordatorioEnviado: boolean
  color: string
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
  createdBy?: string
}

export class CitaEntity {
  private readonly id: string
  private readonly tallerId: string
  private titulo: string
  private descripcion?: string
  private tipo: TipoCita
  private fechaInicio: Date
  private fechaFin?: Date
  private todoElDia: boolean
  private clienteId?: string
  private vehiculoId?: string
  private ordenId?: string
  private estado: EstadoCita
  private notificarCliente: boolean
  private recordatorioEnviado: boolean
  private color: string
  private deletedAt?: Date
  private readonly createdAt: Date
  private updatedAt: Date
  private readonly createdBy?: string

  private constructor(props: CitaProps) {
    this.id = props.id
    this.tallerId = props.tallerId
    this.titulo = props.titulo
    this.descripcion = props.descripcion
    this.tipo = props.tipo
    this.fechaInicio = props.fechaInicio
    this.fechaFin = props.fechaFin
    this.todoElDia = props.todoElDia
    this.clienteId = props.clienteId
    this.vehiculoId = props.vehiculoId
    this.ordenId = props.ordenId
    this.estado = props.estado
    this.notificarCliente = props.notificarCliente
    this.recordatorioEnviado = props.recordatorioEnviado
    this.color = props.color
    this.deletedAt = props.deletedAt
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
    this.createdBy = props.createdBy
  }

  /**
   * Crea una nueva cita validando las reglas de negocio
   */
  public static create(props: CitaProps): CitaEntity {
    // Validar título
    if (!props.titulo || props.titulo.trim().length === 0) {
      throw new ValidationError('El título de la cita es obligatorio', 'titulo')
    }

    if (props.titulo.trim().length > 200) {
      throw new ValidationError(
        'El título no puede exceder 200 caracteres',
        'titulo'
      )
    }

    // Validar descripción
    if (props.descripcion && props.descripcion.length > 2000) {
      throw new ValidationError(
        'La descripción no puede exceder 2000 caracteres',
        'descripcion'
      )
    }

    // Validar fechas
    if (!props.fechaInicio) {
      throw new ValidationError('La fecha de inicio es obligatoria', 'fechaInicio')
    }

    // Si no es todo el día, debe tener fecha fin
    if (!props.todoElDia && !props.fechaFin) {
      throw new ValidationError(
        'Las citas con horario específico deben tener fecha de fin',
        'fechaFin'
      )
    }

    // La fecha fin debe ser posterior a la fecha inicio
    if (props.fechaFin && props.fechaFin <= props.fechaInicio) {
      throw new ValidationError(
        'La fecha de fin debe ser posterior a la fecha de inicio',
        'fechaFin'
      )
    }

    // Validar que la duración no sea excesiva
    if (props.fechaFin) {
      const duracionHoras = (props.fechaFin.getTime() - props.fechaInicio.getTime()) / (1000 * 60 * 60)
      if (duracionHoras > 24 * 7) { // Más de 7 días
        throw new ValidationError(
          'La duración de la cita no puede exceder 7 días',
          'fechaFin'
        )
      }
    }

    // Validar color hexadecimal
    if (props.color && !/^#[0-9A-Fa-f]{6}$/.test(props.color)) {
      throw new ValidationError(
        'El color debe ser un código hexadecimal válido (ej. #3b82f6)',
        'color'
      )
    }

    return new CitaEntity(props)
  }

  // ==================== GETTERS ====================

  public getId(): string {
    return this.id
  }

  public getTallerId(): string {
    return this.tallerId
  }

  public getTitulo(): string {
    return this.titulo
  }

  public getDescripcion(): string | undefined {
    return this.descripcion
  }

  public getTipo(): TipoCita {
    return this.tipo
  }

  public getFechaInicio(): Date {
    return this.fechaInicio
  }

  public getFechaFin(): Date | undefined {
    return this.fechaFin
  }

  public isTodoElDia(): boolean {
    return this.todoElDia
  }

  public getClienteId(): string | undefined {
    return this.clienteId
  }

  public getVehiculoId(): string | undefined {
    return this.vehiculoId
  }

  public getOrdenId(): string | undefined {
    return this.ordenId
  }

  public getEstado(): EstadoCita {
    return this.estado
  }

  public isNotificarCliente(): boolean {
    return this.notificarCliente
  }

  public isRecordatorioEnviado(): boolean {
    return this.recordatorioEnviado
  }

  public getColor(): string {
    return this.color
  }

  public getDeletedAt(): Date | undefined {
    return this.deletedAt
  }

  public getCreatedAt(): Date {
    return this.createdAt
  }

  public getUpdatedAt(): Date {
    return this.updatedAt
  }

  public getCreatedBy(): string | undefined {
    return this.createdBy
  }

  // ==================== MÉTODOS DE NEGOCIO ====================

  /**
   * Verifica si la cita está eliminada
   */
  public isEliminada(): boolean {
    return this.deletedAt !== undefined
  }

  /**
   * Verifica si la cita está confirmada
   */
  public isConfirmada(): boolean {
    return this.estado === EstadoCita.CONFIRMADA
  }

  /**
   * Verifica si la cita está completada
   */
  public isCompletada(): boolean {
    return this.estado === EstadoCita.COMPLETADA
  }

  /**
   * Verifica si la cita está cancelada
   */
  public isCancelada(): boolean {
    return this.estado === EstadoCita.CANCELADA
  }

  /**
   * Verifica si la cita está pendiente
   */
  public isPendiente(): boolean {
    return this.estado === EstadoCita.PENDIENTE
  }

  /**
   * Verifica si la cita ya pasó
   */
  public isVencida(): boolean {
    const ahora = new Date()
    const fechaComparar = this.fechaFin || this.fechaInicio
    return fechaComparar < ahora && !this.isCompletada()
  }

  /**
   * Verifica si la cita es hoy
   */
  public isHoy(): boolean {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const mañana = new Date(hoy)
    mañana.setDate(mañana.getDate() + 1)

    return this.fechaInicio >= hoy && this.fechaInicio < mañana
  }

  /**
   * Obtiene la duración de la cita en minutos
   */
  public getDuracionMinutos(): number | undefined {
    if (!this.fechaFin) return undefined
    return (this.fechaFin.getTime() - this.fechaInicio.getTime()) / (1000 * 60)
  }

  /**
   * Verifica si la cita tiene cliente asociado
   */
  public tieneCliente(): boolean {
    return this.clienteId !== undefined
  }

  /**
   * Verifica si la cita tiene vehículo asociado
   */
  public tieneVehiculo(): boolean {
    return this.vehiculoId !== undefined
  }

  /**
   * Verifica si la cita tiene orden asociada
   */
  public tieneOrden(): boolean {
    return this.ordenId !== undefined
  }

  /**
   * Confirma la cita
   */
  public confirmar(): void {
    if (this.estado === EstadoCita.CANCELADA) {
      throw new ValidationError('No se puede confirmar una cita cancelada', 'estado')
    }
    if (this.estado === EstadoCita.COMPLETADA) {
      throw new ValidationError('No se puede confirmar una cita completada', 'estado')
    }
    this.estado = EstadoCita.CONFIRMADA
    this.updatedAt = new Date()
  }

  /**
   * Completa la cita
   */
  public completar(): void {
    if (this.estado === EstadoCita.CANCELADA) {
      throw new ValidationError('No se puede completar una cita cancelada', 'estado')
    }
    this.estado = EstadoCita.COMPLETADA
    this.updatedAt = new Date()
  }

  /**
   * Cancela la cita
   */
  public cancelar(): void {
    if (this.estado === EstadoCita.COMPLETADA) {
      throw new ValidationError('No se puede cancelar una cita completada', 'estado')
    }
    this.estado = EstadoCita.CANCELADA
    this.updatedAt = new Date()
  }

  /**
   * Marca el recordatorio como enviado
   */
  public marcarRecordatorioEnviado(): void {
    this.recordatorioEnviado = true
    this.updatedAt = new Date()
  }

  /**
   * Actualiza los datos de la cita
   */
  public actualizar(datos: Partial<{
    titulo: string
    descripcion: string
    tipo: TipoCita
    fechaInicio: Date
    fechaFin: Date
    todoElDia: boolean
    clienteId: string
    vehiculoId: string
    ordenId: string
    notificarCliente: boolean
    color: string
  }>): void {
    if (datos.titulo !== undefined) {
      if (!datos.titulo || datos.titulo.trim().length === 0) {
        throw new ValidationError('El título de la cita es obligatorio', 'titulo')
      }
      if (datos.titulo.trim().length > 200) {
        throw new ValidationError('El título no puede exceder 200 caracteres', 'titulo')
      }
      this.titulo = datos.titulo.trim()
    }

    if (datos.descripcion !== undefined) {
      if (datos.descripcion && datos.descripcion.length > 2000) {
        throw new ValidationError('La descripción no puede exceder 2000 caracteres', 'descripcion')
      }
      this.descripcion = datos.descripcion
    }

    if (datos.tipo !== undefined) {
      this.tipo = datos.tipo
    }

    if (datos.fechaInicio !== undefined) {
      this.fechaInicio = datos.fechaInicio
    }

    if (datos.fechaFin !== undefined) {
      if (datos.fechaFin <= this.fechaInicio) {
        throw new ValidationError('La fecha de fin debe ser posterior a la fecha de inicio', 'fechaFin')
      }
      this.fechaFin = datos.fechaFin
    }

    if (datos.todoElDia !== undefined) {
      this.todoElDia = datos.todoElDia
    }

    if (datos.clienteId !== undefined) {
      this.clienteId = datos.clienteId
    }

    if (datos.vehiculoId !== undefined) {
      this.vehiculoId = datos.vehiculoId
    }

    if (datos.ordenId !== undefined) {
      this.ordenId = datos.ordenId
    }

    if (datos.notificarCliente !== undefined) {
      this.notificarCliente = datos.notificarCliente
    }

    if (datos.color !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(datos.color)) {
        throw new ValidationError('El color debe ser un código hexadecimal válido', 'color')
      }
      this.color = datos.color
    }

    this.updatedAt = new Date()
  }

  /**
   * Elimina la cita (soft delete)
   */
  public eliminar(): void {
    this.deletedAt = new Date()
    this.updatedAt = new Date()
  }

  /**
   * Restaura la cita eliminada
   */
  public restaurar(): void {
    this.deletedAt = undefined
    this.updatedAt = new Date()
  }

  /**
   * Convierte la entidad a un objeto plano para persistencia
   */
  public toPlainObject(): any {
    return {
      id: this.id,
      taller_id: this.tallerId,
      titulo: this.titulo,
      descripcion: this.descripcion,
      tipo: this.tipo,
      fecha_inicio: this.fechaInicio.toISOString(),
      fecha_fin: this.fechaFin?.toISOString(),
      todo_el_dia: this.todoElDia,
      cliente_id: this.clienteId,
      vehiculo_id: this.vehiculoId,
      orden_id: this.ordenId,
      estado: this.estado,
      notificar_cliente: this.notificarCliente,
      recordatorio_enviado: this.recordatorioEnviado,
      color: this.color,
      deleted_at: this.deletedAt?.toISOString(),
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      created_by: this.createdBy
    }
  }

  /**
   * Convierte la entidad a un DTO para la capa de aplicación
   */
  public toDTO(): any {
    return {
      id: this.id,
      tallerId: this.tallerId,
      titulo: this.titulo,
      descripcion: this.descripcion,
      tipo: this.tipo,
      fechaInicio: this.fechaInicio.toISOString(),
      fechaFin: this.fechaFin?.toISOString(),
      todoElDia: this.todoElDia,
      clienteId: this.clienteId,
      vehiculoId: this.vehiculoId,
      ordenId: this.ordenId,
      estado: this.estado,
      notificarCliente: this.notificarCliente,
      recordatorioEnviado: this.recordatorioEnviado,
      color: this.color,
      duracionMinutos: this.getDuracionMinutos(),
      isEliminada: this.isEliminada(),
      isConfirmada: this.isConfirmada(),
      isCompletada: this.isCompletada(),
      isCancelada: this.isCancelada(),
      isPendiente: this.isPendiente(),
      isVencida: this.isVencida(),
      isHoy: this.isHoy(),
      tieneCliente: this.tieneCliente(),
      tieneVehiculo: this.tieneVehiculo(),
      tieneOrden: this.tieneOrden(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      deletedAt: this.deletedAt?.toISOString(),
      createdBy: this.createdBy
    }
  }
}
