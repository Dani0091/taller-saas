/**
 * @fileoverview Repository: Supabase Cliente Repository
 * @description Implementación concreta del repositorio de clientes usando Supabase
 *
 * PRINCIPIOS:
 * - Multi-tenancy: TODAS las consultas filtran por taller_id
 * - Error handling: Usa SupabaseErrorMapper
 * - Mapeo: Usa ClienteMapper para conversiones
 * - Seguridad: Respeta RLS de Supabase
 * - Soft delete: No elimina físicamente
 */

import { createClient } from '@/lib/supabase/server'
import { ClienteEntity } from '@/domain/entities'
import { EstadoCliente, TipoCliente } from '@/domain/types'
import { NotFoundError, ConflictError } from '@/domain/errors'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { ClienteMapper } from './cliente.mapper'
import type {
  IClienteRepository,
  ClienteFiltros,
  PaginacionOpciones,
  ResultadoPaginado
} from '@/application/ports'

export class SupabaseClienteRepository implements IClienteRepository {
  /**
   * Crea un nuevo cliente en la base de datos
   */
  async crear(cliente: ClienteEntity, tallerId: string): Promise<ClienteEntity> {
    try {
      const supabase = await createClient()

      // Convertir entity a formato de BD
      const clienteData = ClienteMapper.toPersistence(cliente)

      // Validar seguridad: el cliente debe pertenecer al taller
      if (clienteData.taller_id !== tallerId) {
        throw new Error('Violación de seguridad: taller_id no coincide')
      }

      // Verificar que no exista otro cliente con el mismo NIF
      const existeNIF = await this.existeNIF(cliente.getNIF().valor, tallerId)
      if (existeNIF) {
        throw new ConflictError('Cliente', 'NIF', cliente.getNIF().valor)
      }

      // Insertar cliente
      const { data: clienteInsertado, error: clienteError } = await supabase
        .from('clientes')
        .insert(clienteData)
        .select()
        .single()

      if (clienteError) {
        throw SupabaseErrorMapper.toDomainError(clienteError)
      }

      // Obtener el cliente completo
      return await this.obtenerPorId(clienteInsertado.id, tallerId) as ClienteEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene un cliente por su ID
   * CRÍTICO: Incluye filtro de seguridad por tallerId
   */
  async obtenerPorId(id: string, tallerId: string): Promise<ClienteEntity | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return ClienteMapper.toDomain(data)

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene un cliente por su NIF
   */
  async obtenerPorNIF(nif: string, tallerId: string): Promise<ClienteEntity | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('nif', nif.toUpperCase())
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .is('deleted_at', null) // No devolver eliminados
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return ClienteMapper.toDomain(data)

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Actualiza un cliente existente
   */
  async actualizar(cliente: ClienteEntity, tallerId: string): Promise<ClienteEntity> {
    try {
      const supabase = await createClient()

      // Verificar que el cliente existe y pertenece al taller
      const clienteExistente = await this.obtenerPorId(cliente.getId(), tallerId)
      if (!clienteExistente) {
        throw new NotFoundError('cliente', cliente.getId())
      }

      // Verificar que no exista otro cliente con el mismo NIF (si cambió)
      if (cliente.getNIF().valor !== clienteExistente.getNIF().valor) {
        const existeNIF = await this.existeNIF(
          cliente.getNIF().valor,
          tallerId,
          cliente.getId()
        )
        if (existeNIF) {
          throw new ConflictError('Cliente', 'NIF', cliente.getNIF().valor)
        }
      }

      // Convertir entity a formato de BD
      const clienteData = ClienteMapper.toPersistence(cliente)

      // Actualizar cliente
      const { error: clienteError } = await supabase
        .from('clientes')
        .update(clienteData)
        .eq('id', cliente.getId())
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (clienteError) {
        throw SupabaseErrorMapper.toDomainError(clienteError)
      }

      // Obtener el cliente actualizado
      return await this.obtenerPorId(cliente.getId(), tallerId) as ClienteEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Elimina un cliente (soft delete)
   */
  async eliminar(id: string, tallerId: string, userId: string): Promise<void> {
    try {
      const supabase = await createClient()

      // Verificar que el cliente existe y pertenece al taller
      const cliente = await this.obtenerPorId(id, tallerId)
      if (!cliente) {
        throw new NotFoundError('cliente', id)
      }

      // Soft delete
      const { error } = await supabase
        .from('clientes')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Restaura un cliente eliminado
   */
  async restaurar(id: string, tallerId: string): Promise<ClienteEntity> {
    try {
      const supabase = await createClient()

      // Verificar que el cliente existe
      const { data, error: fetchError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .eq('taller_id', tallerId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new NotFoundError('cliente', id)
        }
        throw SupabaseErrorMapper.toDomainError(fetchError)
      }

      // Restaurar
      const { error } = await supabase
        .from('clientes')
        .update({
          deleted_at: null,
          deleted_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('taller_id', tallerId)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Retornar cliente restaurado
      return await this.obtenerPorId(id, tallerId) as ClienteEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Lista clientes con filtros y paginación
   */
  async listar(
    filtros: ClienteFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<ClienteEntity>> {
    try {
      const supabase = await createClient()

      // Construir query base
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      // Filtrar eliminados por defecto
      if (!filtros.incluirEliminados) {
        query = query.is('deleted_at', null)
      }

      // Aplicar filtros
      if (filtros.estado) {
        query = query.eq('estado', filtros.estado)
      }

      if (filtros.tipoCliente) {
        query = query.eq('tipo_cliente', filtros.tipoCliente)
      }

      if (filtros.ciudad) {
        query = query.ilike('ciudad', `%${filtros.ciudad}%`)
      }

      if (filtros.provincia) {
        query = query.ilike('provincia', `%${filtros.provincia}%`)
      }

      if (filtros.busqueda) {
        query = query.or(
          `nombre.ilike.%${filtros.busqueda}%,apellidos.ilike.%${filtros.busqueda}%,nif.ilike.%${filtros.busqueda}%`
        )
      }

      // Ordenar por nombre
      query = query.order('nombre', { ascending: true })

      // Aplicar paginación
      const from = (paginacion.page - 1) * paginacion.pageSize
      const to = from + paginacion.pageSize - 1

      query = query.range(from, to)

      // Ejecutar query
      const { data, error, count } = await query

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Mapear resultados
      const clientes = (data || []).map(record => ClienteMapper.toDomain(record))

      return {
        data: clientes,
        total: count || 0,
        page: paginacion.page,
        pageSize: paginacion.pageSize,
        totalPages: Math.ceil((count || 0) / paginacion.pageSize)
      }

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Cuenta clientes por estado
   */
  async contarPorEstado(tallerId: string): Promise<Record<EstadoCliente, number>> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('clientes')
        .select('estado')
        .eq('taller_id', tallerId)
        .is('deleted_at', null)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Contar por estado
      const counts: Record<string, number> = {}
      Object.values(EstadoCliente).forEach(estado => {
        counts[estado] = 0
      })

      data?.forEach(record => {
        counts[record.estado] = (counts[record.estado] || 0) + 1
      })

      return counts as Record<EstadoCliente, number>

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Cuenta clientes por tipo
   */
  async contarPorTipo(tallerId: string): Promise<Record<TipoCliente, number>> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('clientes')
        .select('tipo_cliente')
        .eq('taller_id', tallerId)
        .is('deleted_at', null)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Contar por tipo
      const counts: Record<string, number> = {}
      Object.values(TipoCliente).forEach(tipo => {
        counts[tipo] = 0
      })

      data?.forEach(record => {
        counts[record.tipo_cliente] = (counts[record.tipo_cliente] || 0) + 1
      })

      return counts as Record<TipoCliente, number>

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Busca clientes por término
   */
  async buscar(
    termino: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<ClienteEntity>> {
    return this.listar({ busqueda: termino }, paginacion, tallerId)
  }

  /**
   * Verifica si existe un cliente con un NIF específico
   */
  async existeNIF(nif: string, tallerId: string, excludeId?: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      let query = supabase
        .from('clientes')
        .select('id')
        .eq('nif', nif.toUpperCase())
        .eq('taller_id', tallerId)
        .is('deleted_at', null)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') {
          return false
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return !!data

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene clientes por ciudad
   */
  async listarPorCiudad(
    ciudad: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<ClienteEntity>> {
    return this.listar({ ciudad }, paginacion, tallerId)
  }

  /**
   * Obtiene clientes por tipo
   */
  async listarPorTipo(
    tipo: TipoCliente,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<ClienteEntity>> {
    return this.listar({ tipoCliente: tipo }, paginacion, tallerId)
  }

  /**
   * Obtiene clientes activos
   */
  async listarActivos(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<ClienteEntity>> {
    return this.listar({ estado: EstadoCliente.ACTIVO }, paginacion, tallerId)
  }

  /**
   * Obtiene clientes eliminados
   */
  async listarEliminados(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<ClienteEntity>> {
    return this.listar({ incluirEliminados: true }, paginacion, tallerId)
  }
}
