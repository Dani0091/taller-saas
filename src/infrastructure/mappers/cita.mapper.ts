/**
 * @fileoverview Mapper: Cita
 * @description Convierte entre la representación de BD y CitaEntity
 */

import { CitaEntity, type CitaProps } from '@/domain/entities'
import { TipoCita, EstadoCita } from '@/domain/types'

/**
 * Tipo que representa un registro de cita en la BD (snake_case)
 */
export type CitaDbRecord = {
  id: string
  taller_id: string
  titulo: string
  descripcion?: string | null
  tipo: string
  fecha_inicio: string
  fecha_fin?: string | null
  todo_el_dia: boolean
  cliente_id?: string | null
  vehiculo_id?: string | null
  orden_id?: string | null
  estado: string
  notificar_cliente: boolean
  recordatorio_enviado: boolean
  color: string
  deleted_at?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
}

export class CitaMapper {
  /**
   * Convierte un registro de BD a CitaEntity
   */
  static toDomain(record: CitaDbRecord): CitaEntity {
    const props: CitaProps = {
      id: record.id,
      tallerId: record.taller_id,
      titulo: record.titulo,
      descripcion: record.descripcion ?? undefined,
      tipo: record.tipo as TipoCita,
      fechaInicio: new Date(record.fecha_inicio),
      fechaFin: record.fecha_fin ? new Date(record.fecha_fin) : undefined,
      todoElDia: record.todo_el_dia,
      clienteId: record.cliente_id ?? undefined,
      vehiculoId: record.vehiculo_id ?? undefined,
      ordenId: record.orden_id ?? undefined,
      estado: record.estado as EstadoCita,
      notificarCliente: record.notificar_cliente,
      recordatorioEnviado: record.recordatorio_enviado,
      color: record.color,
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      createdBy: record.created_by ?? undefined
    }

    return CitaEntity.create(props)
  }

  /**
   * Convierte CitaEntity a objeto plano para BD
   */
  static toPersistence(entity: CitaEntity): Omit<CitaDbRecord, 'created_at' | 'updated_at'> {
    const plainObject = entity.toPlainObject()

    return {
      id: plainObject.id,
      taller_id: plainObject.taller_id,
      titulo: plainObject.titulo,
      descripcion: plainObject.descripcion ?? null,
      tipo: plainObject.tipo,
      fecha_inicio: plainObject.fecha_inicio,
      fecha_fin: plainObject.fecha_fin ?? null,
      todo_el_dia: plainObject.todo_el_dia,
      cliente_id: plainObject.cliente_id ?? null,
      vehiculo_id: plainObject.vehiculo_id ?? null,
      orden_id: plainObject.orden_id ?? null,
      estado: plainObject.estado,
      notificar_cliente: plainObject.notificar_cliente,
      recordatorio_enviado: plainObject.recordatorio_enviado,
      color: plainObject.color,
      deleted_at: plainObject.deleted_at ?? null,
      created_by: plainObject.created_by ?? null
    }
  }

  /**
   * Convierte múltiples registros de BD a entidades
   */
  static toDomainList(records: CitaDbRecord[]): CitaEntity[] {
    return records.map(record => this.toDomain(record))
  }
}
