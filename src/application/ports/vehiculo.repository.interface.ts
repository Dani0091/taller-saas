/**
 * @fileoverview Port: Repositorio de Vehículos
 * @description Interface que define el contrato del repositorio de vehículos
 *
 * PRINCIPIO DE INVERSIÓN DE DEPENDENCIAS:
 * Los casos de uso dependen de esta interface, NO de la implementación concreta.
 * Esto permite cambiar fácilmente de Supabase a otra BD sin afectar la lógica.
 */

import { VehiculoEntity } from '@/domain/entities'
import { TipoCombustible } from '@/domain/types'

/**
 * Filtros para búsqueda de vehículos
 */
export interface VehiculoFiltros {
  clienteId?: string
  marca?: string
  modelo?: string
  año?: number
  tipoCombustible?: TipoCombustible
  busqueda?: string // Búsqueda por matrícula, marca, modelo, VIN
  incluirEliminados?: boolean
  soloSinCliente?: boolean // Vehículos sin cliente asignado
  soloConDatosCompletos?: boolean // Vehículos con marca, modelo, año y VIN
}

/**
 * Opciones de paginación
 */
export interface PaginacionOpciones {
  page: number
  pageSize: number
}

/**
 * Resultado paginado
 */
export interface ResultadoPaginado<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Interface del repositorio de vehículos
 *
 * IMPORTANTE: Todos los métodos deben incluir el tallerId para multi-tenancy
 */
export interface IVehiculoRepository {
  /**
   * Crea un nuevo vehículo
   */
  crear(vehiculo: VehiculoEntity, tallerId: string): Promise<VehiculoEntity>

  /**
   * Obtiene un vehículo por su ID
   * IMPORTANTE: Incluye filtro de seguridad por tallerId
   */
  obtenerPorId(id: string, tallerId: string): Promise<VehiculoEntity | null>

  /**
   * Obtiene un vehículo por su matrícula
   */
  obtenerPorMatricula(matricula: string, tallerId: string): Promise<VehiculoEntity | null>

  /**
   * Obtiene un vehículo por su VIN
   */
  obtenerPorVIN(vin: string, tallerId: string): Promise<VehiculoEntity | null>

  /**
   * Actualiza un vehículo existente
   */
  actualizar(vehiculo: VehiculoEntity, tallerId: string): Promise<VehiculoEntity>

  /**
   * Elimina un vehículo (soft delete)
   */
  eliminar(id: string, tallerId: string): Promise<void>

  /**
   * Restaura un vehículo eliminado
   */
  restaurar(id: string, tallerId: string): Promise<VehiculoEntity>

  /**
   * Lista vehículos con filtros y paginación
   */
  listar(
    filtros: VehiculoFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<VehiculoEntity>>

  /**
   * Busca vehículos por término de búsqueda (matrícula, marca, modelo, VIN)
   */
  buscar(
    termino: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>>

  /**
   * Verifica si existe un vehículo con una matrícula específica
   */
  existeMatricula(matricula: string, tallerId: string, excludeId?: string): Promise<boolean>

  /**
   * Obtiene vehículos de un cliente específico
   */
  listarPorCliente(
    clienteId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>>

  /**
   * Obtiene vehículos por marca
   */
  listarPorMarca(
    marca: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>>

  /**
   * Obtiene vehículos sin cliente asignado
   */
  listarSinCliente(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>>

  /**
   * Obtiene vehículos activos (no eliminados)
   */
  listarActivos(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>>

  /**
   * Obtiene vehículos eliminados
   */
  listarEliminados(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>>

  /**
   * Cuenta vehículos por marca
   */
  contarPorMarca(tallerId: string): Promise<Record<string, number>>

  /**
   * Cuenta vehículos por tipo de combustible
   */
  contarPorTipoCombustible(tallerId: string): Promise<Record<TipoCombustible, number>>

  /**
   * Cuenta vehículos totales, con cliente y sin cliente
   */
  contarEstadisticas(tallerId: string): Promise<{
    total: number
    conCliente: number
    sinCliente: number
    conDatosCompletos: number
    eliminados: number
  }>
}
