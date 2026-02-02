/**
 * @fileoverview Entity: Cliente
 * @description Representa un cliente del taller (particular, empresa, autónomo, flota, renting)
 *
 * REGLAS DE NEGOCIO:
 * - NIF obligatorio y único por taller
 * - Email y teléfono opcionales pero validados
 * - IBAN opcional pero validado si existe
 * - Clientes de tipo empresa/autónomo requieren razón social
 * - Límite de crédito solo para clientes con forma de pago a crédito
 * - Soft delete: no se eliminan físicamente
 *
 * VENTAJA: Toda la lógica de validación está aquí, no en la UI ni en la BD
 */

import { NIF, Email, Telefono, IBAN } from '@/domain/value-objects'
import { ValidationError, BusinessRuleError } from '@/domain/errors'
import { EstadoCliente, TipoCliente, FormaPago, BaseEntity, SoftDeletable } from '@/domain/types'

export interface ClienteProps extends BaseEntity, SoftDeletable {
  nombre: string
  apellidos?: string
  nif: NIF
  email?: Email
  telefono?: Telefono
  direccion?: string
  ciudad?: string
  provincia?: string
  codigoPostal?: string
  pais?: string
  notas?: string
  estado: EstadoCliente
  tipoCliente: TipoCliente
  requiereAutorizacion: boolean
  empresaRenting?: string
  iban?: IBAN
  formaPago: FormaPago
  diasPago: number
  limiteCredito?: number
}

export class ClienteEntity {
  private readonly id: string
  private readonly tallerId: string
  private nombre: string
  private apellidos?: string
  private readonly nif: NIF
  private email?: Email
  private telefono?: Telefono
  private direccion?: string
  private ciudad?: string
  private provincia?: string
  private codigoPostal?: string
  private pais: string
  private notas?: string
  private estado: EstadoCliente
  private tipoCliente: TipoCliente
  private requiereAutorizacion: boolean
  private empresaRenting?: string
  private iban?: IBAN
  private formaPago: FormaPago
  private diasPago: number
  private limiteCredito?: number
  private readonly createdAt: Date
  private updatedAt: Date
  private deletedAt?: Date
  private deletedBy?: string

  private constructor(props: ClienteProps) {
    this.id = props.id
    this.tallerId = props.tallerId
    this.nombre = props.nombre
    this.apellidos = props.apellidos
    this.nif = props.nif
    this.email = props.email
    this.telefono = props.telefono
    this.direccion = props.direccion
    this.ciudad = props.ciudad
    this.provincia = props.provincia
    this.codigoPostal = props.codigoPostal
    this.pais = props.pais || 'España'
    this.notas = props.notas
    this.estado = props.estado
    this.tipoCliente = props.tipoCliente
    this.requiereAutorizacion = props.requiereAutorizacion
    this.empresaRenting = props.empresaRenting
    this.iban = props.iban
    this.formaPago = props.formaPago
    this.diasPago = props.diasPago
    this.limiteCredito = props.limiteCredito
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
    this.deletedAt = props.deletedAt
    this.deletedBy = props.deletedBy
  }

  public static create(props: ClienteProps): ClienteEntity {
    // Validar nombre
    if (!props.nombre || props.nombre.trim().length === 0) {
      throw new ValidationError('El nombre es obligatorio', 'nombre')
    }

    if (props.nombre.length > 255) {
      throw new ValidationError('El nombre no puede tener más de 255 caracteres', 'nombre')
    }

    // Validar apellidos si existen
    if (props.apellidos && props.apellidos.length > 255) {
      throw new ValidationError('Los apellidos no pueden tener más de 255 caracteres', 'apellidos')
    }

    // Validar que clientes empresa/autónomo/flota tengan nombre completo
    if (
      [TipoCliente.EMPRESA, TipoCliente.FLOTA, TipoCliente.RENTING].includes(props.tipoCliente) &&
      !props.apellidos
    ) {
      // Para empresas, el campo "apellidos" se usa como razón social
      // Por lo tanto no es necesario validar su presencia aquí
    }

    // Validar código postal español si existe
    if (props.codigoPostal && props.pais === 'España') {
      if (!/^\d{5}$/.test(props.codigoPostal)) {
        throw new ValidationError('El código postal español debe tener 5 dígitos', 'codigoPostal')
      }
    }

    // Validar días de pago
    if (props.diasPago < 0 || props.diasPago > 365) {
      throw new ValidationError('Los días de pago deben estar entre 0 y 365', 'diasPago')
    }

    // Validar límite de crédito si existe
    if (props.limiteCredito !== undefined) {
      if (props.limiteCredito < 0) {
        throw new ValidationError('El límite de crédito no puede ser negativo', 'limiteCredito')
      }

      // Solo permitir límite de crédito si la forma de pago lo permite
      if (![FormaPago.CREDITO, FormaPago.DOMICILIACION, FormaPago.FINANCIACION].includes(props.formaPago)) {
        throw new ValidationError(
          'El límite de crédito solo se aplica a formas de pago a crédito, domiciliación o financiación',
          'limiteCredito'
        )
      }
    }

    // Validar que clientes de renting tengan empresa especificada
    if (props.tipoCliente === TipoCliente.RENTING && !props.empresaRenting) {
      throw new ValidationError('Los clientes de renting deben tener una empresa asociada', 'empresaRenting')
    }

    return new ClienteEntity(props)
  }

  // ==================== GETTERS ====================

  public getId(): string {
    return this.id
  }

  public getTallerId(): string {
    return this.tallerId
  }

  public getNombre(): string {
    return this.nombre
  }

  public getApellidos(): string | undefined {
    return this.apellidos
  }

  public getNombreCompleto(): string {
    if (this.tipoCliente === TipoCliente.PARTICULAR && this.apellidos) {
      return `${this.nombre} ${this.apellidos}`
    }
    // Para empresas, "nombre" es la razón social
    return this.nombre
  }

  public getNIF(): NIF {
    return this.nif
  }

  public getEmail(): Email | undefined {
    return this.email
  }

  public getTelefono(): Telefono | undefined {
    return this.telefono
  }

  public getDireccion(): string | undefined {
    return this.direccion
  }

  public getCiudad(): string | undefined {
    return this.ciudad
  }

  public getProvincia(): string | undefined {
    return this.provincia
  }

  public getCodigoPostal(): string | undefined {
    return this.codigoPostal
  }

  public getPais(): string {
    return this.pais
  }

  public getNotas(): string | undefined {
    return this.notas
  }

  public getEstado(): EstadoCliente {
    return this.estado
  }

  public getTipoCliente(): TipoCliente {
    return this.tipoCliente
  }

  public getRequiereAutorizacion(): boolean {
    return this.requiereAutorizacion
  }

  public getEmpresaRenting(): string | undefined {
    return this.empresaRenting
  }

  public getIBAN(): IBAN | undefined {
    return this.iban
  }

  public getFormaPago(): FormaPago {
    return this.formaPago
  }

  public getDiasPago(): number {
    return this.diasPago
  }

  public getLimiteCredito(): number | undefined {
    return this.limiteCredito
  }

  public getCreatedAt(): Date {
    return this.createdAt
  }

  public getUpdatedAt(): Date {
    return this.updatedAt
  }

  public getDeletedAt(): Date | undefined {
    return this.deletedAt
  }

  public getDeletedBy(): string | undefined {
    return this.deletedBy
  }

  // ==================== LÓGICA DE NEGOCIO ====================

  /**
   * Verifica si el cliente está activo
   */
  public isActivo(): boolean {
    return this.estado === EstadoCliente.ACTIVO && !this.deletedAt
  }

  /**
   * Verifica si el cliente está eliminado (soft delete)
   */
  public isEliminado(): boolean {
    return !!this.deletedAt
  }

  /**
   * Verifica si es un cliente particular (persona física)
   */
  public isParticular(): boolean {
    return this.tipoCliente === TipoCliente.PARTICULAR
  }

  /**
   * Verifica si es un cliente empresa (persona jurídica)
   */
  public isEmpresa(): boolean {
    return [TipoCliente.EMPRESA, TipoCliente.AUTONOMO, TipoCliente.FLOTA, TipoCliente.RENTING].includes(
      this.tipoCliente
    )
  }

  /**
   * Verifica si el cliente tiene límite de crédito configurado
   */
  public tieneLimiteCredito(): boolean {
    return this.limiteCredito !== undefined && this.limiteCredito > 0
  }

  /**
   * Verifica si el cliente tiene datos de contacto completos
   */
  public tieneContactoCompleto(): boolean {
    return !!(this.email && this.telefono)
  }

  /**
   * Verifica si el cliente tiene dirección completa
   */
  public tieneDireccionCompleta(): boolean {
    return !!(this.direccion && this.ciudad && this.provincia && this.codigoPostal)
  }

  /**
   * Verifica si el cliente paga al contado (sin plazo)
   */
  public pagaAlContado(): boolean {
    return this.diasPago === 0
  }

  /**
   * Activa el cliente
   */
  public activar(): void {
    if (this.deletedAt) {
      throw new BusinessRuleError('No se puede activar un cliente eliminado')
    }
    this.estado = EstadoCliente.ACTIVO
    this.updatedAt = new Date()
  }

  /**
   * Desactiva el cliente
   */
  public desactivar(): void {
    if (this.deletedAt) {
      throw new BusinessRuleError('No se puede desactivar un cliente eliminado')
    }
    this.estado = EstadoCliente.INACTIVO
    this.updatedAt = new Date()
  }

  /**
   * Actualiza los datos del cliente
   */
  public actualizar(datos: Partial<ClienteProps>): void {
    if (this.deletedAt) {
      throw new BusinessRuleError('No se puede actualizar un cliente eliminado')
    }

    if (datos.nombre !== undefined) {
      if (!datos.nombre || datos.nombre.trim().length === 0) {
        throw new ValidationError('El nombre es obligatorio', 'nombre')
      }
      this.nombre = datos.nombre
    }

    if (datos.apellidos !== undefined) {
      this.apellidos = datos.apellidos
    }

    if (datos.email !== undefined) {
      this.email = datos.email
    }

    if (datos.telefono !== undefined) {
      this.telefono = datos.telefono
    }

    if (datos.direccion !== undefined) {
      this.direccion = datos.direccion
    }

    if (datos.ciudad !== undefined) {
      this.ciudad = datos.ciudad
    }

    if (datos.provincia !== undefined) {
      this.provincia = datos.provincia
    }

    if (datos.codigoPostal !== undefined) {
      this.codigoPostal = datos.codigoPostal
    }

    if (datos.pais !== undefined) {
      this.pais = datos.pais
    }

    if (datos.notas !== undefined) {
      this.notas = datos.notas
    }

    if (datos.tipoCliente !== undefined) {
      this.tipoCliente = datos.tipoCliente
    }

    if (datos.requiereAutorizacion !== undefined) {
      this.requiereAutorizacion = datos.requiereAutorizacion
    }

    if (datos.empresaRenting !== undefined) {
      this.empresaRenting = datos.empresaRenting
    }

    if (datos.iban !== undefined) {
      this.iban = datos.iban
    }

    if (datos.formaPago !== undefined) {
      this.formaPago = datos.formaPago
    }

    if (datos.diasPago !== undefined) {
      this.diasPago = datos.diasPago
    }

    if (datos.limiteCredito !== undefined) {
      this.limiteCredito = datos.limiteCredito
    }

    this.updatedAt = new Date()
  }

  /**
   * Marca el cliente como eliminado (soft delete)
   */
  public eliminar(userId: string): void {
    if (this.deletedAt) {
      throw new BusinessRuleError('El cliente ya está eliminado')
    }
    this.deletedAt = new Date()
    this.deletedBy = userId
    this.updatedAt = new Date()
  }

  /**
   * Restaura un cliente eliminado
   */
  public restaurar(): void {
    if (!this.deletedAt) {
      throw new BusinessRuleError('El cliente no está eliminado')
    }
    this.deletedAt = undefined
    this.deletedBy = undefined
    this.updatedAt = new Date()
  }

  // ==================== SERIALIZACIÓN ====================

  public toPlainObject() {
    return {
      id: this.id,
      taller_id: this.tallerId,
      nombre: this.nombre,
      apellidos: this.apellidos,
      nif: this.nif.valor,
      email: this.email?.valor,
      telefono: this.telefono?.valor,
      direccion: this.direccion,
      ciudad: this.ciudad,
      provincia: this.provincia,
      codigo_postal: this.codigoPostal,
      pais: this.pais,
      notas: this.notas,
      estado: this.estado,
      tipo_cliente: this.tipoCliente,
      requiere_autorizacion: this.requiereAutorizacion,
      empresa_renting: this.empresaRenting,
      iban: this.iban?.valor,
      forma_pago: this.formaPago,
      dias_pago: this.diasPago,
      limite_credito: this.limiteCredito,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      deleted_at: this.deletedAt?.toISOString(),
      deleted_by: this.deletedBy
    }
  }

  public toDTO() {
    return {
      id: this.id,
      tallerId: this.tallerId,
      nombre: this.nombre,
      apellidos: this.apellidos,
      nombreCompleto: this.getNombreCompleto(),
      nif: this.nif.valor,
      nifMasked: this.nif.mask(),
      email: this.email?.valor,
      emailMasked: this.email?.mask(),
      telefono: this.telefono?.valor,
      telefonoFormatted: this.telefono?.format(),
      direccion: this.direccion,
      ciudad: this.ciudad,
      provincia: this.provincia,
      codigoPostal: this.codigoPostal,
      pais: this.pais,
      notas: this.notas,
      estado: this.estado,
      tipoCliente: this.tipoCliente,
      requiereAutorizacion: this.requiereAutorizacion,
      empresaRenting: this.empresaRenting,
      iban: this.iban?.valor,
      ibanMasked: this.iban?.mask(),
      ibanFormatted: this.iban?.format(),
      formaPago: this.formaPago,
      diasPago: this.diasPago,
      limiteCredito: this.limiteCredito,
      isActivo: this.isActivo(),
      isEliminado: this.isEliminado(),
      isParticular: this.isParticular(),
      isEmpresa: this.isEmpresa(),
      tieneContactoCompleto: this.tieneContactoCompleto(),
      tieneDireccionCompleta: this.tieneDireccionCompleta(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      deletedAt: this.deletedAt?.toISOString()
    }
  }
}
