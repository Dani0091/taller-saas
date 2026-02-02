/**
 * @fileoverview Mapper: Cliente (BD <-> Entity)
 * @description Convierte entre registros de BD y entities de dominio
 *
 * RESPONSABILIDAD ÚNICA: Transformar datos
 * NO contiene lógica de negocio, solo transformación
 */

import { ClienteEntity } from '@/domain/entities'
import { NIF, Email, Telefono, IBAN } from '@/domain/value-objects'
import { EstadoCliente, TipoCliente, FormaPago } from '@/domain/types'

/**
 * Tipo de registro de cliente desde Supabase (ESQUEMA REAL)
 * CAMPOS QUE EXISTEN: id, taller_id, nombre, apellidos, nif, email, telefono, direccion, notas, estado,
 * created_at, updated_at, tipo_cliente, iban, numero_registros_mercanitles, contacto_principal,
 * contacto_email, contacto_telefono, ciudad, provincia, codigo_postal, pais, forma_pago,
 * primer_apellido, segundo_apellido, fecha_nacimiento, segundo_telefono, email_secundario,
 * preferencia_contacto, acepta_marketing, como_nos_conocio, credito_disponible, total_facturado, ultima_visita
 */
export interface ClienteDBRecord {
  id: string
  taller_id: string
  nombre: string
  apellidos?: string
  nif?: string
  email?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  provincia?: string
  codigo_postal?: string
  pais?: string
  notas?: string
  estado?: string
  tipo_cliente?: string
  iban?: string
  forma_pago?: string
  created_at?: string
  updated_at?: string
  // Campos adicionales que SÍ existen en BD real
  primer_apellido?: string
  segundo_apellido?: string
  fecha_nacimiento?: string
  segundo_telefono?: string
  email_secundario?: string
  preferencia_contacto?: string
  acepta_marketing?: boolean
  como_nos_conocio?: string
  numero_registros_mercanitles?: string
  contacto_principal?: string
  contacto_email?: string
  contacto_telefono?: string
  credito_disponible?: number
  total_facturado?: number
  ultima_visita?: string
  // Campos legacy (pueden no existir, pero código los espera)
  requiere_autorizacion?: boolean
  empresa_renting?: string
  dias_pago?: number
  limite_credito?: number
  deleted_at?: string
  deleted_by?: string
}

export class ClienteMapper {
  /**
   * Convierte de registro de BD a Entity de dominio
   */
  static toDomain(record: ClienteDBRecord): ClienteEntity {
    // Procesar Value Objects (con protección para datos legacy)
    let nif: NIF
    try {
      nif = NIF.create(record.nif || '00000000T')
    } catch (error) {
      // Si el NIF es inválido, crear uno ficticio para no romper la app
      console.warn(`⚠️ NIF inválido (legacy) para cliente ${record.id}: ${record.nif}`, error)
      nif = NIF.create('00000000T') // NIF placeholder para datos legacy
    }

    let email: Email | undefined
    if (record.email) {
      try {
        email = Email.create(record.email)
      } catch {
        email = undefined
      }
    }

    const telefono = record.telefono
      ? Telefono.createUnsafe(record.telefono) // Unsafe para datos legacy
      : undefined

    const iban = record.iban
      ? IBAN.createOrNull(record.iban) ?? undefined
      : undefined

    return ClienteEntity.create({
      id: record.id,
      tallerId: record.taller_id,
      nombre: record.nombre,
      apellidos: record.apellidos,
      nif,
      email,
      telefono,
      direccion: record.direccion,
      ciudad: record.ciudad,
      provincia: record.provincia,
      codigoPostal: record.codigo_postal,
      pais: record.pais || 'España',
      notas: record.notas,
      estado: this.mapEstadoCliente(record.estado || 'activo'),
      tipoCliente: this.mapTipoCliente(record.tipo_cliente || 'particular'),
      requiereAutorizacion: record.requiere_autorizacion ?? false,
      empresaRenting: record.empresa_renting,
      iban,
      formaPago: this.mapFormaPago(record.forma_pago || 'efectivo'),
      diasPago: record.dias_pago ?? 0,
      limiteCredito: record.limite_credito,
      createdAt: record.created_at ? new Date(record.created_at) : new Date(),
      updatedAt: record.updated_at ? new Date(record.updated_at) : new Date(),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : undefined,
      deletedBy: record.deleted_by
    })
  }

  /**
   * Convierte de Entity de dominio a registro de BD
   */
  static toPersistence(entity: ClienteEntity): Partial<ClienteDBRecord> {
    const plain = entity.toPlainObject()

    return {
      id: plain.id,
      taller_id: plain.taller_id,
      nombre: plain.nombre,
      apellidos: plain.apellidos,
      nif: plain.nif,
      email: plain.email,
      telefono: plain.telefono,
      direccion: plain.direccion,
      ciudad: plain.ciudad,
      provincia: plain.provincia,
      codigo_postal: plain.codigo_postal,
      pais: plain.pais,
      notas: plain.notas,
      estado: plain.estado,
      tipo_cliente: plain.tipo_cliente,
      requiere_autorizacion: plain.requiere_autorizacion,
      empresa_renting: plain.empresa_renting,
      iban: plain.iban,
      forma_pago: plain.forma_pago,
      dias_pago: plain.dias_pago,
      limite_credito: plain.limite_credito,
      updated_at: plain.updated_at,
      deleted_at: plain.deleted_at,
      deleted_by: plain.deleted_by
    }
  }

  /**
   * Mapea string de BD a enum EstadoCliente
   */
  private static mapEstadoCliente(estado: string): EstadoCliente {
    const map: Record<string, EstadoCliente> = {
      activo: EstadoCliente.ACTIVO,
      inactivo: EstadoCliente.INACTIVO
    }
    return map[estado] || EstadoCliente.ACTIVO
  }

  /**
   * Mapea string de BD a enum TipoCliente
   */
  private static mapTipoCliente(tipo: string): TipoCliente {
    const map: Record<string, TipoCliente> = {
      particular: TipoCliente.PARTICULAR,
      empresa: TipoCliente.EMPRESA,
      autonomo: TipoCliente.AUTONOMO,
      flota: TipoCliente.FLOTA,
      renting: TipoCliente.RENTING
    }
    return map[tipo] || TipoCliente.PARTICULAR
  }

  /**
   * Mapea string de BD a enum FormaPago
   */
  private static mapFormaPago(formaPago: string): FormaPago {
    const map: Record<string, FormaPago> = {
      efectivo: FormaPago.EFECTIVO,
      tarjeta: FormaPago.TARJETA,
      transferencia: FormaPago.TRANSFERENCIA,
      domiciliacion: FormaPago.DOMICILIACION,
      financiacion: FormaPago.FINANCIACION,
      credito: FormaPago.CREDITO
    }
    return map[formaPago] || FormaPago.EFECTIVO
  }
}
