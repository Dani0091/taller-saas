/**
 * @fileoverview Mapper: Vehiculo
 * @description Convierte entre la representación de BD y VehiculoEntity
 */

import { VehiculoEntity, type VehiculoProps } from '@/domain/entities'
import { Matricula, VIN, Kilometraje } from '@/domain/value-objects'
import { TipoCombustible } from '@/domain/types'

/**
 * Tipo que representa un registro de vehículo en la BD (snake_case)
 */
/**
 * ESQUEMA REAL DE SUPABASE (solo estos campos existen):
 * - id, taller_id, cliente_id, matricula, marca, modelo, año, color
 *
 * Los demás campos se mantienen opcionales para compatibilidad legacy
 */
export type VehiculoDbRecord = {
  id: string
  taller_id: string
  cliente_id?: string | null
  matricula: string
  marca?: string | null
  modelo?: string | null
  año?: number | null
  color?: string | null
  // Campos adicionales (pueden no existir en BD actual)
  kilometros?: number | null
  vin?: string | null
  bastidor_vin?: string | null
  numero_motor?: string | null
  tipo_combustible?: string | null
  carroceria?: string | null
  potencia_cv?: number | null
  cilindrada?: number | null
  emisiones?: string | null
  fecha_matriculacion?: string | null
  notas?: string | null
  ficha_tecnica_url?: string | null
  permiso_circulacion_url?: string | null
  datos_ocr?: Record<string, any> | null
  ocr_procesado?: boolean
  ocr_fecha?: string | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export class VehiculoMapper {
  /**
   * Convierte un registro de BD a VehiculoEntity
   */
  static toDomain(record: VehiculoDbRecord): VehiculoEntity {
    // Protección para datos legacy: matricula
    let matricula: Matricula
    try {
      matricula = Matricula.create(record.matricula)
    } catch (error) {
      console.warn(`⚠️ Matrícula inválida (legacy) para vehículo ${record.id}: ${record.matricula}`, error)
      // Usar matrícula placeholder para datos legacy
      matricula = Matricula.create('0000XXX')
    }

    // Protección para datos legacy: kilometros
    let kilometros: Kilometraje | undefined
    if (record.kilometros !== null && record.kilometros !== undefined) {
      try {
        kilometros = Kilometraje.create(record.kilometros)
      } catch (error) {
        console.warn(`⚠️ Kilometraje inválido (legacy) para vehículo ${record.id}: ${record.kilometros}`, error)
        kilometros = undefined
      }
    }

    // Protección para datos legacy: VIN
    let vin: VIN | undefined
    if (record.vin) {
      try {
        vin = VIN.create(record.vin)
      } catch (error) {
        console.warn(`⚠️ VIN inválido (legacy) para vehículo ${record.id}: ${record.vin}`, error)
        vin = undefined
      }
    }

    const props: VehiculoProps = {
      id: record.id,
      tallerId: record.taller_id,
      clienteId: record.cliente_id ?? undefined,
      matricula,
      marca: record.marca ?? undefined,
      modelo: record.modelo ?? undefined,
      año: record.año ?? undefined,
      color: record.color ?? undefined,
      kilometros,
      vin,
      bastidorVin: record.bastidor_vin ?? undefined,
      numeroMotor: record.numero_motor ?? undefined,
      tipoCombustible: record.tipo_combustible as TipoCombustible | undefined,
      carroceria: record.carroceria ?? undefined,
      potenciaCv: record.potencia_cv ?? undefined,
      cilindrada: record.cilindrada ?? undefined,
      emisiones: record.emisiones ?? undefined,
      fechaMatriculacion: record.fecha_matriculacion ? new Date(record.fecha_matriculacion) : undefined,
      notas: record.notas ?? undefined,
      fichaTecnicaUrl: record.ficha_tecnica_url ?? undefined,
      permisoCirculacionUrl: record.permiso_circulacion_url ?? undefined,
      datosOcr: record.datos_ocr ?? undefined,
      ocrProcesado: record.ocr_procesado ?? false,
      ocrFecha: record.ocr_fecha ? new Date(record.ocr_fecha) : undefined,
      createdAt: record.created_at ? new Date(record.created_at) : new Date(),
      updatedAt: record.updated_at ? new Date(record.updated_at) : new Date(),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : undefined
    }

    return VehiculoEntity.create(props)
  }

  /**
   * Convierte VehiculoEntity a objeto plano para BD
   */
  static toPersistence(entity: VehiculoEntity): Omit<VehiculoDbRecord, 'created_at' | 'updated_at'> {
    const plainObject = entity.toPlainObject()

    return {
      id: plainObject.id,
      taller_id: plainObject.taller_id,
      cliente_id: plainObject.cliente_id ?? null,
      matricula: plainObject.matricula,
      marca: plainObject.marca ?? null,
      modelo: plainObject.modelo ?? null,
      año: plainObject.año ?? null,
      color: plainObject.color ?? null,
      kilometros: plainObject.kilometros ?? null,
      vin: plainObject.vin ?? null,
      bastidor_vin: plainObject.bastidor_vin ?? null,
      numero_motor: plainObject.numero_motor ?? null,
      tipo_combustible: plainObject.tipo_combustible ?? null,
      carroceria: plainObject.carroceria ?? null,
      potencia_cv: plainObject.potencia_cv ?? null,
      cilindrada: plainObject.cilindrada ?? null,
      emisiones: plainObject.emisiones ?? null,
      fecha_matriculacion: plainObject.fecha_matriculacion ?? null,
      notas: plainObject.notas ?? null,
      ficha_tecnica_url: plainObject.ficha_tecnica_url ?? null,
      permiso_circulacion_url: plainObject.permiso_circulacion_url ?? null,
      datos_ocr: plainObject.datos_ocr ?? null,
      ocr_procesado: plainObject.ocr_procesado,
      ocr_fecha: plainObject.ocr_fecha ?? null,
      deleted_at: plainObject.deleted_at ?? null
    }
  }

  /**
   * Convierte múltiples registros de BD a entidades
   */
  static toDomainList(records: VehiculoDbRecord[]): VehiculoEntity[] {
    return records.map(record => this.toDomain(record))
  }
}
