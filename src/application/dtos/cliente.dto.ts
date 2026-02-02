/**
 * @fileoverview DTOs de Cliente
 * @description Data Transfer Objects para clientes
 *
 * Los DTOs son objetos planos que se usan para transferir datos
 * entre capas de la aplicación (especialmente de/hacia la UI)
 */

import { z } from 'zod'
import { EstadoCliente, TipoCliente, FormaPago } from '@/domain/types'

// ==================== SCHEMAS DE VALIDACIÓN ====================

/**
 * Schema para crear un cliente
 */
export const CrearClienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(255),
  apellidos: z.string().max(255).optional(),
  nif: z.string().min(9, 'El NIF debe tener al menos 9 caracteres').max(20),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  direccion: z.string().max(500).optional().or(z.literal('')),
  ciudad: z.string().max(100).optional().or(z.literal('')),
  provincia: z.string().max(100).optional().or(z.literal('')),
  codigoPostal: z.string().max(10).optional().or(z.literal('')),
  pais: z.string().max(100).default('España'),
  notas: z.string().max(2000).optional().or(z.literal('')),
  tipoCliente: z.nativeEnum(TipoCliente).default(TipoCliente.PARTICULAR),
  requiereAutorizacion: z.boolean().default(false),
  empresaRenting: z.string().max(100).optional().or(z.literal('')),
  iban: z.string().max(34).optional().or(z.literal('')),
  formaPago: z.nativeEnum(FormaPago).default(FormaPago.EFECTIVO),
  diasPago: z.number().int().min(0).max(365).default(0),
  limiteCredito: z.number().min(0).optional()
})

/**
 * Schema para actualizar un cliente
 */
export const ActualizarClienteSchema = z.object({
  nombre: z.string().min(1).max(255).optional(),
  apellidos: z.string().max(255).optional().or(z.literal('')),
  nif: z.string().min(9).max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  direccion: z.string().max(500).optional().or(z.literal('')),
  ciudad: z.string().max(100).optional().or(z.literal('')),
  provincia: z.string().max(100).optional().or(z.literal('')),
  codigoPostal: z.string().max(10).optional().or(z.literal('')),
  pais: z.string().max(100).optional(),
  notas: z.string().max(2000).optional().or(z.literal('')),
  tipoCliente: z.nativeEnum(TipoCliente).optional(),
  requiereAutorizacion: z.boolean().optional(),
  empresaRenting: z.string().max(100).optional().or(z.literal('')),
  iban: z.string().max(34).optional().or(z.literal('')),
  formaPago: z.nativeEnum(FormaPago).optional(),
  diasPago: z.number().int().min(0).max(365).optional(),
  limiteCredito: z.number().min(0).optional()
})

/**
 * Schema para cambiar el estado de un cliente
 */
export const CambiarEstadoClienteSchema = z.object({
  estado: z.nativeEnum(EstadoCliente)
})

/**
 * Schema para filtros de búsqueda de clientes
 */
export const FiltrosClienteSchema = z.object({
  estado: z.nativeEnum(EstadoCliente).optional(),
  tipoCliente: z.nativeEnum(TipoCliente).optional(),
  busqueda: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  incluirEliminados: z.boolean().default(false),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20)
})

/**
 * Schema para buscar cliente por NIF
 */
export const BuscarPorNIFSchema = z.object({
  nif: z.string().min(9).max(20)
})

// ==================== TIPOS (INFERIDOS DE LOS SCHEMAS) ====================

export type CrearClienteDTO = z.infer<typeof CrearClienteSchema>
export type ActualizarClienteDTO = z.infer<typeof ActualizarClienteSchema>
export type CambiarEstadoClienteDTO = z.infer<typeof CambiarEstadoClienteSchema>
export type FiltrosClienteDTO = z.infer<typeof FiltrosClienteSchema>
export type BuscarPorNIFDTO = z.infer<typeof BuscarPorNIFSchema>

// ==================== DTOs DE RESPUESTA ====================

/**
 * DTO de cliente para respuestas (completo)
 */
export interface ClienteResponseDTO {
  id: string
  tallerId: string
  nombre: string
  apellidos?: string
  nombreCompleto: string
  nif: string
  nifMasked: string
  email?: string
  emailMasked?: string
  telefono?: string
  telefonoFormatted?: string
  direccion?: string
  ciudad?: string
  provincia?: string
  codigoPostal?: string
  pais: string
  notas?: string
  estado: EstadoCliente
  tipoCliente: TipoCliente
  requiereAutorizacion: boolean
  empresaRenting?: string
  iban?: string
  ibanMasked?: string
  ibanFormatted?: string
  formaPago: FormaPago
  diasPago: number
  limiteCredito?: number
  isActivo: boolean
  isEliminado: boolean
  isParticular: boolean
  isEmpresa: boolean
  tieneContactoCompleto: boolean
  tieneDireccionCompleta: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

/**
 * DTO simplificado de cliente para listados
 */
export interface ClienteListadoDTO {
  id: string
  nombre: string
  nombreCompleto: string
  nif: string
  nifMasked: string
  email?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  tipoCliente: TipoCliente
  estado: EstadoCliente
  isActivo: boolean
  created_at: string
}

/**
 * DTO de resultado paginado para clientes
 */
export interface ClientesPaginadosDTO {
  data: ClienteListadoDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * DTO de estadísticas de clientes
 */
export interface ClienteEstadisticasDTO {
  totalActivos: number
  totalInactivos: number
  totalEliminados: number
  porTipo: Record<TipoCliente, number>
  porEstado: Record<EstadoCliente, number>
}
