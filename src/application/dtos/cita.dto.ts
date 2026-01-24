/**
 * @fileoverview DTOs de Cita
 * @description Data Transfer Objects para citas
 *
 * Los DTOs son objetos planos que se usan para transferir datos
 * entre capas de la aplicación (especialmente de/hacia la UI)
 */

import { z } from 'zod'
import { TipoCita, EstadoCita } from '@/domain/types'

// ==================== SCHEMAS DE VALIDACIÓN ====================

/**
 * Schema para crear una cita
 */
export const CrearCitaSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio').max(200),
  descripcion: z.string().max(2000).optional().or(z.literal('')),
  tipo: z.nativeEnum(TipoCita).default(TipoCita.CITA),
  fechaInicio: z.string(), // ISO date string
  fechaFin: z.string().optional().or(z.literal('')), // ISO date string
  todoElDia: z.boolean().default(false),
  clienteId: z.string().uuid().optional().or(z.literal('')),
  vehiculoId: z.string().uuid().optional().or(z.literal('')),
  ordenId: z.string().uuid().optional().or(z.literal('')),
  notificarCliente: z.boolean().default(false),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hexadecimal inválido').default('#3b82f6')
})

/**
 * Schema para actualizar una cita
 */
export const ActualizarCitaSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(2000).optional().or(z.literal('')),
  tipo: z.nativeEnum(TipoCita).optional(),
  fechaInicio: z.string().optional(), // ISO date string
  fechaFin: z.string().optional().or(z.literal('')),
  todoElDia: z.boolean().optional(),
  clienteId: z.string().uuid().optional().or(z.literal('')),
  vehiculoId: z.string().uuid().optional().or(z.literal('')),
  ordenId: z.string().uuid().optional().or(z.literal('')),
  notificarCliente: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
})

/**
 * Schema para cambiar el estado de una cita
 */
export const CambiarEstadoCitaSchema = z.object({
  estado: z.nativeEnum(EstadoCita)
})

/**
 * Schema para filtros de búsqueda de citas
 */
export const FiltrosCitaSchema = z.object({
  clienteId: z.string().uuid().optional(),
  vehiculoId: z.string().uuid().optional(),
  ordenId: z.string().uuid().optional(),
  tipo: z.nativeEnum(TipoCita).optional(),
  estado: z.nativeEnum(EstadoCita).optional(),
  fechaDesde: z.string().optional(), // ISO date string
  fechaHasta: z.string().optional(), // ISO date string
  soloHoy: z.boolean().default(false),
  soloVencidas: z.boolean().default(false),
  incluirEliminadas: z.boolean().default(false),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20)
})

// ==================== TIPOS (INFERIDOS DE LOS SCHEMAS) ====================

export type CrearCitaDTO = z.infer<typeof CrearCitaSchema>
export type ActualizarCitaDTO = z.infer<typeof ActualizarCitaSchema>
export type CambiarEstadoCitaDTO = z.infer<typeof CambiarEstadoCitaSchema>
export type FiltrosCitaDTO = z.infer<typeof FiltrosCitaSchema>

// ==================== DTOs DE RESPUESTA ====================

/**
 * DTO de respuesta de cita completa
 */
export interface CitaResponseDTO {
  id: string
  tallerId: string
  titulo: string
  descripcion?: string
  tipo: TipoCita
  fechaInicio: string
  fechaFin?: string
  todoElDia: boolean
  clienteId?: string
  vehiculoId?: string
  ordenId?: string
  estado: EstadoCita
  notificarCliente: boolean
  recordatorioEnviado: boolean
  color: string
  duracionMinutos?: number
  isEliminada: boolean
  isConfirmada: boolean
  isCompletada: boolean
  isCancelada: boolean
  isPendiente: boolean
  isVencida: boolean
  isHoy: boolean
  tieneCliente: boolean
  tieneVehiculo: boolean
  tieneOrden: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
  createdBy?: string
}

/**
 * DTO de respuesta de cita para listados (versión resumida)
 */
export interface CitaListadoDTO {
  id: string
  titulo: string
  descripcion?: string
  tipo: TipoCita
  fechaInicio: string
  fechaFin?: string
  todoElDia: boolean
  estado: EstadoCita
  color: string
  duracionMinutos?: number
  isVencida: boolean
  isHoy: boolean
  tieneCliente: boolean
  tieneVehiculo: boolean
  // Datos relacionados para UI (computed fields)
  clienteNombre?: string
  vehiculoMatricula?: string
}

/**
 * DTO de respuesta de citas paginadas
 */
export interface CitasPaginadasDTO {
  data: CitaListadoDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * DTO de estadísticas de citas
 */
export interface CitaEstadisticasDTO {
  total: number
  pendientes: number
  confirmadas: number
  completadas: number
  canceladas: number
  hoy: number
  vencidas: number
  eliminadas: number
  porEstado: Record<EstadoCita, number>
  porTipo: Record<TipoCita, number>
}
