/**
 * @fileoverview Port: Repositorio de Clientes
 * @description Interface que define el contrato del repositorio de clientes
 *
 * PRINCIPIO DE INVERSIÓN DE DEPENDENCIAS:
 * Los casos de uso dependen de esta interface, NO de la implementación concreta.
 * Esto permite cambiar fácilmente de Supabase a otra BD sin afectar la lógica.
 */

import { ClienteEntity } from '@/domain/entities'
import { EstadoCliente, TipoCliente } from '@/domain/types'
import type { PaginacionOpciones, ResultadoPaginado } from './repository.types'

/**
 * Filtros para búsqueda de clientes
 */
export interface ClienteFiltros {
  estado?: EstadoCliente
  tipoCliente?: TipoCliente
  busqueda?: string // Búsqueda por nombre, apellidos o NIF
  ciudad?: string
  provincia?: string
  incluirEliminados?: boolean
}

/**
 * Interface del repositorio de clientes
 *
 * IMPORTANTE: Todos los métodos deben incluir el tallerId para multi-tenancy
 */
export interface IClienteRepository {
  /**
   * Crea un nuevo cliente
   */
  crear(cliente: ClienteEntity, tallerId: string): Promise<ClienteEntity>

  /**
   * Obtiene un cliente por su ID
   * IMPORTANTE: Incluye filtro de seguridad por tallerId
   */
  obtenerPorId(id: string, tallerId: string): Promise<ClienteEntity | null>

  /**
   * Obtiene un cliente por su NIF
   */
  obtenerPorNIF(nif: string, tallerId: string): Promise<ClienteEntity | null>

  /**
   * Actualiza un cliente existente
   */
  actualizar(cliente: ClienteEntity, tallerId: string): Promise<ClienteEntity>

  /**
   * Elimina un cliente (soft delete)
   */
  eliminar(id: string, tallerId: string, userId: string): Promise<void>

  /**
   * Restaura un cliente eliminado
   */
  restaurar(id: string, tallerId: string): Promise<ClienteEntity>

  /**
   * Lista clientes con filtros y paginación
   */
  listar(
    filtros: ClienteFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<ClienteEntity>>

  /**
   * Cuenta clientes por estado
   */
  contarPorEstado(tallerId: string): Promise<Record<EstadoCliente, number>>

  /**
   * Cuenta clientes por tipo
   */
  contarPorTipo(tallerId: string): Promise<Record<TipoCliente, number>>

  /**
   * Busca clientes por término de búsqueda (nombre, apellidos, NIF)
   */
  buscar(
    termino: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<ClienteEntity>>

  /**
   * Verifica si existe un cliente con un NIF específico
   */
  existeNIF(nif: string, tallerId: string, excludeId?: string): Promise<boolean>

  /**
   * Obtiene clientes por ciudad
   */
  listarPorCiudad(
    ciudad: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<ClienteEntity>>

  /**
   * Obtiene clientes por tipo
   */
  listarPorTipo(
    tipo: TipoCliente,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<ClienteEntity>>

  /**
   * Obtiene clientes activos
   */
  listarActivos(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<ClienteEntity>>

  /**
   * Obtiene clientes eliminados
   */
  listarEliminados(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<ClienteEntity>>
}
