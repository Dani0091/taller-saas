/**
 * @fileoverview Mapper: Factura (BD <-> Entity)
 * @description Convierte entre registros de BD y entities de dominio
 *
 * RESPONSABILIDAD ÚNICA: Transformar datos
 * NO contiene lógica de negocio, solo transformación
 */

import { FacturaEntity, LineaFacturaEntity } from '@/domain/entities'
import { Precio, NumeroFactura, Retencion, NIF, Serie } from '@/domain/value-objects'
import { EstadoFactura, TipoFactura, EstadoVerifactu, TipoLineaFactura } from '@/domain/types'

/**
 * Tipo de registro de factura desde Supabase
 */
export interface FacturaDBRecord {
  id: string
  taller_id: string
  numero_factura?: string
  numero_serie?: string
  tipo: string
  estado: string
  orden_id?: string
  cliente_id: string
  cliente_nif?: string
  fecha_emision: string
  fecha_vencimiento?: string
  base_imponible: number
  iva: number
  iva_porcentaje: number
  total: number
  porcentaje_retencion: number
  metodo_pago?: string
  notas?: string
  condiciones_pago?: string
  persona_contacto?: string
  telefono_contacto?: string
  // Verifactu
  numero_verifactu?: string
  verifactu_numero?: string // Alias
  verifactu_url?: string
  estado_verifactu: string
  // Anulación
  factura_anulada_id?: string
  motivo_anulacion?: string
  // Auditoría
  created_at: string
  updated_at: string
  created_by?: string
  emitida_by?: string
  anulada_by?: string
  // Relaciones
  lineas?: LineaFacturaDBRecord[]
}

/**
 * Tipo de registro de línea de factura desde Supabase
 */
export interface LineaFacturaDBRecord {
  id: string
  factura_id: string
  tipo_linea: string
  descripcion: string
  referencia?: string
  cantidad: number
  precio_unitario: number
  descuento_porcentaje: number
  descuento_importe: number
  iva_porcentaje: number
  importe_total: number
  created_at: string
}

export class FacturaMapper {
  /**
   * Convierte de registro de BD a Entity de dominio
   */
  static toDomain(record: FacturaDBRecord): FacturaEntity {
    // Mapear líneas
    const lineas = (record.lineas || []).map(linea => this.lineaToDomain(linea))

    // Construir número de factura completo si existe
    let numeroFactura: NumeroFactura | undefined
    if (record.numero_factura) {
      try {
        numeroFactura = NumeroFactura.fromString(record.numero_factura)
      } catch (error) {
        // Si el número de factura es inválido, lo ignoramos (datos legacy)
        console.warn(`⚠️ Número de factura inválido (legacy): ${record.numero_factura}`, error)
        numeroFactura = undefined
      }
    }

    // NIF del cliente
    let clienteNIF: NIF | undefined
    if (record.cliente_nif) {
      try {
        clienteNIF = NIF.create(record.cliente_nif)
      } catch {
        // Si el NIF es inválido, lo ignoramos (datos legacy)
        clienteNIF = undefined
      }
    }

    // Retención (con protección para datos legacy)
    let retencion: Retencion
    if (record.porcentaje_retencion) {
      try {
        retencion = Retencion.create(record.porcentaje_retencion)
      } catch (error) {
        console.warn(`⚠️ Retención inválida (legacy): ${record.porcentaje_retencion}`, error)
        retencion = Retencion.ninguna()
      }
    } else {
      retencion = Retencion.ninguna()
    }

    return FacturaEntity.create({
      id: record.id,
      tallerId: record.taller_id,
      numeroFactura,
      tipo: this.mapTipoFactura(record.tipo),
      estado: this.mapEstadoFactura(record.estado),
      ordenId: record.orden_id,
      clienteId: record.cliente_id,
      clienteNIF,
      fechaEmision: new Date(record.fecha_emision),
      fechaVencimiento: record.fecha_vencimiento
        ? new Date(record.fecha_vencimiento)
        : undefined,
      lineas,
      retencion,
      // Verifactu
      numeroVerifactu: record.numero_verifactu || record.verifactu_numero,
      urlVerifactu: record.verifactu_url,
      estadoVerifactu: this.mapEstadoVerifactu(record.estado_verifactu),
      // Anulación
      facturaAnuladaId: record.factura_anulada_id,
      motivoAnulacion: record.motivo_anulacion,
      // Auditoría
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      createdBy: record.created_by || '',
      emitidaBy: record.emitida_by,
      anuladaBy: record.anulada_by
    })
  }

  /**
   * Convierte de Entity de dominio a registro de BD
   */
  static toPersistence(entity: FacturaEntity): Partial<FacturaDBRecord> {
    const plain = entity.toPlainObject()

    return {
      id: plain.id,
      taller_id: plain.taller_id,
      numero_factura: plain.numero_factura,
      numero_serie: plain.numero_factura
        ? plain.numero_factura.split('-')[0]
        : undefined,
      tipo: plain.tipo,
      estado: plain.estado,
      orden_id: plain.orden_id,
      cliente_id: plain.cliente_id,
      cliente_nif: plain.cliente_nif,
      fecha_emision: plain.fecha_emision,
      fecha_vencimiento: plain.fecha_vencimiento,
      porcentaje_retencion: plain.porcentaje_retencion,
      numero_verifactu: plain.numero_verifactu,
      verifactu_url: plain.url_verifactu,
      estado_verifactu: plain.estado_verifactu,
      factura_anulada_id: plain.factura_anulada_id,
      motivo_anulacion: plain.motivo_anulacion,
      updated_at: plain.updated_at,
      created_by: plain.created_by,
      emitida_by: plain.emitida_by,
      anulada_by: plain.anulada_by
    }
  }

  /**
   * Convierte línea de BD a Entity
   */
  private static lineaToDomain(record: LineaFacturaDBRecord): LineaFacturaEntity {
    // Protección para precios legacy
    let precioUnitario: Precio
    try {
      precioUnitario = Precio.create(record.precio_unitario)
    } catch (error) {
      console.warn(`⚠️ Precio unitario inválido (legacy): ${record.precio_unitario}`, error)
      precioUnitario = Precio.create(0)
    }

    let descuentoImporte: Precio | undefined
    if (record.descuento_importe) {
      try {
        descuentoImporte = Precio.create(record.descuento_importe)
      } catch (error) {
        console.warn(`⚠️ Descuento inválido (legacy): ${record.descuento_importe}`, error)
        descuentoImporte = undefined
      }
    }

    return LineaFacturaEntity.create({
      id: record.id,
      facturaId: record.factura_id,
      tipo: this.mapTipoLinea(record.tipo_linea),
      descripcion: record.descripcion,
      referencia: record.referencia,
      cantidad: record.cantidad,
      precioUnitario,
      descuentoPorcentaje: record.descuento_porcentaje || 0,
      descuentoImporte,
      ivaPorcentaje: record.iva_porcentaje
    })
  }

  /**
   * Convierte línea de Entity a BD
   */
  static lineaToPersistence(entity: LineaFacturaEntity): Partial<LineaFacturaDBRecord> {
    const plain = entity.toPlainObject()

    return {
      id: plain.id,
      factura_id: plain.factura_id,
      tipo_linea: plain.tipo,
      descripcion: plain.descripcion,
      referencia: plain.referencia,
      cantidad: plain.cantidad,
      precio_unitario: plain.precio_unitario,
      descuento_porcentaje: plain.descuento_porcentaje,
      descuento_importe: plain.descuento_importe,
      iva_porcentaje: plain.iva_porcentaje,
      importe_total: plain.importe_total
    }
  }

  /**
   * Mapea string de BD a enum TipoFactura
   */
  private static mapTipoFactura(tipo: string): TipoFactura {
    const map: Record<string, TipoFactura> = {
      normal: TipoFactura.NORMAL,
      rectificativa: TipoFactura.RECTIFICATIVA,
      simplificada: TipoFactura.SIMPLIFICADA,
      proforma: TipoFactura.PROFORMA
    }
    return map[tipo] || TipoFactura.NORMAL
  }

  /**
   * Mapea string de BD a enum EstadoFactura
   */
  private static mapEstadoFactura(estado: string): EstadoFactura {
    const map: Record<string, EstadoFactura> = {
      borrador: EstadoFactura.BORRADOR,
      emitida: EstadoFactura.EMITIDA,
      pagada: EstadoFactura.PAGADA,
      anulada: EstadoFactura.ANULADA,
      vencida: EstadoFactura.VENCIDA
    }
    return map[estado] || EstadoFactura.BORRADOR
  }

  /**
   * Mapea string de BD a enum EstadoVerifactu
   */
  private static mapEstadoVerifactu(estado: string): EstadoVerifactu {
    const map: Record<string, EstadoVerifactu> = {
      pendiente: EstadoVerifactu.PENDIENTE,
      procesando: EstadoVerifactu.PROCESANDO,
      firmado: EstadoVerifactu.FIRMADO,
      error: EstadoVerifactu.ERROR
    }
    return map[estado] || EstadoVerifactu.PENDIENTE
  }

  /**
   * Mapea string de BD a enum TipoLineaFactura
   */
  private static mapTipoLinea(tipo: string): TipoLineaFactura {
    const map: Record<string, TipoLineaFactura> = {
      mano_obra: TipoLineaFactura.MANO_OBRA,
      pieza: TipoLineaFactura.PIEZA,
      suplido: TipoLineaFactura.SUPLIDO,
      descuento: TipoLineaFactura.DESCUENTO,
      otro: TipoLineaFactura.OTRO
    }
    return map[tipo] || TipoLineaFactura.PIEZA
  }
}
