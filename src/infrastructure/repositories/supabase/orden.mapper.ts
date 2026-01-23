/**
 * @fileoverview Mapper: Orden (BD <-> Entity)
 * @description Convierte entre registros de BD y entities de dominio
 *
 * RESPONSABILIDAD ÚNICA: Transformar datos
 * NO contiene lógica de negocio, solo transformación
 */

import { OrdenEntity, LineaOrdenEntity } from '@/domain/entities'
import { Precio, Kilometraje } from '@/domain/value-objects'
import { EstadoOrden, TipoLinea, EstadoLineaOrden, AccionImprevisto } from '@/domain/types'

/**
 * Tipo de registro de orden desde Supabase
 */
export interface OrdenDBRecord {
  id: string
  taller_id: string
  numero_orden?: string
  cliente_id: string
  vehiculo_id: string
  operario_id?: string
  factura_id?: string
  descripcion_problema?: string
  diagnostico?: string
  trabajos_realizados?: string
  notas?: string
  presupuesto_aprobado_por_cliente: boolean
  tiempo_estimado_horas?: number
  tiempo_real_horas?: number
  kilometros_entrada?: number
  nivel_combustible?: string
  renuncia_presupuesto: boolean
  accion_imprevisto: string
  recoger_piezas: boolean
  danos_carroceria?: string
  coste_diario_estancia?: number
  fotos_entrada?: string
  fotos_salida?: string
  fotos_diagnostico?: string
  estado: string
  created_at: string
  updated_at: string
  deleted_at?: string
  deleted_by?: string
  lineas?: LineaDBRecord[]
}

/**
 * Tipo de registro de línea de orden desde Supabase
 */
export interface LineaDBRecord {
  id: string
  orden_id: string
  tipo: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  estado: string
}

export class OrdenMapper {
  /**
   * Convierte de registro de BD a Entity de dominio
   */
  static toDomain(record: OrdenDBRecord): OrdenEntity {
    // Parsear fotos (vienen como JSON string)
    const fotosEntrada = this.parseFotos(record.fotos_entrada)
    const fotosSalida = this.parseFotos(record.fotos_salida)
    const fotosDiagnostico = this.parseFotos(record.fotos_diagnostico)

    // Mapear líneas
    const lineas = (record.lineas || []).map(linea => this.lineaToDomain(linea))

    return OrdenEntity.create({
      id: record.id,
      tallerId: record.taller_id,
      numeroOrden: record.numero_orden,
      clienteId: record.cliente_id,
      vehiculoId: record.vehiculo_id,
      operarioId: record.operario_id,
      facturaId: record.factura_id,
      descripcionProblema: record.descripcion_problema,
      diagnostico: record.diagnostico,
      trabajosRealizados: record.trabajos_realizados,
      notas: record.notas,
      presupuestoAprobadoPorCliente: record.presupuesto_aprobado_por_cliente,
      tiempoEstimadoHoras: record.tiempo_estimado_horas,
      tiempoRealHoras: record.tiempo_real_horas,
      kilometrosEntrada: record.kilometros_entrada
        ? Kilometraje.create(record.kilometros_entrada)
        : undefined,
      nivelCombustible: record.nivel_combustible,
      renunciaPresupuesto: record.renuncia_presupuesto,
      accionImprevisto: record.accion_imprevisto as AccionImprevisto,
      recogerPiezas: record.recoger_piezas,
      danosCarroceria: record.danos_carroceria,
      costeDiarioEstancia: record.coste_diario_estancia
        ? Precio.create(record.coste_diario_estancia)
        : undefined,
      fotosEntrada,
      fotosSalida,
      fotosDiagnostico,
      estado: record.estado as EstadoOrden,
      lineas,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      deletedAt: record.deleted_at ? new Date(record.deleted_at) : undefined,
      deletedBy: record.deleted_by
    })
  }

  /**
   * Convierte de Entity de dominio a registro de BD
   */
  static toPersistence(entity: OrdenEntity): Partial<OrdenDBRecord> {
    const plain = entity.toPlainObject()

    return {
      id: plain.id,
      taller_id: plain.taller_id,
      numero_orden: plain.numero_orden,
      cliente_id: plain.cliente_id,
      vehiculo_id: plain.vehiculo_id,
      operario_id: plain.operario_id,
      factura_id: plain.factura_id,
      descripcion_problema: plain.descripcion_problema,
      diagnostico: plain.diagnostico,
      trabajos_realizados: plain.trabajos_realizados,
      notas: plain.notas,
      presupuesto_aprobado_por_cliente: plain.presupuesto_aprobado_por_cliente,
      tiempo_estimado_horas: plain.tiempo_estimado_horas,
      tiempo_real_horas: plain.tiempo_real_horas,
      kilometros_entrada: plain.kilometros_entrada,
      nivel_combustible: plain.nivel_combustible,
      renuncia_presupuesto: plain.renuncia_presupuesto,
      accion_imprevisto: plain.accion_imprevisto,
      recoger_piezas: plain.recoger_piezas,
      danos_carroceria: plain.danos_carroceria,
      coste_diario_estancia: plain.coste_diario_estancia,
      fotos_entrada: plain.fotos_entrada,
      fotos_salida: plain.fotos_salida,
      fotos_diagnostico: plain.fotos_diagnostico,
      estado: plain.estado,
      updated_at: plain.updated_at,
      deleted_at: plain.deleted_at,
      deleted_by: plain.deleted_by
    }
  }

  /**
   * Convierte línea de BD a Entity
   */
  private static lineaToDomain(record: LineaDBRecord): LineaOrdenEntity {
    return LineaOrdenEntity.create({
      id: record.id,
      ordenId: record.orden_id,
      tipo: record.tipo as TipoLinea,
      descripcion: record.descripcion,
      cantidad: record.cantidad,
      precioUnitario: Precio.create(record.precio_unitario),
      estado: record.estado as EstadoLineaOrden
    })
  }

  /**
   * Convierte línea de Entity a BD
   */
  static lineaToPersistence(entity: LineaOrdenEntity): Partial<LineaDBRecord> {
    const plain = entity.toPlainObject()

    return {
      id: plain.id,
      orden_id: plain.orden_id,
      tipo: plain.tipo,
      descripcion: plain.descripcion,
      cantidad: plain.cantidad,
      precio_unitario: plain.precio_unitario,
      estado: plain.estado
    }
  }

  /**
   * Parsea un campo JSON de fotos
   */
  private static parseFotos(fotosJson?: string): string[] {
    if (!fotosJson) return []
    try {
      const parsed = JSON.parse(fotosJson)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
}
