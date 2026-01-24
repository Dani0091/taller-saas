/**
 * @fileoverview DTOs de Dashboard
 * @description Data Transfer Objects para métricas del dashboard
 */

import { z } from 'zod'

// ==================== SCHEMAS DE VALIDACIÓN ====================

/**
 * Schema para filtros de dashboard (futuro)
 */
export const FiltrosDashboardSchema = z.object({
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional()
})

// ==================== TIPOS (INFERIDOS DE LOS SCHEMAS) ====================

export type FiltrosDashboardDTO = z.infer<typeof FiltrosDashboardSchema>

// ==================== DTOs DE RESPUESTA ====================

/**
 * DTO de métricas del dashboard
 * Todas las métricas vienen PRE-CALCULADAS desde el backend
 */
export interface MetricasDashboardDTO {
  // Métricas operativas
  ordenesHoy: number
  pendientes: number
  enProgreso: number
  completadas: number

  // Métricas financieras (mes actual)
  facturadoMes: number
  baseImponibleMes: number
  ivaRecaudadoMes: number

  // IVA trimestral
  ivaTrimestre: number

  // Clientes
  clientesActivos: number

  // Información del usuario
  nombreUsuario?: string
  nombreTaller?: string
}
