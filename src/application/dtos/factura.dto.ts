/**
 * @fileoverview DTOs de Factura
 * @description Data Transfer Objects para facturas
 *
 * Los DTOs son objetos planos que se usan para transferir datos
 * entre capas de la aplicación (especialmente de/hacia la UI)
 */

import { z } from 'zod'
import { EstadoFactura, TipoFactura, TipoLineaFactura, EstadoVerifactu } from '@/domain/types'

// ==================== SCHEMAS DE VALIDACIÓN ====================

/**
 * Schema para crear una línea de factura
 */
export const CrearLineaFacturaSchema = z.object({
  tipo: z.nativeEnum(TipoLineaFactura).default(TipoLineaFactura.PIEZA),
  descripcion: z.string().min(1, 'La descripción es obligatoria').max(500),
  referencia: z.string().max(100).optional(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0').max(10000),
  precioUnitario: z.number().nonnegative('El precio no puede ser negativo'),
  descuentoPorcentaje: z.number().min(0).max(100).default(0),
  descuentoImporte: z.number().nonnegative().optional(),
  ivaPorcentaje: z.number().min(0).max(100).default(21)
})

/**
 * Schema para crear un borrador de factura
 */
export const CrearBorradorFacturaSchema = z.object({
  clienteId: z.string().uuid('ID de cliente inválido'),
  clienteNIF: z.string().max(20).optional(),
  ordenId: z.string().uuid('ID de orden inválido').optional(),
  tipo: z.nativeEnum(TipoFactura).default(TipoFactura.NORMAL),
  fechaEmision: z.string().datetime().optional(),
  fechaVencimiento: z.string().datetime().optional(),
  porcentajeRetencion: z.number().min(0).max(100).default(0),
  lineas: z.array(CrearLineaFacturaSchema).min(1, 'Debe tener al menos una línea')
})

/**
 * Schema para actualizar un borrador de factura
 */
export const ActualizarBorradorFacturaSchema = z.object({
  clienteId: z.string().uuid('ID de cliente inválido').optional(),
  clienteNIF: z.string().max(20).optional(),
  fechaEmision: z.string().datetime().optional(),
  fechaVencimiento: z.string().datetime().optional(),
  porcentajeRetencion: z.number().min(0).max(100).optional(),
  lineas: z.array(CrearLineaFacturaSchema).optional()
})

/**
 * Schema para emitir una factura
 */
export const EmitirFacturaSchema = z.object({
  facturaId: z.string().uuid('ID de factura inválido'),
  serie: z.string().max(10).default('F'),
  año: z.number().int().min(2020).max(2100).optional()
})

/**
 * Schema para anular una factura
 */
export const AnularFacturaSchema = z.object({
  facturaId: z.string().uuid('ID de factura inválido'),
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500)
})

/**
 * Schema para marcar factura como pagada
 */
export const MarcarPagadaFacturaSchema = z.object({
  facturaId: z.string().uuid('ID de factura inválido')
})

/**
 * Schema para filtros de búsqueda de facturas
 */
export const FiltrosFacturaSchema = z.object({
  estado: z.nativeEnum(EstadoFactura).optional(),
  tipo: z.nativeEnum(TipoFactura).optional(),
  clienteId: z.string().uuid().optional(),
  ordenId: z.string().uuid().optional(),
  estadoVerifactu: z.nativeEnum(EstadoVerifactu).optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
  vencidas: z.boolean().optional(),
  busqueda: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20)
})

/**
 * Schema para crear borrador desde orden
 */
export const CrearBorradorDesdeOrdenSchema = z.object({
  ordenId: z.string().uuid('ID de orden inválido'),
  clienteNIF: z.string().max(20).optional(),
  porcentajeRetencion: z.number().min(0).max(100).default(0),
  fechaVencimiento: z.string().datetime().optional()
})

// ==================== TIPOS (INFERIDOS DE LOS SCHEMAS) ====================

export type CrearBorradorFacturaDTO = z.infer<typeof CrearBorradorFacturaSchema>
export type ActualizarBorradorFacturaDTO = z.infer<typeof ActualizarBorradorFacturaSchema>
export type EmitirFacturaDTO = z.infer<typeof EmitirFacturaSchema>
export type AnularFacturaDTO = z.infer<typeof AnularFacturaSchema>
export type MarcarPagadaFacturaDTO = z.infer<typeof MarcarPagadaFacturaSchema>
export type FiltrosFacturaDTO = z.infer<typeof FiltrosFacturaSchema>
export type CrearLineaFacturaDTO = z.infer<typeof CrearLineaFacturaSchema>
export type CrearBorradorDesdeOrdenDTO = z.infer<typeof CrearBorradorDesdeOrdenSchema>

// ==================== DTOs DE RESPUESTA ====================

/**
 * DTO de línea de factura para respuestas
 */
export interface LineaFacturaResponseDTO {
  id: string
  facturaId: string
  tipo: TipoLineaFactura
  descripcion: string
  referencia?: string
  cantidad: number
  precioUnitario: number
  precioUnitarioFormateado: string
  descuentoPorcentaje: number
  descuentoImporte?: number
  descuentoImporteFormateado?: string
  ivaPorcentaje: number
  subtotal: number
  subtotalFormateado: string
  descuentoCalculado: number
  descuentoCalculadoFormateado: string
  baseImponible: number
  baseImponibleFormateada: string
  impuestoImporte: number
  impuestoImporteFormateado: string
  total: number
  totalFormateado: string
}

/**
 * DTO de factura para respuestas (completo)
 */
export interface FacturaResponseDTO {
  id: string
  tallerId: string
  numeroFactura?: string
  tipo: TipoFactura
  estado: EstadoFactura
  ordenId?: string
  clienteId: string
  clienteNIF?: string
  fechaEmision: string
  fechaVencimiento?: string
  lineas: LineaFacturaResponseDTO[]
  baseImponible: number
  baseImponibleFormateada: string
  totalImpuestos: number
  totalImpuestosFormateado: string
  importeRetencion: number
  importeRetencionFormateado: string
  porcentajeRetencion: number
  total: number
  totalFormateado: string
  numeroVerifactu?: string
  urlVerifactu?: string
  estadoVerifactu?: EstadoVerifactu
  motivoAnulacion?: string
  puedeEmitirse: boolean
  puedeModificarse: boolean
  puedeAnularse: boolean
  isVencida: boolean
  createdAt: string
  updatedAt: string
}

/**
 * DTO simplificado de factura para listados
 */
export interface FacturaListadoDTO {
  id: string
  numeroFactura?: string
  tipo: TipoFactura
  estado: EstadoFactura
  clienteId: string
  clienteNIF?: string
  fechaEmision: string
  fechaVencimiento?: string
  total: number
  totalFormateado: string
  isVencida: boolean
  estadoVerifactu?: EstadoVerifactu
}

/**
 * DTO de resultado paginado para facturas
 */
export interface FacturasPaginadasDTO {
  data: FacturaListadoDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
