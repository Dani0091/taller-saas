/**
 * @fileoverview Entity: Vehiculo
 * @description Representa un vehículo de un cliente en el taller
 *
 * REGLAS DE NEGOCIO:
 * - Matrícula obligatoria y única por taller
 * - VIN opcional pero validado si existe
 * - Relación con cliente (puede ser null si el cliente se elimina)
 * - Histórico de reparaciones en JSONB
 * - Soft delete
 */

import { Matricula, VIN, Kilometraje } from '@/domain/value-objects'
import { ValidationError, BusinessRuleError } from '@/domain/errors'
import { TipoCombustible, BaseEntity, SoftDeletable } from '@/domain/types'

export interface VehiculoProps extends BaseEntity, SoftDeletable {
  clienteId?: string
  matricula: Matricula
  marca?: string
  modelo?: string
  año?: number
  color?: string
  kilometros?: Kilometraje
  vin?: VIN
  bastidorVin?: string
  numeroMotor?: string
  tipoCombustible?: TipoCombustible
  carroceria?: string
  potenciaCv?: number
  cilindrada?: number
  emisiones?: string
  fechaMatriculacion?: Date
  notas?: string
  fichaTecnicaUrl?: string
  permisoCirculacionUrl?: string
  datosOcr?: Record<string, any>
  ocrProcesado: boolean
  ocrFecha?: Date
}

export class VehiculoEntity {
  private readonly id: string
  private readonly tallerId: string
  private clienteId?: string
  private readonly matricula: Matricula
  private marca?: string
  private modelo?: string
  private año?: number
  private color?: string
  private kilometros?: Kilometraje
  private vin?: VIN
  private bastidorVin?: string
  private numeroMotor?: string
  private tipoCombustible?: TipoCombustible
  private carroceria?: string
  private potenciaCv?: number
  private cilindrada?: number
  private emisiones?: string
  private fechaMatriculacion?: Date
  private notas?: string
  private fichaTecnicaUrl?: string
  private permisoCirculacionUrl?: string
  private datosOcr?: Record<string, any>
  private ocrProcesado: boolean
  private ocrFecha?: Date
  private readonly createdAt: Date
  private updatedAt: Date
  private deletedAt?: Date

  private constructor(props: VehiculoProps) {
    this.id = props.id
    this.tallerId = props.tallerId
    this.clienteId = props.clienteId
    this.matricula = props.matricula
    this.marca = props.marca
    this.modelo = props.modelo
    this.año = props.año
    this.color = props.color
    this.kilometros = props.kilometros
    this.vin = props.vin
    this.bastidorVin = props.bastidorVin
    this.numeroMotor = props.numeroMotor
    this.tipoCombustible = props.tipoCombustible
    this.carroceria = props.carroceria
    this.potenciaCv = props.potenciaCv
    this.cilindrada = props.cilindrada
    this.emisiones = props.emisiones
    this.fechaMatriculacion = props.fechaMatriculacion
    this.notas = props.notas
    this.fichaTecnicaUrl = props.fichaTecnicaUrl
    this.permisoCirculacionUrl = props.permisoCirculacionUrl
    this.datosOcr = props.datosOcr
    this.ocrProcesado = props.ocrProcesado
    this.ocrFecha = props.ocrFecha
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
    this.deletedAt = props.deletedAt
  }

  public static create(props: VehiculoProps): VehiculoEntity {
    // Validar año si existe
    if (props.año !== undefined) {
      const añoActual = new Date().getFullYear()
      if (props.año < 1900 || props.año > añoActual + 1) {
        throw new ValidationError(`El año debe estar entre 1900 y ${añoActual + 1}`, 'año')
      }
    }

    // Validar potencia si existe
    if (props.potenciaCv !== undefined && (props.potenciaCv < 0 || props.potenciaCv > 2000)) {
      throw new ValidationError('La potencia debe estar entre 0 y 2000 CV', 'potenciaCv')
    }

    // Validar cilindrada si existe
    if (props.cilindrada !== undefined && (props.cilindrada < 0 || props.cilindrada > 10000)) {
      throw new ValidationError('La cilindrada debe estar entre 0 y 10000 cc', 'cilindrada')
    }

    return new VehiculoEntity(props)
  }

  // ==================== GETTERS ====================

  public getId(): string { return this.id }
  public getTallerId(): string { return this.tallerId }
  public getClienteId(): string | undefined { return this.clienteId }
  public getMatricula(): Matricula { return this.matricula }
  public getMarca(): string | undefined { return this.marca }
  public getModelo(): string | undefined { return this.modelo }
  public getAño(): number | undefined { return this.año }
  public getColor(): string | undefined { return this.color }
  public getKilometros(): Kilometraje | undefined { return this.kilometros }
  public getVIN(): VIN | undefined { return this.vin }
  public getTipoCombustible(): TipoCombustible | undefined { return this.tipoCombustible }
  public getNotas(): string | undefined { return this.notas }
  public getCreatedAt(): Date { return this.createdAt }
  public getUpdatedAt(): Date { return this.updatedAt }
  public getDeletedAt(): Date | undefined { return this.deletedAt }

  public getDescripcionCompleta(): string {
    const partes = []
    if (this.marca) partes.push(this.marca)
    if (this.modelo) partes.push(this.modelo)
    if (this.año) partes.push(this.año.toString())
    if (partes.length === 0) return this.matricula.valor
    return `${partes.join(' ')} (${this.matricula.valor})`
  }

  // ==================== LÓGICA DE NEGOCIO ====================

  public isEliminado(): boolean { return !!this.deletedAt }
  public tieneCliente(): boolean { return !!this.clienteId }
  public tieneVIN(): boolean { return !!this.vin }
  public tieneOcrProcesado(): boolean { return this.ocrProcesado }

  public tieneDatosCompletos(): boolean {
    return !!(this.marca && this.modelo && this.año && this.vin)
  }

  public actualizar(datos: Partial<VehiculoProps>): void {
    if (this.deletedAt) {
      throw new BusinessRuleError('No se puede actualizar un vehículo eliminado')
    }

    if (datos.clienteId !== undefined) this.clienteId = datos.clienteId
    if (datos.marca !== undefined) this.marca = datos.marca
    if (datos.modelo !== undefined) this.modelo = datos.modelo
    if (datos.año !== undefined) this.año = datos.año
    if (datos.color !== undefined) this.color = datos.color
    if (datos.kilometros !== undefined) this.kilometros = datos.kilometros
    if (datos.vin !== undefined) this.vin = datos.vin
    if (datos.bastidorVin !== undefined) this.bastidorVin = datos.bastidorVin
    if (datos.numeroMotor !== undefined) this.numeroMotor = datos.numeroMotor
    if (datos.tipoCombustible !== undefined) this.tipoCombustible = datos.tipoCombustible
    if (datos.carroceria !== undefined) this.carroceria = datos.carroceria
    if (datos.potenciaCv !== undefined) this.potenciaCv = datos.potenciaCv
    if (datos.cilindrada !== undefined) this.cilindrada = datos.cilindrada
    if (datos.emisiones !== undefined) this.emisiones = datos.emisiones
    if (datos.fechaMatriculacion !== undefined) this.fechaMatriculacion = datos.fechaMatriculacion
    if (datos.notas !== undefined) this.notas = datos.notas
    if (datos.fichaTecnicaUrl !== undefined) this.fichaTecnicaUrl = datos.fichaTecnicaUrl
    if (datos.permisoCirculacionUrl !== undefined) this.permisoCirculacionUrl = datos.permisoCirculacionUrl

    this.updatedAt = new Date()
  }

  public eliminar(): void {
    if (this.deletedAt) {
      throw new BusinessRuleError('El vehículo ya está eliminado')
    }
    this.deletedAt = new Date()
    this.updatedAt = new Date()
  }

  public restaurar(): void {
    if (!this.deletedAt) {
      throw new BusinessRuleError('El vehículo no está eliminado')
    }
    this.deletedAt = undefined
    this.updatedAt = new Date()
  }

  // ==================== SERIALIZACIÓN ====================

  public toPlainObject() {
    return {
      id: this.id,
      taller_id: this.tallerId,
      cliente_id: this.clienteId,
      matricula: this.matricula.valor,
      marca: this.marca,
      modelo: this.modelo,
      año: this.año,
      color: this.color,
      kilometros: this.kilometros?.valor,
      vin: this.vin?.valor,
      bastidor_vin: this.bastidorVin,
      numero_motor: this.numeroMotor,
      tipo_combustible: this.tipoCombustible,
      carroceria: this.carroceria,
      potencia_cv: this.potenciaCv,
      cilindrada: this.cilindrada,
      emisiones: this.emisiones,
      fecha_matriculacion: this.fechaMatriculacion?.toISOString().split('T')[0],
      notas: this.notas,
      ficha_tecnica_url: this.fichaTecnicaUrl,
      permiso_circulacion_url: this.permisoCirculacionUrl,
      datos_ocr: this.datosOcr,
      ocr_procesado: this.ocrProcesado,
      ocr_fecha: this.ocrFecha?.toISOString(),
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      deleted_at: this.deletedAt?.toISOString()
    }
  }

  public toDTO() {
    return {
      id: this.id,
      tallerId: this.tallerId,
      clienteId: this.clienteId,
      matricula: this.matricula.valor,
      matriculaFormateada: this.matricula.formatConEspacios(),
      marca: this.marca,
      modelo: this.modelo,
      año: this.año,
      color: this.color,
      kilometros: this.kilometros?.valor,
      kilometrosFormateados: this.kilometros?.format(),
      vin: this.vin?.valor,
      vinMasked: this.vin?.mask(),
      vinFormateado: this.vin?.format(),
      bastidorVin: this.bastidorVin,
      numeroMotor: this.numeroMotor,
      tipoCombustible: this.tipoCombustible,
      carroceria: this.carroceria,
      potenciaCv: this.potenciaCv,
      cilindrada: this.cilindrada,
      emisiones: this.emisiones,
      fechaMatriculacion: this.fechaMatriculacion?.toISOString(),
      notas: this.notas,
      fichaTecnicaUrl: this.fichaTecnicaUrl,
      permisoCirculacionUrl: this.permisoCirculacionUrl,
      descripcionCompleta: this.getDescripcionCompleta(),
      isEliminado: this.isEliminado(),
      tieneCliente: this.tieneCliente(),
      tieneVIN: this.tieneVIN(),
      tieneDatosCompletos: this.tieneDatosCompletos(),
      ocrProcesado: this.ocrProcesado,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      deletedAt: this.deletedAt?.toISOString()
    }
  }
}
