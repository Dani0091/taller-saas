/**
 * @fileoverview Repository: Supabase Vehiculo Repository
 * @description Implementación concreta del repositorio de vehículos usando Supabase
 *
 * PRINCIPIOS:
 * - Multi-tenancy: TODAS las consultas filtran por taller_id
 * - Error handling: Usa SupabaseErrorMapper
 * - Mapeo: Usa VehiculoMapper para conversiones
 * - Seguridad: Respeta RLS de Supabase
 * - Soft delete: No elimina físicamente
 */

import { createClient } from '@/lib/supabase/server'
import { VehiculoEntity } from '@/domain/entities'
import { TipoCombustible } from '@/domain/types'
import { NotFoundError, ConflictError } from '@/domain/errors'
import { SupabaseErrorMapper } from '@/infrastructure/errors/SupabaseErrorMapper'
import { VehiculoMapper } from '@/infrastructure/mappers/vehiculo.mapper'
import type {
  IVehiculoRepository,
  VehiculoFiltros,
  PaginacionOpciones,
  ResultadoPaginado
} from '@/application/ports/vehiculo.repository.interface'

export class SupabaseVehiculoRepository implements IVehiculoRepository {
  /**
   * Crea un nuevo vehículo en la base de datos
   */
  async crear(vehiculo: VehiculoEntity, tallerId: string): Promise<VehiculoEntity> {
    try {
      const supabase = await createClient()

      // Convertir entity a formato de BD
      const vehiculoData = VehiculoMapper.toPersistence(vehiculo)

      // Validar seguridad: el vehículo debe pertenecer al taller
      if (vehiculoData.taller_id !== tallerId) {
        throw new Error('Violación de seguridad: taller_id no coincide')
      }

      // Verificar que no exista otro vehículo con la misma matrícula
      const existeMatricula = await this.existeMatricula(
        vehiculo.getMatricula().valor,
        tallerId
      )
      if (existeMatricula) {
        throw new ConflictError(
          `Ya existe un vehículo con matrícula ${vehiculo.getMatricula().valor} en este taller`
        )
      }

      // Insertar vehículo
      const { data: vehiculoInsertado, error: vehiculoError } = await supabase
        .from('vehiculos')
        .insert(vehiculoData)
        .select()
        .single()

      if (vehiculoError) {
        throw SupabaseErrorMapper.toDomainError(vehiculoError)
      }

      // Obtener el vehículo completo
      return await this.obtenerPorId(vehiculoInsertado.id, tallerId) as VehiculoEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene un vehículo por su ID
   * CRÍTICO: Incluye filtro de seguridad por tallerId
   */
  async obtenerPorId(id: string, tallerId: string): Promise<VehiculoEntity | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('vehiculos')
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

      return VehiculoMapper.toDomain(data)

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene un vehículo por su matrícula
   */
  async obtenerPorMatricula(matricula: string, tallerId: string): Promise<VehiculoEntity | null> {
    try {
      const supabase = await createClient()

      // Normalizar matrícula (sin guiones, uppercase)
      const matriculaNormalizada = matricula.toUpperCase().replace(/-/g, '')

      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .ilike('matricula', matriculaNormalizada.replace(/(.{4})/, '$1%')) // Buscar con o sin guión
        .is('deleted_at', null) // No devolver eliminados
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return VehiculoMapper.toDomain(data)

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene un vehículo por su VIN
   */
  async obtenerPorVIN(vin: string, tallerId: string): Promise<VehiculoEntity | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('vin', vin.toUpperCase())
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD
        .is('deleted_at', null) // No devolver eliminados
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return VehiculoMapper.toDomain(data)

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Actualiza un vehículo existente
   */
  async actualizar(vehiculo: VehiculoEntity, tallerId: string): Promise<VehiculoEntity> {
    try {
      const supabase = await createClient()

      // Verificar que el vehículo existe y pertenece al taller
      const vehiculoExistente = await this.obtenerPorId(vehiculo.getId(), tallerId)
      if (!vehiculoExistente) {
        throw new NotFoundError('vehiculo', vehiculo.getId())
      }

      // Verificar que no exista otro vehículo con la misma matrícula (si cambió)
      if (vehiculo.getMatricula().valor !== vehiculoExistente.getMatricula().valor) {
        const existeMatricula = await this.existeMatricula(
          vehiculo.getMatricula().valor,
          tallerId,
          vehiculo.getId()
        )
        if (existeMatricula) {
          throw new ConflictError(
            `Ya existe otro vehículo con matrícula ${vehiculo.getMatricula().valor} en este taller`
          )
        }
      }

      // Convertir entity a formato de BD
      const vehiculoData = VehiculoMapper.toPersistence(vehiculo)

      // Actualizar vehículo
      const { error: vehiculoError } = await supabase
        .from('vehiculos')
        .update(vehiculoData)
        .eq('id', vehiculo.getId())
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      if (vehiculoError) {
        throw SupabaseErrorMapper.toDomainError(vehiculoError)
      }

      // Obtener el vehículo actualizado
      return await this.obtenerPorId(vehiculo.getId(), tallerId) as VehiculoEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Elimina un vehículo (soft delete)
   */
  async eliminar(id: string, tallerId: string): Promise<void> {
    try {
      const supabase = await createClient()

      // Verificar que el vehículo existe y pertenece al taller
      const vehiculo = await this.obtenerPorId(id, tallerId)
      if (!vehiculo) {
        throw new NotFoundError('vehiculo', id)
      }

      // Soft delete
      const { error } = await supabase
        .from('vehiculos')
        .update({
          deleted_at: new Date().toISOString(),
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
   * Restaura un vehículo eliminado
   */
  async restaurar(id: string, tallerId: string): Promise<VehiculoEntity> {
    try {
      const supabase = await createClient()

      // Verificar que el vehículo existe
      const { data, error: fetchError } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('id', id)
        .eq('taller_id', tallerId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new NotFoundError('vehiculo', id)
        }
        throw SupabaseErrorMapper.toDomainError(fetchError)
      }

      // Restaurar
      const { error } = await supabase
        .from('vehiculos')
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('taller_id', tallerId)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Retornar vehículo restaurado
      return await this.obtenerPorId(id, tallerId) as VehiculoEntity

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Lista vehículos con filtros y paginación
   */
  async listar(
    filtros: VehiculoFiltros,
    paginacion: PaginacionOpciones,
    tallerId: string
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    try {
      const supabase = await createClient()

      // Construir query base
      let query = supabase
        .from('vehiculos')
        .select('*', { count: 'exact' })
        .eq('taller_id', tallerId) // 🔒 FILTRO DE SEGURIDAD

      // Filtrar eliminados por defecto
      if (!filtros.incluirEliminados) {
        query = query.is('deleted_at', null)
      }

      // Aplicar filtros
      if (filtros.clienteId) {
        query = query.eq('cliente_id', filtros.clienteId)
      }

      if (filtros.marca) {
        query = query.ilike('marca', `%${filtros.marca}%`)
      }

      if (filtros.modelo) {
        query = query.ilike('modelo', `%${filtros.modelo}%`)
      }

      if (filtros.año) {
        query = query.eq('año', filtros.año)
      }

      if (filtros.tipoCombustible) {
        query = query.eq('tipo_combustible', filtros.tipoCombustible)
      }

      if (filtros.soloSinCliente) {
        query = query.is('cliente_id', null)
      }

      if (filtros.busqueda) {
        query = query.or(
          `matricula.ilike.%${filtros.busqueda}%,marca.ilike.%${filtros.busqueda}%,modelo.ilike.%${filtros.busqueda}%,vin.ilike.%${filtros.busqueda}%`
        )
      }

      // Ordenar por matrícula
      query = query.order('matricula', { ascending: true })

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
      const vehiculos = (data || []).map(record => VehiculoMapper.toDomain(record))

      return {
        data: vehiculos,
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
   * Busca vehículos por término de búsqueda
   */
  async buscar(
    termino: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    return this.listar(
      { busqueda: termino },
      paginacion,
      tallerId
    )
  }

  /**
   * Verifica si existe un vehículo con una matrícula específica
   */
  async existeMatricula(matricula: string, tallerId: string, excludeId?: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      // Normalizar matrícula
      const matriculaNormalizada = matricula.toUpperCase().replace(/-/g, '')

      let query = supabase
        .from('vehiculos')
        .select('id')
        .eq('taller_id', tallerId)
        .ilike('matricula', `%${matriculaNormalizada}%`)
        .is('deleted_at', null)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data, error } = await query

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      return (data || []).length > 0

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Obtiene vehículos de un cliente específico
   */
  async listarPorCliente(
    clienteId: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    return this.listar(
      { clienteId },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene vehículos por marca
   */
  async listarPorMarca(
    marca: string,
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    return this.listar(
      { marca },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene vehículos sin cliente asignado
   */
  async listarSinCliente(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    return this.listar(
      { soloSinCliente: true },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene vehículos activos (no eliminados)
   */
  async listarActivos(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    return this.listar(
      { incluirEliminados: false },
      paginacion,
      tallerId
    )
  }

  /**
   * Obtiene vehículos eliminados
   */
  async listarEliminados(
    tallerId: string,
    paginacion: PaginacionOpciones
  ): Promise<ResultadoPaginado<VehiculoEntity>> {
    try {
      const supabase = await createClient()

      let query = supabase
        .from('vehiculos')
        .select('*', { count: 'exact' })
        .eq('taller_id', tallerId)
        .not('deleted_at', 'is', null) // Solo eliminados

      // Aplicar paginación
      const from = (paginacion.page - 1) * paginacion.pageSize
      const to = from + paginacion.pageSize - 1

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      const vehiculos = (data || []).map(record => VehiculoMapper.toDomain(record))

      return {
        data: vehiculos,
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
   * Cuenta vehículos por marca
   */
  async contarPorMarca(tallerId: string): Promise<Record<string, number>> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('vehiculos')
        .select('marca')
        .eq('taller_id', tallerId)
        .is('deleted_at', null)
        .not('marca', 'is', null)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Contar por marca
      const counts: Record<string, number> = {}

      data?.forEach(record => {
        const marca = record.marca || 'Sin marca'
        counts[marca] = (counts[marca] || 0) + 1
      })

      return counts

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Cuenta vehículos por tipo de combustible
   */
  async contarPorTipoCombustible(tallerId: string): Promise<Record<TipoCombustible, number>> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('vehiculos')
        .select('tipo_combustible')
        .eq('taller_id', tallerId)
        .is('deleted_at', null)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      // Contar por tipo
      const counts: Record<string, number> = {}
      Object.values(TipoCombustible).forEach(tipo => {
        counts[tipo] = 0
      })

      data?.forEach(record => {
        if (record.tipo_combustible) {
          counts[record.tipo_combustible] = (counts[record.tipo_combustible] || 0) + 1
        }
      })

      return counts as Record<TipoCombustible, number>

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }

  /**
   * Cuenta vehículos totales, con cliente y sin cliente
   */
  async contarEstadisticas(tallerId: string): Promise<{
    total: number
    conCliente: number
    sinCliente: number
    conDatosCompletos: number
    eliminados: number
  }> {
    try {
      const supabase = await createClient()

      // Obtener todos los vehículos (incluyendo eliminados)
      const { data, error } = await supabase
        .from('vehiculos')
        .select('cliente_id, marca, modelo, año, vin, deleted_at')
        .eq('taller_id', tallerId)

      if (error) {
        throw SupabaseErrorMapper.toDomainError(error)
      }

      const vehiculos = data || []

      const stats = {
        total: 0,
        conCliente: 0,
        sinCliente: 0,
        conDatosCompletos: 0,
        eliminados: 0
      }

      vehiculos.forEach(v => {
        if (v.deleted_at) {
          stats.eliminados++
        } else {
          stats.total++
          if (v.cliente_id) {
            stats.conCliente++
          } else {
            stats.sinCliente++
          }
          if (v.marca && v.modelo && v.año && v.vin) {
            stats.conDatosCompletos++
          }
        }
      })

      return stats

    } catch (error) {
      throw SupabaseErrorMapper.toDomainError(error)
    }
  }
}
