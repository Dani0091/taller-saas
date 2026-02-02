/**
 * @fileoverview DTOs de Vehículo
 * @description Data Transfer Objects para vehículos
 *
 * Los DTOs son objetos planos que se usan para transferir datos
 * entre capas de la aplicación (especialmente de/hacia la UI)
 */

import { z } from 'zod'
import { TipoCombustible } from '@/domain/types'

// ==================== SCHEMAS DE VALIDACIÓN ====================

/**
 * Schema para crear un vehículo
 */
export const CrearVehiculoSchema = z.object({
  clienteId: z.string().uuid().optional(),
  matricula: z.string().min(4, 'La matrícula debe tener al menos 4 caracteres').max(20),
  marca: z.string().max(100).optional().or(z.literal('')),
  modelo: z.string().max(100).optional().or(z.literal('')),
  año: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().max(50).optional().or(z.literal('')),
  kilometros: z.number().int().min(0).optional(),
  vin: z.string().length(17).optional().or(z.literal('')),
  bastidorVin: z.string().max(50).optional().or(z.literal('')),
  numeroMotor: z.string().max(50).optional().or(z.literal('')),
  tipoCombustible: z.nativeEnum(TipoCombustible).optional(),
  carroceria: z.string().max(50).optional().or(z.literal('')),
  potenciaCv: z.number().int().min(0).max(2000).optional(),
  cilindrada: z.number().int().min(0).max(10000).optional(),
  emisiones: z.string().max(50).optional().or(z.literal('')),
  fechaMatriculacion: z.string().optional().or(z.literal('')), // ISO date string
  notas: z.string().max(2000).optional().or(z.literal('')),
  fichaTecnicaUrl: z.string().url().optional().or(z.literal('')),
  permisoCirculacionUrl: z.string().url().optional().or(z.literal(''))
})

/**
 * Schema para actualizar un vehículo
 */
export const ActualizarVehiculoSchema = z.object({
  clienteId: z.string().uuid().optional().or(z.literal('')),
  matricula: z.string().min(4).max(20).optional(),
  marca: z.string().max(100).optional().or(z.literal('')),
  modelo: z.string().max(100).optional().or(z.literal('')),
  año: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().max(50).optional().or(z.literal('')),
  kilometros: z.number().int().min(0).optional(),
  vin: z.string().length(17).optional().or(z.literal('')),
  bastidorVin: z.string().max(50).optional().or(z.literal('')),
  numeroMotor: z.string().max(50).optional().or(z.literal('')),
  tipoCombustible: z.nativeEnum(TipoCombustible).optional(),
  carroceria: z.string().max(50).optional().or(z.literal('')),
  potenciaCv: z.number().int().min(0).max(2000).optional(),
  cilindrada: z.number().int().min(0).max(10000).optional(),
  emisiones: z.string().max(50).optional().or(z.literal('')),
  fechaMatriculacion: z.string().optional().or(z.literal('')),
  notas: z.string().max(2000).optional().or(z.literal('')),
  fichaTecnicaUrl: z.string().url().optional().or(z.literal('')),
  permisoCirculacionUrl: z.string().url().optional().or(z.literal(''))
})

/**
 * Schema para filtros de búsqueda de vehículos
 */
export const FiltrosVehiculoSchema = z.object({
  clienteId: z.string().uuid().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  año: z.number().int().optional(),
  tipoCombustible: z.nativeEnum(TipoCombustible).optional(),
  busqueda: z.string().optional(),
  incluirEliminados: z.boolean().default(false),
  soloSinCliente: z.boolean().default(false),
  soloConDatosCompletos: z.boolean().default(false),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20)
})

/**
 * Schema para buscar vehículo por matrícula
 */
export const BuscarPorMatriculaSchema = z.object({
  matricula: z.string().min(4).max(20)
})

/**
 * Schema para buscar vehículo por VIN
 */
export const BuscarPorVINSchema = z.object({
  vin: z.string().length(17)
})

// ==================== TIPOS (INFERIDOS DE LOS SCHEMAS) ====================

export type CrearVehiculoDTO = z.infer<typeof CrearVehiculoSchema>
export type ActualizarVehiculoDTO = z.infer<typeof ActualizarVehiculoSchema>
export type FiltrosVehiculoDTO = z.infer<typeof FiltrosVehiculoSchema>
export type BuscarPorMatriculaDTO = z.infer<typeof BuscarPorMatriculaSchema>
export type BuscarPorVINDTO = z.infer<typeof BuscarPorVINSchema>

// ==================== DTOs DE RESPUESTA ====================

/**
 * DTO de respuesta de vehículo completo
 */
export interface VehiculoResponseDTO {
  id: string
  tallerId: string
  clienteId?: string
  matricula: string
  matriculaFormateada: string
  marca?: string
  modelo?: string
  año?: number
  color?: string
  kilometros?: number
  kilometrosFormateados?: string
  vin?: string
  vinMasked?: string
  vinFormateado?: string
  bastidorVin?: string
  numeroMotor?: string
  tipoCombustible?: TipoCombustible
  carroceria?: string
  potenciaCv?: number
  cilindrada?: number
  emisiones?: string
  fechaMatriculacion?: string
  notas?: string
  fichaTecnicaUrl?: string
  permisoCirculacionUrl?: string
  descripcionCompleta: string
  isEliminado: boolean
  tieneCliente: boolean
  tieneVIN: boolean
  tieneDatosCompletos: boolean
  ocrProcesado: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * DTO de respuesta de vehículo para listados (versión resumida)
 */
export interface VehiculoListadoDTO {
  id: string
  matricula: string
  matriculaFormateada: string
  marca?: string
  modelo?: string
  año?: number
  color?: string
  kilometros?: number
  vin?: string
  tipoCombustible?: TipoCombustible
  descripcionCompleta: string
  tieneCliente: boolean
  tieneDatosCompletos: boolean
}

/**
 * DTO de respuesta de vehículos paginados
 */
export interface VehiculosPaginadosDTO {
  data: VehiculoListadoDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * DTO de estadísticas de vehículos
 */
export interface VehiculoEstadisticasDTO {
  total: number
  conCliente: number
  sinCliente: number
  conDatosCompletos: number
  eliminados: number
  porMarca: Record<string, number>
  porTipoCombustible: Record<TipoCombustible, number>
}
