/**
 * @fileoverview Port: Repositorio de Citas
 * @description Interface que define el contrato del repositorio de citas
 *
 * PRINCIPIO DE INVERSIÓN DE DEPENDENCIAS:
 * Los casos de uso dependen de esta interface, NO de la implementación concreta.
 * Esto permite cambiar fácilmente de Supabase a otra BD sin afectar la lógica.
 */

import { CitaEntity } from '@/domain/entities'
import { TipoCita, EstadoCita } from '@/domain/types'
import type { PaginacionOpciones, ResultadoPaginado } from './repository.types'

/**
 * Filtros para búsqueda de citas
 */
export interface CitaFiltros {
  clienteId?: string
  vehiculoId?: string
  ordenId?: string
  tipo?: TipoCita
  estado?: EstadoCita
  fechaDesde?: Date
  fechaHasta?: Date
  soloHoy?: boolean
  soloVencidas?: boolean
  incluirEliminadas?: boolean
}

/**
 * Interface del repositorio de citas
 *
 * IMPORTANTE: Todos los métodos deben incluir el tallerId para multi-tenancy
 */
export interface ICitaRepository {
  /**
   * Crea una nueva cita
   */
  crear(cita: CitaEntity, tallerId: string): Promise<CitaEntity>

  /**
   * Obtiene una cita por su ID
   * IMPORTANTE: Incluye filtro de seguridad por tallerId
   */
  obtenerPorId(id: string, tallerId: string): Promise<CitaEntity | null>

  /**
   * Actualiza una cita existente
   */
  actualizar(cita: CitaEntity, tallerId: string): Promise<CitaEntity>

  /**
   * Elimina una cita (soft delete)
   */
  eliminar(id: string, tallerId: string): Promise<void>

  /**
   * Restaura una cita eliminada
   */
  restaurar(id: string, tallerId: string): Promise<CitaEntity>

  /**
   * Lista citas con filtros y paginación
   */
  listar(
    filtros: CitaFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<CitaEntity>>

  /**
   * Obtiene citas de un cliente específico
   */
  listarPorCliente(
    clienteId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>>

  /**
   * Obtiene citas de un vehículo específico
   */
  listarPorVehiculo(
    vehiculoId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>>

  /**
   * Obtiene citas de una orden específica
   */
  listarPorOrden(
    ordenId: string,
    tallerId: string
  ): Promise<CitaEntity[]>

  /**
   * Obtiene citas de hoy
   */
  listarHoy(
    tallerId: string
  ): Promise<CitaEntity[]>

  /**
   * Obtiene citas por rango de fechas
   */
  listarPorRangoFechas(
    fechaDesde: Date,
    fechaHasta: Date,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>>

  /**
   * Obtiene citas pendientes
   */
  listarPendientes(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>>

  /**
   * Obtiene citas confirmadas
   */
  listarConfirmadas(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>>

  /**
   * Obtiene citas vencidas (pasadas y no completadas)
   */
  listarVencidas(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>>

  /**
   * Obtiene citas activas (no eliminadas)
   */
  listarActivas(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>>

  /**
   * Obtiene citas eliminadas
   */
  listarEliminadas(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<CitaEntity>>

  /**
   * Cuenta citas por estado
   */
  contarPorEstado(tallerId: string): Promise<Record<EstadoCita, number>>

  /**
   * Cuenta citas por tipo
   */
  contarPorTipo(tallerId: string): Promise<Record<TipoCita, number>>

  /**
   * Cuenta citas totales y por estado
   */
  contarEstadisticas(tallerId: string): Promise<{
    total: number
    pendientes: number
    confirmadas: number
    completadas: number
    canceladas: number
    hoy: number
    vencidas: number
    eliminadas: number
  }>

  /**
   * Marca recordatorio como enviado
   */
  marcarRecordatorioEnviado(id: string, tallerId: string): Promise<void>
}
