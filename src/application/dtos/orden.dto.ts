/**
 * @fileoverview DTOs de Orden
 * @description Data Transfer Objects para órdenes de reparación
 *
 * Los DTOs son objetos planos que se usan para transferir datos
 * entre capas de la aplicación (especialmente de/hacia la UI)
 */

import { z } from 'zod'
import { EstadoOrden, TipoLinea, EstadoLineaOrden, AccionImprevisto } from '@/domain/types'

// ==================== SCHEMAS DE VALIDACIÓN ====================

/**
 * Schema para crear una línea de orden
 */
export const CrearLineaOrdenSchema = z.object({
  tipo: z.nativeEnum(TipoLinea),
  descripcion: z.string().min(1, 'La descripción es obligatoria').max(500),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0').max(10000),
  precioUnitario: z.number().nonnegative('El precio no puede ser negativo')
})

/**
 * Schema para crear una orden
 */
export const CrearOrdenSchema = z.object({
  clienteId: z.string().uuid('ID de cliente inválido'),
  vehiculoId: z.string().uuid('ID de vehículo inválido'),
  operarioId: z.string().uuid('ID de operario inválido').optional(),
  descripcionProblema: z.string().max(2000).optional(),
  diagnostico: z.string().max(2000).optional(),
  trabajosRealizados: z.string().max(2000).optional(),
  notas: z.string().max(1000).optional(),
  presupuestoAprobadoPorCliente: z.boolean().default(false),
  tiempoEstimadoHoras: z.number().min(0).max(1000).optional(),
  tiempoRealHoras: z.number().min(0).max(1000).optional(),
  kilometrosEntrada: z.number().int().min(0).max(9999999).optional(),
  nivelCombustible: z.string().max(50).optional(),
  renunciaPresupuesto: z.boolean().default(false),
  accionImprevisto: z.nativeEnum(AccionImprevisto).default(AccionImprevisto.AVISAR),
  recogerPiezas: z.boolean().default(false),
  danosCarroceria: z.string().max(1000).optional(),
  costeDiarioEstancia: z.number().min(0).optional(),
  fotosEntrada: z.array(z.string().url()).optional(),
  fotosSalida: z.array(z.string().url()).optional(),
  fotosDiagnostico: z.array(z.string().url()).optional(),
  lineas: z.array(CrearLineaOrdenSchema).optional()
})

/**
 * Schema para actualizar una orden
 */
export const ActualizarOrdenSchema = CrearOrdenSchema.partial()

/**
 * Schema para cambiar el estado de una orden
 */
export const CambiarEstadoOrdenSchema = z.object({
  estado: z.nativeEnum(EstadoOrden)
})

/**
 * Schema para filtros de búsqueda
 */
export const FiltrosOrdenSchema = z.object({
  estado: z.nativeEnum(EstadoOrden).optional(),
  clienteId: z.string().uuid().optional(),
  vehiculoId: z.string().uuid().optional(),
  operarioId: z.string().uuid().optional(),
  fechaDesde: z.string().datetime().optional(),
  fechaHasta: z.string().datetime().optional(),
  busqueda: z.string().optional(), // Búsqueda por número de orden o descripción
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20)
})

// ==================== TIPOS (INFERIDOS DE LOS SCHEMAS) ====================

export type CrearOrdenDTO = z.infer<typeof CrearOrdenSchema>
export type ActualizarOrdenDTO = z.infer<typeof ActualizarOrdenSchema>
export type CambiarEstadoOrdenDTO = z.infer<typeof CambiarEstadoOrdenSchema>
export type FiltrosOrdenDTO = z.infer<typeof FiltrosOrdenSchema>
export type CrearLineaOrdenDTO = z.infer<typeof CrearLineaOrdenSchema>

// ==================== DTOs DE RESPUESTA ====================

/**
 * DTO de línea de orden para respuestas
 */
export interface LineaOrdenResponseDTO {
  id: string
  ordenId: string
  tipo: TipoLinea
  descripcion: string
  cantidad: number
  precioUnitario: number
  precioUnitarioFormateado: string
  estado: EstadoLineaOrden
  subtotal: number
  subtotalFormateado: string
  isManoObra: boolean
  isPieza: boolean
}

/**
 * DTO de orden completa para respuestas
 */
export interface OrdenResponseDTO {
  id: string
  tallerId: string
  numeroOrden?: string
  clienteId: string
  vehiculoId: string
  operarioId?: string
  facturaId?: string
  descripcionProblema?: string
  diagnostico?: string
  trabajosRealizados?: string
  notas?: string
  presupuestoAprobado: boolean
  tiempoEstimado?: number
  tiempoReal?: number
  kilometrosEntrada?: number
  estado: EstadoOrden
  lineas: LineaOrdenResponseDTO[]
  subtotalManoObra: number
  subtotalManoObraFormateado: string
  subtotalPiezas: number
  subtotalPiezasFormateado: string
  subtotal: number
  subtotalFormateado: string
  iva: number
  ivaFormateado: string
  total: number
  totalFormateado: string
  puedeFacturarse: boolean
  puedeModificarse: boolean
  isFacturada: boolean
  createdAt: string
  updatedAt: string
}

/**
 * DTO resumido de orden para listados
 */
export interface OrdenListItemDTO {
  id: string
  numeroOrden?: string
  clienteId: string
  vehiculoId: string
  estado: EstadoOrden
  total: number
  totalFormateado: string
  cantidadLineas: number
  isFacturada: boolean
  createdAt: string
  updatedAt: string
}

/**
 * DTO de respuesta paginada
 */
export interface OrdenPaginatedResponseDTO {
  data: OrdenListItemDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * DTO de totales calculados de una orden
 *
 * IMPORTANTE: Todos los valores son pre-calculados en el servidor.
 * El frontend NUNCA debe calcular estos valores, solo mostrarlos.
 */
export interface TotalesOrdenDTO {
  /** Subtotal de mano de obra (pre-calculado en backend) */
  manoObra: number
  /** Subtotal de piezas/recambios (pre-calculado en backend) */
  piezas: number
  /** Subtotal de servicios (pre-calculado en backend) */
  servicios: number
  /** Subtotal general antes de IVA (pre-calculado en backend) */
  subtotal: number
  /** IVA aplicado (pre-calculado en backend con porcentaje de taller_config) */
  iva: number
  /** Total final con IVA (pre-calculado en backend) */
  total: number
  /** Porcentaje de retención si aplica (pre-calculado en backend) */
  retencion?: number
}
