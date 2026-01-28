/**
 * @fileoverview Port: Repositorio de Órdenes
 * @description Interface que define el contrato del repositorio de órdenes
 *
 * PRINCIPIO DE INVERSIÓN DE DEPENDENCIAS:
 * Los casos de uso dependen de esta interface, NO de la implementación concreta.
 * Esto permite cambiar fácilmente de Supabase a otra BD sin afectar la lógica.
 *
 * VENTAJA: Si mañana cambias Supabase por PostgreSQL directo, solo cambias
 * la implementación, NO los casos de uso ni el dominio.
 */

import type { PaginacionOpciones, ResultadoPaginado } from './repository.types'

import { OrdenEntity } from '@/domain/entities'
import { EstadoOrden } from '@/domain/types'

/**
 * Filtros para búsqueda de órdenes
 */
export interface OrdenFiltros {
  estado?: EstadoOrden
  clienteId?: string
  vehiculoId?: string
  operarioId?: string
  fechaDesde?: Date
  fechaHasta?: Date
  busqueda?: string // Búsqueda por número o descripción
}

/**
 * Interface del repositorio de órdenes
 *
 * IMPORTANTE: Todos los métodos deben incluir el tallerId para multi-tenancy
 */
export interface IOrdenRepository {
  /**
   * Crea una nueva orden
   */
  crear(orden: OrdenEntity, tallerId: string): Promise<OrdenEntity>

  /**
   * Obtiene una orden por su ID
   * IMPORTANTE: Incluye filtro de seguridad por tallerId
   */
  obtenerPorId(id: string, tallerId: string): Promise<OrdenEntity | null>

  /**
   * Obtiene una orden por su número
   */
  obtenerPorNumero(numeroOrden: string, tallerId: string): Promise<OrdenEntity | null>

  /**
   * Actualiza una orden existente
   */
  actualizar(orden: OrdenEntity, tallerId: string): Promise<OrdenEntity>

  /**
   * Elimina una orden (soft delete)
   */
  eliminar(id: string, tallerId: string, userId: string): Promise<void>

  /**
   * Lista órdenes con filtros y paginación
   */
  listar(
    filtros: OrdenFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<OrdenEntity>>

  /**
   * Cuenta órdenes por estado
   */
  contarPorEstado(tallerId: string): Promise<Record<EstadoOrden, number>>

  /**
   * Obtiene el último número de orden generado para un taller
   * Útil para generar el siguiente número
   */
  obtenerUltimoNumeroOrden(tallerId: string, año: number): Promise<string | null>

  /**
   * Verifica si existe una orden con un número específico
   */
  existeNumeroOrden(numeroOrden: string, tallerId: string): Promise<boolean>

  /**
   * Obtiene todas las órdenes de un cliente
   */
  listarPorCliente(
    clienteId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<OrdenEntity>>

  /**
   * Obtiene todas las órdenes de un vehículo
   */
  listarPorVehiculo(
    vehiculoId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<OrdenEntity>>

  /**
   * Obtiene todas las órdenes asignadas a un operario
   */
  listarPorOperario(
    operarioId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<OrdenEntity>>
}
